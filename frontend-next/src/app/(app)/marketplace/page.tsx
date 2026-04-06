'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { AlertCircle, Plus, ShoppingCart, Store, X } from 'lucide-react';
import { api, CartItem, Product } from '@/lib/api';
import { getCoreApiBase } from '@/lib/runtime';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { AnuActionLink } from '@/ui-system/anu/surfacePrimitives';
import { BentoGrid, BentoHero, BentoStat, BentoStyles } from '@/ui/patterns/chromatic-bento';

export const dynamic = 'force-dynamic';

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'fallback-water-kit',
    name: 'Neighbour Water-Saving Kit',
    description: 'Starter tools for reducing home water use with shared maintenance guidance.',
    price: 18,
    category: 'home',
    impact: 'environmental',
    imageUrl: '/window.svg',
    inStock: true,
    sellerId: 'fallback-local',
  },
  {
    id: 'fallback-repair-set',
    name: 'Community Repair Set',
    description: 'Shared repair essentials for extending product life and reducing replacement waste.',
    price: 26,
    category: 'repair',
    impact: 'economic',
    imageUrl: '/window.svg',
    inStock: true,
    sellerId: 'fallback-local',
  },
  {
    id: 'fallback-seed-pack',
    name: 'Urban Seed Starter Pack',
    description: 'Small-space seedlings with growing notes from local growers.',
    price: 14,
    category: 'garden',
    impact: 'environmental',
    imageUrl: '/window.svg',
    inStock: true,
    sellerId: 'fallback-local',
  },
  {
    id: 'fallback-learning-map',
    name: 'Local Learning Map Bundle',
    description: 'Printable guides linking education, cost-lowering actions, and nearby commons initiatives.',
    price: 9,
    category: 'education',
    impact: 'educational',
    imageUrl: '/window.svg',
    inStock: true,
    sellerId: 'fallback-local',
  },
];

const marketplaceInputClass =
  'w-full rounded-xl border border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(246,212,203,0.06)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[color:rgba(246,212,203,0.62)]';

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [showCart, setShowCart] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    impact: 'environmental',
    imageUrl: '',
    inStock: true,
  });

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    setUsingFallback(false);

    try {
      const liveProducts = await api.marketplace.getProducts();
      setProducts(liveProducts);

      if (liveProducts.length < 1) {
        setNotice('No live products are published yet. You can still open memberships, transparency, and community routes while listings populate.');
      } else {
        setNotice(null);
      }
    } catch {
      setProducts(FALLBACK_PRODUCTS);
      setUsingFallback(true);
      setError('Live marketplace service is unavailable in this environment.');
      setNotice('Working now: browse starter listings, curate your cart locally, and continue through trust routes while checkout recovers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const filteredProducts = useMemo(
    () => (category === 'all' ? products : products.filter((product) => product.category === category)),
    [category, products],
  );

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(products.map((product) => product.category)))],
    [products],
  );

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart],
  );

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, { productId: product.id, quantity: 1, product }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((current) => {
      if (quantity <= 0) {
        return current.filter((item) => item.productId !== productId);
      }

      return current.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      );
    });
  };

  const handleCheckout = async () => {
    if (cart.length < 1) {
      return;
    }

    if (usingFallback) {
      setNotice('Checkout is unavailable in fallback mode. You can keep browsing and planning while payment routing is restored.');
      return;
    }

    try {
      const session = await api.marketplace.createCheckoutSession(cart);
      if (session.url) {
        window.location.href = session.url;
        return;
      }

      if (session.id) {
        window.location.href = `${getCoreApiBase()}/checkout/${session.id}`;
        return;
      }

      setNotice('Checkout did not return a valid session URL. Please retry in a moment.');
    } catch {
      setError('Checkout could not start right now.');
      setNotice('Working now: products remain visible and cart planning still works while checkout reconnects.');
    }
  };

  const handleCreateProduct = async () => {
    if (!productForm.name.trim() || !productForm.description.trim() || !productForm.category.trim()) {
      setNotice('Please complete product name, description, and category before submitting.');
      return;
    }

    if (productForm.price <= 0) {
      setNotice('Please enter a valid price greater than zero.');
      return;
    }

    setIsCreatingProduct(true);

    try {
      const newProduct = await api.marketplace.createProduct(productForm);
      setProducts((current) => [newProduct, ...current]);
      setProductForm({
        name: '',
        description: '',
        price: 0,
        category: '',
        impact: 'environmental',
        imageUrl: '',
        inStock: true,
      });
      setShowCreateProduct(false);
      setNotice('Product published to the marketplace.');
    } catch {
      const localPreview: Product = {
        id: `local_${Date.now()}`,
        name: productForm.name,
        description: productForm.description,
        price: productForm.price,
        category: productForm.category,
        impact: productForm.impact,
        imageUrl: productForm.imageUrl || '/window.svg',
        inStock: productForm.inStock,
        sellerId: 'local-preview',
      };

      setProducts((current) => [localPreview, ...current]);
      setUsingFallback(true);
      setShowCreateProduct(false);
      setNotice('Live publishing is unavailable. Added your product locally for this session preview.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  if (loading) {
    return <LoadingState fullPage message="Loading marketplace..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <BentoStyles />
        <BentoGrid columns={12} rowHeight={80} gap={12} className="mb-8">
          <BentoHero
            title="Marketplace"
            subtitle="Discover sustainable products and support eco-friendly businesses"
            metric={String(products.length)}
            metricLabel={usingFallback ? 'starter listings' : 'products'}
            colSpan={7}
            rowSpan={2}
          />
          <BentoStat label="Categories" value={Math.max(0, categories.length - 1)} colSpan={5} rowSpan={1} stagger={1} />
          <BentoStat
            label="Cart total"
            value={`$${total.toFixed(2)}`}
            colSpan={5}
            rowSpan={1}
            stagger={2}
          />
        </BentoGrid>

        {error || notice ? (
          <div className="mb-8 rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="min-w-0">
                {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                {notice ? <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <AnuActionLink href="/memberships" tone="secondary">Open memberships</AnuActionLink>
                  <AnuActionLink href="/transparency" tone="ghost">Open transparency</AnuActionLink>
                  <AnuActionLink href="/community" tone="ghost">Open community</AnuActionLink>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((entry) => (
              <button
                key={entry}
                onClick={() => setCategory(entry)}
                className={`btn-pill text-sm ${category === entry ? 'btn-pill-accent' : 'btn-pill-outline'}`}
              >
                {entry.charAt(0).toUpperCase() + entry.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCreateProduct(true)} className="btn-pill btn-pill-sage text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Sell Product
            </button>
            <button onClick={() => setShowCart((open) => !open)} className="btn-pill btn-pill-primary text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Cart ({cart.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="card-civic overflow-hidden p-0"
                >
                  <Image
                    src={product.imageUrl || '/window.svg'}
                    alt={product.name}
                    width={640}
                    height={384}
                    unoptimized
                    className="h-48 w-full object-cover"
                  />
                  <div className="p-5">
                    <h3 className="text-xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                      {product.name}
                    </h3>
                    <p className="mb-4 mt-2 line-clamp-3 text-sm text-[color:rgba(246,212,203,0.82)]">{product.description}</p>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono-data text-2xl font-semibold text-[var(--color-institutional)]">${product.price.toFixed(2)}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          product.inStock
                            ? 'bg-[color:rgba(224,177,21,0.2)] text-[var(--color-foreground)]'
                            : 'bg-[color:rgba(124,65,60,0.22)] text-[color:rgba(246,212,203,0.86)]'
                        }`}
                      >
                        {product.inStock ? 'In stock' : 'Out of stock'}
                      </span>
                    </div>
                    <p className="mb-4 text-xs text-[color:rgba(246,212,203,0.68)]">Impact: {product.impact}</p>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={!product.inStock}
                      className={`w-full rounded-full px-4 py-2 text-sm font-medium transition ${
                        product.inStock
                          ? 'btn-pill btn-pill-sage'
                          : 'cursor-not-allowed bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
                      }`}
                    >
                      {product.inStock ? 'Add to cart' : 'Unavailable'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredProducts.length < 1 ? (
              <EmptyState icon={Store} title="No products found" description="Try changing the category filter or check back later." />
            ) : null}
          </div>

          {showCart ? (
            <motion.div initial={{ x: 300 }} animate={{ x: 0 }} className="card-civic h-fit">
              <h3 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                Your Cart
              </h3>

              {cart.length < 1 ? (
                <p className="mt-4 text-sm text-[color:rgba(246,212,203,0.78)]">Your cart is empty.</p>
              ) : (
                <>
                  <div className="mb-6 mt-4 space-y-4">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center space-x-3">
                        <Image
                          src={item.product.imageUrl || '/window.svg'}
                          alt={item.product.name}
                          width={64}
                          height={64}
                          unoptimized
                          className="h-14 w-14 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="truncate text-sm font-semibold text-[var(--color-foreground)]">{item.product.name}</h4>
                          <p className="text-sm font-mono-data text-[color:rgba(246,212,203,0.74)]">${item.product.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="h-7 w-7 rounded bg-[var(--color-muted)] text-sm"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-sm font-mono-data">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="h-7 w-7 rounded bg-[var(--color-muted)] text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[var(--color-border)] pt-4">
                    <div className="mb-4 flex justify-between">
                      <span className="font-semibold">Total:</span>
                      <span className="font-mono-data text-lg font-semibold">${total.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={handleCheckout}
                      disabled={usingFallback || cart.length < 1}
                      className="btn-pill btn-pill-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {usingFallback ? 'Checkout unavailable in fallback mode' : 'Checkout'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ) : null}
        </div>

        {showCreateProduct ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:rgba(30,2,39,0.6)] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[color:rgba(246,212,203,0.14)] bg-[var(--color-card)] shadow-xl"
            >
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-3xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                    Sell Your Product
                  </h2>
                  <button onClick={() => setShowCreateProduct(false)}>
                    <X className="h-6 w-6 text-[var(--color-muted-foreground)]" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:rgba(246,212,203,0.9)]">Product Name *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                      className={marketplaceInputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:rgba(246,212,203,0.9)]">Description *</label>
                    <textarea
                      rows={4}
                      value={productForm.description}
                      onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                      className={marketplaceInputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[color:rgba(246,212,203,0.9)]">Price *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={productForm.price}
                        onChange={(event) =>
                          setProductForm((current) => ({
                            ...current,
                            price: parseFloat(event.target.value) || 0,
                          }))
                        }
                        className={`${marketplaceInputClass} font-mono-data`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[color:rgba(246,212,203,0.9)]">Category *</label>
                      <input
                        type="text"
                        value={productForm.category}
                        onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
                        className={marketplaceInputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[color:rgba(246,212,203,0.9)]">Impact</label>
                      <select
                        value={productForm.impact}
                        onChange={(event) => setProductForm((current) => ({ ...current, impact: event.target.value }))}
                        className={marketplaceInputClass}
                      >
                        <option value="environmental">Environmental</option>
                        <option value="social">Social</option>
                        <option value="economic">Economic</option>
                        <option value="educational">Educational</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[color:rgba(246,212,203,0.9)]">Stock</label>
                      <select
                        value={String(productForm.inStock)}
                        onChange={(event) => setProductForm((current) => ({ ...current, inStock: event.target.value === 'true' }))}
                        className={marketplaceInputClass}
                      >
                        <option value="true">In stock</option>
                        <option value="false">Out of stock</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[color:rgba(246,212,203,0.9)]">Image URL</label>
                    <input
                      type="url"
                      value={productForm.imageUrl}
                      onChange={(event) => setProductForm((current) => ({ ...current, imageUrl: event.target.value }))}
                      className={marketplaceInputClass}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowCreateProduct(false)} className="btn-pill btn-pill-outline">Cancel</button>
                    <button onClick={handleCreateProduct} disabled={isCreatingProduct} className="btn-pill btn-pill-sage disabled:opacity-50">
                      {isCreatingProduct ? 'Creating...' : 'Create Product'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
