from flask import Blueprint, request, jsonify
from sqlalchemy import or_

from ..extensions import db
from ..models import MarketplaceListing, MarketplaceReview, User
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from .utils import ok, error


marketplace_bp = Blueprint("marketplace", __name__, url_prefix="/marketplace")


# ── Product Listing & Search ─────────────────────────────────

@marketplace_bp.route("/products", methods=["GET"])
def list_products():
    category = request.args.get("category")
    search = request.args.get("search", "").strip()
    impact = request.args.get("impact")
    sort = request.args.get("sort", "newest")  # newest, price_asc, price_desc
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)

    query = MarketplaceListing.query.filter_by(is_active=True)
    if category and category != "all":
        query = query.filter_by(category=category)
    if impact:
        query = query.filter_by(impact=impact)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                MarketplaceListing.name.ilike(like),
                MarketplaceListing.description.ilike(like),
            )
        )

    if sort == "price_asc":
        query = query.order_by(MarketplaceListing.price.asc())
    elif sort == "price_desc":
        query = query.order_by(MarketplaceListing.price.desc())
    else:
        query = query.order_by(MarketplaceListing.created_at.desc())

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    listings = [_listing_with_stats(l) for l in paginated.items]
    return jsonify(listings), 200


@marketplace_bp.route("/products/<int:listing_id>", methods=["GET"])
def get_product(listing_id):
    listing = MarketplaceListing.query.get(listing_id)
    if not listing or not listing.is_active:
        return error("not_found", "Product not found", status=404)
    reviews = MarketplaceReview.query.filter_by(listing_id=listing_id).order_by(MarketplaceReview.created_at.desc()).all()
    return ok({
        "product": _listing_with_stats(listing),
        "reviews": [r.to_dict() for r in reviews],
        "seller": _seller_summary(listing.seller),
    })


# ── Product CRUD ──────────────────────────────────────────────

@marketplace_bp.route("/add-product", methods=["POST"])
@alpha_jwt_required()
def add_product():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return error("validation", "Product name is required", status=400)
    listing = MarketplaceListing(
        seller_id=user.id,
        name=name,
        description=data.get("description"),
        price=float(data.get("price", 0)),
        category=data.get("category"),
        impact=data.get("impact", "environmental"),
        image_url=data.get("imageUrl"),
        in_stock=bool(data.get("inStock", True)),
    )
    db.session.add(listing)
    db.session.commit()
    return jsonify(listing.to_dict()), 201


@marketplace_bp.route("/products/<int:listing_id>", methods=["PATCH"])
@alpha_jwt_required()
def update_product(listing_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    listing = MarketplaceListing.query.get(listing_id)
    if not listing:
        return error("not_found", "Product not found", status=404)
    if listing.seller_id != user.id:
        return error("forbidden", "You can only edit your own products", status=403)
    data = request.get_json() or {}
    field_map = {
        "name": "name", "description": "description", "price": "price",
        "category": "category", "impact": "impact", "imageUrl": "image_url",
        "inStock": "in_stock", "isActive": "is_active",
    }
    for key, col in field_map.items():
        if key in data:
            setattr(listing, col, data[key])
    db.session.commit()
    return ok({"product": listing.to_dict()})


@marketplace_bp.route("/products/<int:listing_id>", methods=["DELETE"])
@alpha_jwt_required()
def delete_product(listing_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    listing = MarketplaceListing.query.get(listing_id)
    if not listing:
        return error("not_found", "Product not found", status=404)
    if listing.seller_id != user.id:
        return error("forbidden", "You can only delete your own products", status=403)
    listing.is_active = False
    db.session.commit()
    return ok({"deleted": True})


# ── My Listings ───────────────────────────────────────────────

@marketplace_bp.route("/my-listings", methods=["GET"])
@alpha_jwt_required()
def my_listings():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    listings = (
        MarketplaceListing.query
        .filter_by(seller_id=user.id)
        .order_by(MarketplaceListing.created_at.desc())
        .all()
    )
    return ok({"listings": [_listing_with_stats(l) for l in listings]})


# ── Seller Profile ────────────────────────────────────────────

@marketplace_bp.route("/sellers/<int:seller_id>", methods=["GET"])
def seller_profile(seller_id):
    seller = User.query.get(seller_id)
    if not seller:
        return error("not_found", "Seller not found", status=404)
    listings = (
        MarketplaceListing.query
        .filter_by(seller_id=seller_id, is_active=True)
        .order_by(MarketplaceListing.created_at.desc())
        .all()
    )
    return ok({
        "seller": _seller_summary(seller),
        "listings": [_listing_with_stats(l) for l in listings],
    })


# ── Reviews ───────────────────────────────────────────────────

@marketplace_bp.route("/products/<int:listing_id>/reviews", methods=["GET"])
def get_reviews(listing_id):
    reviews = (
        MarketplaceReview.query
        .filter_by(listing_id=listing_id)
        .order_by(MarketplaceReview.created_at.desc())
        .all()
    )
    return ok({"reviews": [r.to_dict() for r in reviews]})


@marketplace_bp.route("/products/<int:listing_id>/reviews", methods=["POST"])
@alpha_jwt_required()
def create_review(listing_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    listing = MarketplaceListing.query.get(listing_id)
    if not listing or not listing.is_active:
        return error("not_found", "Product not found", status=404)
    if listing.seller_id == user.id:
        return error("forbidden", "Cannot review your own product", status=403)
    existing = MarketplaceReview.query.filter_by(listing_id=listing_id, user_id=user.id).first()
    if existing:
        return error("duplicate", "You already reviewed this product", status=409)
    data = request.get_json() or {}
    rating = data.get("rating")
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        return error("validation", "Rating must be between 1 and 5", status=400)
    review = MarketplaceReview(
        listing_id=listing_id,
        user_id=user.id,
        rating=rating,
        comment=(data.get("comment") or "").strip()[:1000],
    )
    db.session.add(review)
    db.session.commit()
    return jsonify(review.to_dict()), 201


# ── Categories ────────────────────────────────────────────────

@marketplace_bp.route("/categories", methods=["GET"])
def list_categories():
    rows = (
        db.session.query(MarketplaceListing.category, db.func.count(MarketplaceListing.id))
        .filter_by(is_active=True)
        .group_by(MarketplaceListing.category)
        .all()
    )
    categories = [{"name": cat, "count": count} for cat, count in rows if cat]
    return ok({"categories": categories})


# ── Checkout ──────────────────────────────────────────────────

@marketplace_bp.route("/checkout", methods=["POST"])
@alpha_jwt_required()
def checkout():
    # Placeholder for Stripe checkout integration
    return jsonify({"id": "alpha_checkout", "url": None}), 200


# ── Helpers ───────────────────────────────────────────────────

def _listing_with_stats(listing):
    d = listing.to_dict()
    reviews = MarketplaceReview.query.filter_by(listing_id=listing.id).all()
    if reviews:
        d["avgRating"] = round(sum(r.rating for r in reviews) / len(reviews), 1)
        d["reviewCount"] = len(reviews)
    else:
        d["avgRating"] = None
        d["reviewCount"] = 0
    return d


def _seller_summary(seller):
    if not seller:
        return None
    listing_count = MarketplaceListing.query.filter_by(seller_id=seller.id, is_active=True).count()
    return {
        "id": seller.id,
        "pseudonym": seller.pseudonym,
        "avatarUrl": seller.avatar_url,
        "level": seller.level,
        "listingCount": listing_count,
    }
