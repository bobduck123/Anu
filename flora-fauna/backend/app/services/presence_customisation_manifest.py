from __future__ import annotations

from copy import deepcopy
from typing import Any


MANIFEST_SCHEMA_VERSION = "presence-customisation-manifest-v1"
SNAPSHOT_SCHEMA_VERSION = "presence-customisation-snapshot-v1"
PREVIEW_SEED_SCHEMA_VERSION = "presence-roomgraph-preview-seed-v1"
ROOMGRAPH_SCHEMA_VERSION = "presence-roomgraph-v1"


MOTION_PROFILES: list[dict[str, Any]] = [
    {
        "id": "calm",
        "label": "Calm",
        "description": "Slow, steady movement with gentle spatial changes.",
        "default_transition_ms": {"min": 450, "max": 900},
        "reduced_motion_equivalent": "minimal",
        "compatibility_notes": "Best for contemplative, professional, and accessibility-first rooms.",
    },
    {
        "id": "cinematic",
        "label": "Cinematic",
        "description": "Deliberate camera movement and more expressive transitions.",
        "default_transition_ms": {"min": 650, "max": 1200},
        "reduced_motion_equivalent": "calm",
        "compatibility_notes": "Use where atmosphere and narrative entry matter.",
    },
    {
        "id": "kinetic",
        "label": "Kinetic",
        "description": "High-energy movement suited to signal-led and performance rooms.",
        "default_transition_ms": {"min": 280, "max": 700},
        "reduced_motion_equivalent": "minimal",
        "compatibility_notes": "Avoid for quiet professional rooms unless explicitly selected.",
    },
    {
        "id": "minimal",
        "label": "Minimal",
        "description": "Simple transitions with minimal camera or object movement.",
        "default_transition_ms": {"min": 150, "max": 350},
        "reduced_motion_equivalent": "minimal",
        "compatibility_notes": "Safe fallback for all rooms and reduced-motion contexts.",
    },
    {
        "id": "ritual",
        "label": "Ritual",
        "description": "Measured, ceremonial transitions that support guided practice.",
        "default_transition_ms": {"min": 700, "max": 1400},
        "reduced_motion_equivalent": "calm",
        "compatibility_notes": "Best for practitioner, organisation, and reflective maker rooms.",
    },
    {
        "id": "playful",
        "label": "Playful",
        "description": "Responsive, expressive movement with lighter interaction feedback.",
        "default_transition_ms": {"min": 250, "max": 650},
        "reduced_motion_equivalent": "minimal",
        "compatibility_notes": "Use for approachable public-facing rooms and creative portfolios.",
    },
]


OBJECT_SKIN_PACKS: list[dict[str, Any]] = [
    {
        "id": "gallery_frame_pack",
        "label": "Gallery Frame Pack",
        "description": "Framed works, wall labels, plinths, and quiet gallery display objects.",
        "supported_object_kinds": ["artwork", "statement", "credential", "portal_link", "testimonial"],
        "compatible_room_worlds": ["rooms-gallery-painter"],
        "preview_object": {"kind": "artwork", "label": "Framed canvas", "material": "painted frame"},
    },
    {
        "id": "signal_tile_pack",
        "label": "Signal Tile Pack",
        "description": "Posters, audio tiles, gig notices, signal panels, and media portals.",
        "supported_object_kinds": ["audio", "video", "event_notice", "poster", "portal_link"],
        "compatible_room_worlds": ["rooms-underground-dj"],
        "preview_object": {"kind": "audio", "label": "Signal tile", "material": "backlit panel"},
    },
    {
        "id": "material_studio_pack",
        "label": "Material Studio Pack",
        "description": "Workbenches, sample boards, process objects, tools, and proof cards.",
        "supported_object_kinds": ["material_sample", "service", "process", "project", "testimonial"],
        "compatible_room_worlds": ["rooms-material-carpenter"],
        "preview_object": {"kind": "material_sample", "label": "Timber sample board", "material": "warm timber"},
    },
]


ATMOSPHERE_PACKS: list[dict[str, Any]] = [
    {
        "id": "quiet_gallery",
        "label": "Quiet Gallery",
        "description": "White-space, soft shadows, and museum-paced attention.",
        "palette_tokens": {"surface": "gallery.white", "accent": "ink.black", "muted": "stone.200"},
        "texture_notes": "Fine paper grain, matte walls, low contrast labels.",
        "light_notes": "Diffuse top light with soft object shadows.",
        "mood_notes": "Clear, contemplative, portfolio-first.",
        "compatible_room_worlds": ["rooms-gallery-painter"],
        "reduced_effect_notes": "Remove grain and keep static diffuse lighting.",
    },
    {
        "id": "nocturnal_signal",
        "label": "Nocturnal Signal",
        "description": "Dark room, saturated signal lights, and media-forward contrast.",
        "palette_tokens": {"surface": "night.black", "accent": "signal.cyan", "muted": "violet.700"},
        "texture_notes": "Poster paper, speaker mesh, subtle scanline surfaces.",
        "light_notes": "Directional neon-like highlights, subdued ambient fill.",
        "mood_notes": "Energetic, memorable, performance-led.",
        "compatible_room_worlds": ["rooms-underground-dj"],
        "reduced_effect_notes": "Disable pulsing light and keep static high-contrast panels.",
    },
    {
        "id": "warm_material",
        "label": "Warm Material",
        "description": "Craft bench warmth, tactile surfaces, and grounded proof.",
        "palette_tokens": {"surface": "timber.warm", "accent": "copper.500", "muted": "clay.200"},
        "texture_notes": "Timber, ceramic, canvas, and workshop surfaces.",
        "light_notes": "Warm side light with practical studio highlights.",
        "mood_notes": "Trustworthy, skilled, tangible.",
        "compatible_room_worlds": ["rooms-material-carpenter"],
        "reduced_effect_notes": "Keep static light, remove drifting dust and texture shimmer.",
    },
]


ENGAGEMENT_DYNAMICS: list[dict[str, Any]] = [
    {
        "id": "chamber_walk",
        "label": "Chamber Walk",
        "description": "Directional navigation through connected chambers.",
        "recommended_archetypes": ["artist", "dj", "maker", "practitioner", "consultant", "organisation", "local_business"],
        "compatible_room_worlds": ["rooms-gallery-painter", "rooms-underground-dj", "rooms-material-carpenter"],
        "motion_intensity": "medium",
        "accessibility_notes": "Must support keyboard next/previous controls and a reduced-motion static view.",
        "fallback_behaviour": "Render all chambers as a stacked vertical page.",
    },
    {
        "id": "orbit_constellation",
        "label": "Orbit Constellation",
        "description": "Objects orbit a central identity point and can be opened in focus.",
        "recommended_archetypes": ["dj", "artist", "organisation"],
        "compatible_room_worlds": ["rooms-gallery-painter", "rooms-underground-dj"],
        "motion_intensity": "high",
        "accessibility_notes": "Provide list navigation and disable orbit motion when reduced motion is requested.",
        "fallback_behaviour": "Render orbit objects as grouped cards below the front chamber.",
    },
    {
        "id": "object_tableau",
        "label": "Object Tableau",
        "description": "A stable arrangement of meaningful objects opens into details.",
        "recommended_archetypes": ["maker", "consultant", "local_business", "artist"],
        "compatible_room_worlds": ["rooms-gallery-painter", "rooms-material-carpenter"],
        "motion_intensity": "low",
        "accessibility_notes": "Objects require semantic labels and predictable focus order.",
        "fallback_behaviour": "Render objects as a service/proof grid.",
    },
    {
        "id": "portal_cascade",
        "label": "Portal Cascade",
        "description": "A sequence of linked portals reveals offers, media, and calls to action.",
        "recommended_archetypes": ["practitioner", "organisation", "consultant", "dj"],
        "compatible_room_worlds": ["rooms-gallery-painter", "rooms-underground-dj", "rooms-material-carpenter"],
        "motion_intensity": "medium",
        "accessibility_notes": "Each portal must have text labels and non-motion reveal states.",
        "fallback_behaviour": "Render portals as ordered sections with clear headings.",
    },
]


ROOM_WORLDS: list[dict[str, Any]] = [
    {
        "id": "rooms-gallery-painter",
        "label": "Gallery Painter",
        "description": "A calm gallery room for visual work, statements, proof, and commission pathways.",
        "best_for": ["artists", "painters", "photographers", "designers", "curated portfolios"],
        "compatible_archetypes": ["artist", "maker", "practitioner", "organisation"],
        "default_chambers": ["front-door", "gallery-wall", "statement-desk", "proof-shelf", "portal"],
        "preview_chamber_id": "gallery-wall",
        "supported_object_kinds": ["artwork", "statement", "credential", "testimonial", "portal_link"],
        "supported_skin_packs": ["gallery_frame_pack"],
        "compatible_motion_profiles": ["calm", "cinematic", "minimal", "playful"],
        "default_motion_profile": "calm",
        "default_engagement_dynamic": "chamber_walk",
        "default_skin_pack": "gallery_frame_pack",
        "default_atmosphere_pack": "quiet_gallery",
        "thumbnail": {
            "kind": "placeholder",
            "alt": "Quiet white gallery wall with framed works",
            "dominant_tokens": ["gallery.white", "ink.black"],
        },
        "preview_metadata": {"hero_object_kind": "artwork", "camera": "front-gallery"},
        "schema_version": ROOMGRAPH_SCHEMA_VERSION,
    },
    {
        "id": "rooms-underground-dj",
        "label": "Underground DJ",
        "description": "A nocturnal signal room for sound, events, media, booking, and links.",
        "best_for": ["DJs", "musicians", "performers", "podcasters", "sound-led collectives"],
        "compatible_archetypes": ["dj", "artist", "organisation"],
        "default_chambers": ["front-door", "signal-wall", "media-booth", "noticeboard", "booking-portal"],
        "preview_chamber_id": "signal-wall",
        "supported_object_kinds": ["audio", "video", "event_notice", "poster", "portal_link"],
        "supported_skin_packs": ["signal_tile_pack"],
        "compatible_motion_profiles": ["cinematic", "kinetic", "minimal", "playful"],
        "default_motion_profile": "kinetic",
        "default_engagement_dynamic": "chamber_walk",
        "default_skin_pack": "signal_tile_pack",
        "default_atmosphere_pack": "nocturnal_signal",
        "thumbnail": {
            "kind": "placeholder",
            "alt": "Dark signal wall with music tiles and event notices",
            "dominant_tokens": ["night.black", "signal.cyan"],
        },
        "preview_metadata": {"hero_object_kind": "audio", "camera": "signal-wall"},
        "schema_version": ROOMGRAPH_SCHEMA_VERSION,
    },
    {
        "id": "rooms-material-carpenter",
        "label": "Material Carpenter",
        "description": "A warm material studio for skilled work, process, services, and proof.",
        "best_for": ["makers", "carpenters", "stylists", "local businesses", "consultants with tangible offers"],
        "compatible_archetypes": ["maker", "consultant", "local_business", "organisation"],
        "default_chambers": ["front-door", "workbench", "sample-wall", "service-desk", "proof-shelf", "portal"],
        "preview_chamber_id": "workbench",
        "supported_object_kinds": ["material_sample", "service", "process", "project", "testimonial"],
        "supported_skin_packs": ["material_studio_pack"],
        "compatible_motion_profiles": ["calm", "minimal", "ritual", "playful"],
        "default_motion_profile": "calm",
        "default_engagement_dynamic": "chamber_walk",
        "default_skin_pack": "material_studio_pack",
        "default_atmosphere_pack": "warm_material",
        "thumbnail": {
            "kind": "placeholder",
            "alt": "Warm workshop table with samples and proof cards",
            "dominant_tokens": ["timber.warm", "copper.500"],
        },
        "preview_metadata": {"hero_object_kind": "material_sample", "camera": "workbench"},
        "schema_version": ROOMGRAPH_SCHEMA_VERSION,
    },
]


ARCHETYPES: list[dict[str, Any]] = [
    {
        "id": "artist",
        "label": "Artist",
        "description": "For visual artists and image-led practices that need statement, works, proof, and commissions.",
        "recommended_room_worlds": ["rooms-gallery-painter", "rooms-underground-dj"],
        "default_room_world": "rooms-gallery-painter",
        "compatible_engagement_dynamics": ["chamber_walk", "orbit_constellation", "object_tableau"],
        "compatible_object_skin_packs": ["gallery_frame_pack", "signal_tile_pack"],
        "compatible_atmosphere_packs": ["quiet_gallery", "nocturnal_signal"],
        "minimum_required_intake_fields": ["display_name", "email"],
        "optional_recommended_fields": ["short_bio", "links", "services", "desired_slug"],
    },
    {
        "id": "dj",
        "label": "DJ / Performer",
        "description": "For sound-led performers who need media, appearances, booking, and memorable links.",
        "recommended_room_worlds": ["rooms-underground-dj"],
        "default_room_world": "rooms-underground-dj",
        "compatible_engagement_dynamics": ["chamber_walk", "orbit_constellation", "portal_cascade"],
        "compatible_object_skin_packs": ["signal_tile_pack"],
        "compatible_atmosphere_packs": ["nocturnal_signal"],
        "minimum_required_intake_fields": ["display_name", "email"],
        "optional_recommended_fields": ["links", "notes", "services"],
    },
    {
        "id": "maker",
        "label": "Maker",
        "description": "For makers, craft workers, stylists, and material practices that need process and proof.",
        "recommended_room_worlds": ["rooms-material-carpenter", "rooms-gallery-painter"],
        "default_room_world": "rooms-material-carpenter",
        "compatible_engagement_dynamics": ["chamber_walk", "object_tableau"],
        "compatible_object_skin_packs": ["material_studio_pack", "gallery_frame_pack"],
        "compatible_atmosphere_packs": ["warm_material", "quiet_gallery"],
        "minimum_required_intake_fields": ["display_name", "email"],
        "optional_recommended_fields": ["short_bio", "services", "links"],
    },
    {
        "id": "practitioner",
        "label": "Practitioner",
        "description": "For care, healing, coaching, cultural practice, and guided service work.",
        "recommended_room_worlds": ["rooms-gallery-painter"],
        "default_room_world": "rooms-gallery-painter",
        "compatible_engagement_dynamics": ["chamber_walk", "portal_cascade"],
        "compatible_object_skin_packs": ["gallery_frame_pack"],
        "compatible_atmosphere_packs": ["quiet_gallery"],
        "minimum_required_intake_fields": ["display_name", "email"],
        "optional_recommended_fields": ["short_bio", "services", "notes"],
    },
    {
        "id": "consultant",
        "label": "Consultant",
        "description": "For advisors and solo professionals who need a credible room for offers, proof, and contact.",
        "recommended_room_worlds": ["rooms-material-carpenter"],
        "default_room_world": "rooms-material-carpenter",
        "compatible_engagement_dynamics": ["chamber_walk", "object_tableau", "portal_cascade"],
        "compatible_object_skin_packs": ["material_studio_pack"],
        "compatible_atmosphere_packs": ["warm_material"],
        "minimum_required_intake_fields": ["display_name", "email"],
        "optional_recommended_fields": ["services", "links", "short_bio"],
    },
    {
        "id": "organisation",
        "label": "Organisation",
        "description": "For programs, venues, collectives, and organisations that need public trust and pathways.",
        "recommended_room_worlds": ["rooms-gallery-painter", "rooms-material-carpenter"],
        "default_room_world": "rooms-gallery-painter",
        "compatible_engagement_dynamics": ["chamber_walk", "portal_cascade", "orbit_constellation"],
        "compatible_object_skin_packs": ["gallery_frame_pack", "material_studio_pack"],
        "compatible_atmosphere_packs": ["quiet_gallery", "warm_material"],
        "minimum_required_intake_fields": ["display_name", "email"],
        "optional_recommended_fields": ["short_bio", "services", "links", "notes"],
    },
    {
        "id": "local_business",
        "label": "Local Business",
        "description": "For practical local services that need offers, proof, contact, and a memorable first impression.",
        "recommended_room_worlds": ["rooms-material-carpenter"],
        "default_room_world": "rooms-material-carpenter",
        "compatible_engagement_dynamics": ["chamber_walk", "object_tableau"],
        "compatible_object_skin_packs": ["material_studio_pack"],
        "compatible_atmosphere_packs": ["warm_material"],
        "minimum_required_intake_fields": ["display_name", "email"],
        "optional_recommended_fields": ["services", "links", "desired_slug"],
    },
]


_ARCHETYPE_BY_ID = {item["id"]: item for item in ARCHETYPES}
_ROOM_WORLD_BY_ID = {item["id"]: item for item in ROOM_WORLDS}
_DYNAMIC_BY_ID = {item["id"]: item for item in ENGAGEMENT_DYNAMICS}
_MOTION_BY_ID = {item["id"]: item for item in MOTION_PROFILES}
_SKIN_BY_ID = {item["id"]: item for item in OBJECT_SKIN_PACKS}
_ATMOSPHERE_BY_ID = {item["id"]: item for item in ATMOSPHERE_PACKS}

# Presence Studio's local fallback manifest uses human-facing IDs in its
# backendId fields until the backend manifest adapter can consume the v1
# backend arrays directly. Accept those aliases here so live intake preserves
# the user's choices without rejecting otherwise valid Studio submissions.
_STUDIO_ARCHETYPE_ALIASES = {
    "sound": "dj",
    "venue": "organisation",
}
_STUDIO_MOTION_ALIASES = {
    "still": "calm",
    "tactile": "calm",
    "drifting": "playful",
}
_STUDIO_SKIN_ALIASES = {
    "paper-wall": "gallery_frame_pack",
    "signal-tile": "signal_tile_pack",
    "wood-grain": "material_studio_pack",
    "ceramic": "material_studio_pack",
    "ferrous": "material_studio_pack",
    "textile": "material_studio_pack",
}
_STUDIO_ATMOSPHERE_ALIASES = {
    "north-light": "quiet_gallery",
    "warm-workshop": "warm_material",
    "nocturnal": "nocturnal_signal",
    "cinematic": "nocturnal_signal",
    "editorial": "quiet_gallery",
}


def _resolve_alias(value: str | None, aliases: dict[str, str]) -> str | None:
    if value is None:
        return None
    return aliases.get(value, value)


def customisation_manifest() -> dict[str, Any]:
    return deepcopy(
        {
            "schema_version": MANIFEST_SCHEMA_VERSION,
            "roomgraph_schema_version": ROOMGRAPH_SCHEMA_VERSION,
            "archetypes": ARCHETYPES,
            "room_worlds": ROOM_WORLDS,
            "engagement_dynamics": ENGAGEMENT_DYNAMICS,
            "motion_profiles": MOTION_PROFILES,
            "object_skin_packs": OBJECT_SKIN_PACKS,
            "atmosphere_packs": ATMOSPHERE_PACKS,
        }
    )


def archetypes() -> list[dict[str, Any]]:
    return deepcopy(ARCHETYPES)


def room_worlds() -> list[dict[str, Any]]:
    return deepcopy(ROOM_WORLDS)


def recommendations_for_archetype(archetype_id: str | None) -> dict[str, Any]:
    archetype = _ARCHETYPE_BY_ID.get(archetype_id or "")
    if not archetype:
        return {
            "schema_version": MANIFEST_SCHEMA_VERSION,
            "archetype": None,
            "recommendations": [],
            "correction_hints": [f"Choose one of: {', '.join(sorted(_ARCHETYPE_BY_ID))}."],
        }
    recommendations = []
    for room_world_id in archetype["recommended_room_worlds"]:
        room_world = _ROOM_WORLD_BY_ID[room_world_id]
        recommendations.append(
            {
                "room_world": room_world_id,
                "engagement_dynamic": room_world["default_engagement_dynamic"],
                "motion_profile": room_world["default_motion_profile"],
                "object_skin_pack": room_world["default_skin_pack"],
                "atmosphere_pack": room_world["default_atmosphere_pack"],
                "label": f"{room_world['label']} with {archetype['label']}",
            }
        )
    return {
        "schema_version": MANIFEST_SCHEMA_VERSION,
        "archetype": deepcopy(archetype),
        "recommendations": recommendations,
    }


def _input(payload: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _selection_error(field: str, value: str | None, allowed: list[str], hint: str) -> dict[str, Any]:
    return {
        "field": field,
        "value": value,
        "allowed": allowed,
        "hint": hint,
    }


def _ordered_intersection(primary: list[str], secondary: list[str]) -> list[str]:
    secondary_set = set(secondary)
    return [item for item in primary if item in secondary_set]


def normalize_customisation_selection(payload: dict[str, Any]) -> dict[str, Any]:
    selected = {
        "archetype": _input(payload, "archetype", "presence_type"),
        "room_world": _input(payload, "room_world", "selected_room_world"),
        "engagement_dynamic": _input(payload, "engagement_dynamic"),
        "motion_profile": _input(payload, "motion_profile"),
        "object_skin_pack": _input(payload, "object_skin_pack", "skin_pack"),
        "atmosphere_pack": _input(payload, "atmosphere_pack"),
    }
    selected_raw = deepcopy(selected)
    selected["archetype"] = _resolve_alias(selected["archetype"], _STUDIO_ARCHETYPE_ALIASES)
    selected["motion_profile"] = _resolve_alias(selected["motion_profile"], _STUDIO_MOTION_ALIASES)
    selected["object_skin_pack"] = _resolve_alias(selected["object_skin_pack"], _STUDIO_SKIN_ALIASES)
    selected["atmosphere_pack"] = _resolve_alias(selected["atmosphere_pack"], _STUDIO_ATMOSPHERE_ALIASES)

    defaults_applied: list[dict[str, str]] = []
    errors: list[dict[str, Any]] = []

    archetype_id = selected["archetype"] or "local_business"
    if not selected["archetype"]:
        defaults_applied.append(
            {"field": "archetype", "value": archetype_id, "reason": "No archetype selected; local_business is the safest generic intake default."}
        )
    archetype = _ARCHETYPE_BY_ID.get(archetype_id)
    if not archetype:
        errors.append(_selection_error("archetype", archetype_id, sorted(_ARCHETYPE_BY_ID), "Select a supported archetype."))
        archetype = _ARCHETYPE_BY_ID["local_business"]
        archetype_id = "local_business"

    room_world_id = selected["room_world"] or archetype["default_room_world"]
    if not selected["room_world"]:
        defaults_applied.append(
            {"field": "room_world", "value": room_world_id, "reason": f"Default room world for {archetype['label']}."}
        )
    room_world = _ROOM_WORLD_BY_ID.get(room_world_id)
    if not room_world:
        errors.append(_selection_error("room_world", room_world_id, sorted(_ROOM_WORLD_BY_ID), "Choose one of the manifest room worlds."))
        room_world = _ROOM_WORLD_BY_ID[archetype["default_room_world"]]
        room_world_id = room_world["id"]
    elif archetype_id not in room_world["compatible_archetypes"]:
        errors.append(
            _selection_error(
                "room_world",
                room_world_id,
                archetype["recommended_room_worlds"],
                f"{room_world['label']} is not compatible with {archetype['label']}.",
            )
        )

    dynamic_id = selected["engagement_dynamic"] or room_world["default_engagement_dynamic"]
    if not selected["engagement_dynamic"]:
        defaults_applied.append({"field": "engagement_dynamic", "value": dynamic_id, "reason": f"Default interaction for {room_world['label']}."})
    dynamic = _DYNAMIC_BY_ID.get(dynamic_id)
    if not dynamic:
        errors.append(_selection_error("engagement_dynamic", dynamic_id, sorted(_DYNAMIC_BY_ID), "Choose a supported engagement dynamic."))
    elif dynamic_id not in archetype["compatible_engagement_dynamics"]:
        allowed = _ordered_intersection(
            archetype["compatible_engagement_dynamics"],
            [item["id"] for item in ENGAGEMENT_DYNAMICS if room_world_id in item["compatible_room_worlds"]],
        )
        errors.append(
            _selection_error(
                "engagement_dynamic",
                dynamic_id,
                allowed,
                f"{dynamic['label']} is not recommended for {archetype['label']}.",
            )
        )
    elif room_world_id not in dynamic["compatible_room_worlds"]:
        errors.append(
            _selection_error(
                "engagement_dynamic",
                dynamic_id,
                [
                    item["id"]
                    for item in ENGAGEMENT_DYNAMICS
                    if room_world_id in item["compatible_room_worlds"]
                ],
                f"{dynamic['label']} does not support {room_world['label']}.",
            )
        )

    motion_id = selected["motion_profile"] or room_world["default_motion_profile"]
    if not selected["motion_profile"]:
        defaults_applied.append({"field": "motion_profile", "value": motion_id, "reason": f"Default motion for {room_world['label']}."})
    if motion_id not in _MOTION_BY_ID:
        errors.append(_selection_error("motion_profile", motion_id, sorted(_MOTION_BY_ID), "Choose a supported motion profile."))
    elif motion_id not in room_world["compatible_motion_profiles"]:
        errors.append(
            _selection_error(
                "motion_profile",
                motion_id,
                room_world["compatible_motion_profiles"],
                f"{motion_id} is not recommended for {room_world['label']}.",
            )
        )

    skin_id = selected["object_skin_pack"] or room_world["default_skin_pack"]
    if not selected["object_skin_pack"]:
        defaults_applied.append({"field": "object_skin_pack", "value": skin_id, "reason": f"Default object skin pack for {room_world['label']}."})
    skin = _SKIN_BY_ID.get(skin_id)
    if not skin:
        errors.append(_selection_error("object_skin_pack", skin_id, sorted(_SKIN_BY_ID), "Choose a supported object skin pack."))
    elif skin_id not in archetype["compatible_object_skin_packs"]:
        allowed = _ordered_intersection(archetype["compatible_object_skin_packs"], room_world["supported_skin_packs"])
        errors.append(
            _selection_error(
                "object_skin_pack",
                skin_id,
                allowed,
                f"{skin['label']} is not recommended for {archetype['label']}.",
            )
        )
    elif room_world_id not in skin["compatible_room_worlds"]:
        errors.append(
            _selection_error(
                "object_skin_pack",
                skin_id,
                room_world["supported_skin_packs"],
                f"{skin['label']} cannot be used in {room_world['label']}.",
            )
        )

    atmosphere_id = selected["atmosphere_pack"] or room_world["default_atmosphere_pack"]
    if not selected["atmosphere_pack"]:
        defaults_applied.append({"field": "atmosphere_pack", "value": atmosphere_id, "reason": f"Default atmosphere for {room_world['label']}."})
    atmosphere = _ATMOSPHERE_BY_ID.get(atmosphere_id)
    if not atmosphere:
        errors.append(_selection_error("atmosphere_pack", atmosphere_id, sorted(_ATMOSPHERE_BY_ID), "Choose a supported atmosphere pack."))
    elif atmosphere_id not in archetype["compatible_atmosphere_packs"]:
        allowed = _ordered_intersection(
            archetype["compatible_atmosphere_packs"],
            [item["id"] for item in ATMOSPHERE_PACKS if room_world_id in item["compatible_room_worlds"]],
        )
        errors.append(
            _selection_error(
                "atmosphere_pack",
                atmosphere_id,
                allowed,
                f"{atmosphere['label']} is not recommended for {archetype['label']}.",
            )
        )
    elif room_world_id not in atmosphere["compatible_room_worlds"]:
        errors.append(
            _selection_error(
                "atmosphere_pack",
                atmosphere_id,
                [room_world["default_atmosphere_pack"]],
                f"{atmosphere['label']} cannot be used in {room_world['label']}.",
            )
        )

    resolved = {
        "archetype": archetype_id,
        "room_world": room_world_id,
        "engagement_dynamic": dynamic_id,
        "motion_profile": motion_id,
        "object_skin_pack": skin_id,
        "atmosphere_pack": atmosphere_id,
    }
    snapshot = {
        "schema_version": SNAPSHOT_SCHEMA_VERSION,
        "manifest_version": MANIFEST_SCHEMA_VERSION,
        "selected": selected,
        "selected_raw": selected_raw,
        "resolved": resolved,
        "defaults_applied": defaults_applied,
        "roomgraph_schema_version": ROOMGRAPH_SCHEMA_VERSION,
    }
    return {"valid": not errors, "errors": errors, "snapshot": snapshot, "resolved": resolved}


def preview_seed_from_selection(selection: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_customisation_selection(selection)
    if not normalized["valid"]:
        return {
            "schema_version": PREVIEW_SEED_SCHEMA_VERSION,
            "status": "needs_review",
            "needs_review": True,
            "errors": normalized["errors"],
            "customisation_snapshot": normalized["snapshot"],
        }

    resolved = normalized["resolved"]
    room_world = _ROOM_WORLD_BY_ID[resolved["room_world"]]
    dynamic = _DYNAMIC_BY_ID[resolved["engagement_dynamic"]]
    skin = _SKIN_BY_ID[resolved["object_skin_pack"]]
    atmosphere = _ATMOSPHERE_BY_ID[resolved["atmosphere_pack"]]
    motion = _MOTION_BY_ID[resolved["motion_profile"]]
    return {
        "schema_version": PREVIEW_SEED_SCHEMA_VERSION,
        "status": "preview_ready",
        "needs_review": False,
        "selected_room_world": room_world["id"],
        "engagement_dynamic": dynamic["id"],
        "object_skin_pack": skin["id"],
        "atmosphere_pack": atmosphere["id"],
        "motion_profile": motion["id"],
        "presence_dna": {
            "source": "backend_persisted",
            "archetype": resolved["archetype"],
            "room_world": room_world["id"],
            "engagement_dynamic": dynamic["id"],
            "motion_profile": motion["id"],
            "object_skin_pack": skin["id"],
            "atmosphere_pack": atmosphere["id"],
        },
        "room_graph": {
            "schemaVersion": ROOMGRAPH_SCHEMA_VERSION,
            "roomWorld": room_world["id"],
            "engagementDynamic": dynamic["id"],
            "motionProfile": motion["id"],
            "objectSkinPack": skin["id"],
            "atmospherePack": atmosphere["id"],
            "previewChamberId": room_world["preview_chamber_id"],
            "chambers": [{"id": chamber_id, "kind": "chamber"} for chamber_id in room_world["default_chambers"]],
            "supportedObjectKinds": room_world["supported_object_kinds"],
            "fallbackBehaviour": dynamic["fallback_behaviour"],
        },
        "customisation_snapshot": normalized["snapshot"],
    }


def preview_seed_from_setup_request(application: Any) -> dict[str, Any]:
    snapshot = getattr(application, "customisation_snapshot", None)
    if isinstance(snapshot, dict) and isinstance(snapshot.get("resolved"), dict):
        selection = snapshot["resolved"]
    else:
        selection = {
            "archetype": getattr(application, "archetype", None) or getattr(application, "presence_type", None),
            "room_world": getattr(application, "room_world", None) or getattr(application, "selected_room_world", None),
            "engagement_dynamic": getattr(application, "engagement_dynamic", None),
            "motion_profile": getattr(application, "motion_profile", None),
            "object_skin_pack": getattr(application, "object_skin_pack", None),
            "atmosphere_pack": getattr(application, "atmosphere_pack", None),
        }
    return preview_seed_from_selection(selection)
