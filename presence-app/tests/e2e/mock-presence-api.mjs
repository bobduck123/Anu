import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "presenceGraph.json"), "utf8"));
const port = Number(process.env.PORT || 5105);
const templateKitDraftContractVersion = "presence-editable-config-compat-v1";
const primaryTemplateKits = {
  "gallery-artist": "Gallery Artist",
  "cultural-community-artist": "Cultural-Community Artist / Practice Archive",
  "material-tradie-proof-card": "Material / Tradie Proof Card",
  "healing-practitioner": "Healing Practitioner",
  "consultant-contractor": "Consultant / Contractor",
};
const candidateTemplateKits = new Set(["underground-dj-portal"]);

let state;

function resetState() {
  state = {
    requests: [],
    observer: null,
    saved: false,
    followed: false,
    passportMode: "empty",
    boards: [],
    passes: [],
    keys: [],
    nextBoardId: 802,
    nextItemId: 902,
    nextPassId: 302,
    nextKeyId: 202,
    editorDraft: null,
    editorPublished: buildEditorConfig("published", 1),
    nextEditorVersion: 2,
    editorAssets: buildEditorAssets(),
    studioRoomDrafts: {},
    nextStudioRoomId: 901,
    nextStudioRoomDraftVersion: 1,
    failNextOwnerNodeReads: 0,
    failNextEditorReads: 0,
    failNextPreviewReads: 0,
    privateDraftMedia: false,
    // Hall activity event counters used by the analytics endpoint to mirror
    // the real backend's hall_activity_event aggregation.
    hallStallVisits: 0,
    hallPortalClicks: 0,
  };
}

resetState();

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  if (req.method === "OPTIONS") return send(res, 204, null);

  if (url.pathname === "/__test__/reset" && req.method === "POST") {
    resetState();
    return send(res, 200, { ok: true });
  }

  if (url.pathname === "/__test__/state" && req.method === "POST") {
    const body = await readJson(req);
    if (body.observer === true) state.observer = fixtures.observer;
    if (body.observer === false) state.observer = null;
    if (body.passportMode) state.passportMode = body.passportMode;
    if (Array.isArray(body.boards)) state.boards = body.boards;
    if (Array.isArray(body.passes)) state.passes = body.passes;
    if (Array.isArray(body.keys)) state.keys = body.keys;
    if (body.clearEditorPublished === true) state.editorPublished = null;
    if (Number.isInteger(body.failNextOwnerNodeReads)) state.failNextOwnerNodeReads = body.failNextOwnerNodeReads;
    if (Number.isInteger(body.failNextEditorReads)) state.failNextEditorReads = body.failNextEditorReads;
    if (Number.isInteger(body.failNextPreviewReads)) state.failNextPreviewReads = body.failNextPreviewReads;
    if (typeof body.privateDraftMedia === "boolean") state.privateDraftMedia = body.privateDraftMedia;
    if (body.stripEditorImages === true && state.editorPublished) {
      state.editorPublished = {
        ...state.editorPublished,
        asset_config: {},
        content_config: { ...state.editorPublished.content_config, works: [] },
      };
      state.editorAssets = [];
    }
    return send(res, 200, { ok: true, state: publicState() });
  }

  if (url.pathname === "/__test__/requests") {
    return send(res, 200, { requests: state.requests });
  }

  const body = await readJson(req);
  record(req, url, body);

  if (url.pathname === "/healthz" || url.pathname === "/health") {
    return send(res, 200, { ok: true, ready: true });
  }

  if (url.pathname === "/api/presence/keys/test-room-key-token/resolve" && req.method === "GET") {
    return sendData(res, {
      message: "Youve entered this Room.",
      room: publicRoomFixture(),
      editable_config: redactEditorConfig(state.editorPublished),
      public_url: fixtures.room.public_url,
      room_key: fixtures.roomKey,
      encounter: null,
      available_actions: ["enter_room", "save", "follow", "mood_board", "path"],
      observer_upgrade: "Create an Observer Mask to remember this Room.",
      status: "active",
    });
  }

  if (url.pathname === "/api/presence/rooms/101/key-entry" && req.method === "GET") {
    const { editable_config: _editableConfig, ...publicCard } = publicRoomFixture();
    return sendData(res, {
      room: publicCard,
      public_url: fixtures.room.public_url,
      status: "active",
    });
  }

  if (url.pathname === "/api/presence/keys/revoked-room-key-token/resolve") {
    return sendError(res, 410, "room_key_inactive", "This Room Key is no longer active.");
  }

  if (url.pathname === "/api/presence/rooms/101/encounters" && req.method === "POST") {
    return sendData(res, {
      encounter: {
        ...fixtures.encounter,
        source: body.source || fixtures.encounter.source,
        anonymous_visitor_id: body.anonymous_visitor_id,
      },
      room_id: 101,
      available_actions: ["save", "follow", "mood_board", "path"],
    }, 201);
  }

  if (url.pathname === "/api/presence/public/test-presence-room" && req.method === "GET") {
    return sendData(res, publicRoomFixture());
  }

  if (url.pathname === "/api/presence/public/rooms-gallery-painter" && req.method === "GET") {
    return sendData(res, { ...fixtures.room, slug: "rooms-gallery-painter", display_name: "Gallery Painter Fixture" });
  }

  if (url.pathname === "/api/presence/public/nodes" && req.method === "GET") {
    return sendData(res, {
      items: [
        {
          id: fixtures.room.id,
          slug: fixtures.room.slug,
          display_name: fixtures.room.display_name,
          headline: fixtures.room.headline,
          bio_excerpt: fixtures.room.short_bio,
          node_type: fixtures.room.node_type,
          display_mode: fixtures.room.display_mode,
          plan_type: fixtures.room.plan_type,
          room_type: fixtures.room.room_type,
          theme_preset: fixtures.room.theme_preset,
          profile_image_url: null,
          cover_image_url: null,
          hero_image_url: null,
          location_label: fixtures.room.location_label,
          visual_mood: "quiet",
          public_url: fixtures.room.public_url,
          published_at: "2026-05-20T10:00:00.000Z",
        },
      ],
      total: 1,
      limit: Number(url.searchParams.get("limit") || 24),
      offset: Number(url.searchParams.get("offset") || 0),
    });
  }

  if (url.pathname.endsWith("/view") && req.method === "POST") {
    return sendData(res, {});
  }

  if (url.pathname === "/api/observer/profile") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (req.method === "GET") {
      if (!state.observer) return sendError(res, 404, "observer_missing", "Observer profile not found.");
      return sendData(res, state.observer);
    }
    if (req.method === "POST") {
      if (String(body.bio_fragment || "").includes("https://")) {
        return sendError(res, 422, "self_promotion_locked", "Observer mode is for moving through Rooms.");
      }
      state.observer = {
        ...fixtures.observer,
        alias: body.alias || fixtures.observer.alias,
        bio_fragment: body.bio_fragment || fixtures.observer.bio_fragment,
      };
      return sendData(res, state.observer, 201);
    }
    if (req.method === "PATCH") {
      state.observer = { ...(state.observer || fixtures.observer), ...body };
      return sendData(res, state.observer);
    }
  }

  if (url.pathname === "/api/observer/rooms/101/save" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    state.saved = true;
    state.passportMode = "saved";
    return sendData(res, { connection: { ...fixtures.connection, status: "saved" } });
  }

  if (url.pathname === "/api/observer/rooms/101/follow" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    state.followed = true;
    return sendData(res, { connection: { ...fixtures.connection, status: "followed" } });
  }

  if (url.pathname === "/api/observer/passport" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, { items: state.passportMode === "saved" ? fixtures.passportSaved : fixtures.passportEmpty });
  }

  if (url.pathname === "/api/observer/mood-boards" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, { items: state.boards });
  }

  if (url.pathname === "/api/observer/mood-boards" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    const board = { ...fixtures.moodBoard, id: state.nextBoardId++, title: body.title, board_type: body.board_type || "general", items: [] };
    state.boards.unshift(board);
    return sendData(res, board, 201);
  }

  const boardMatch = url.pathname.match(/^\/api\/observer\/mood-boards\/(\d+)$/);
  if (boardMatch && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    const board = state.boards.find((item) => item.id === Number(boardMatch[1])) || fixtures.moodBoardWithRoom;
    return sendData(res, board);
  }

  const boardItemMatch = url.pathname.match(/^\/api\/observer\/mood-boards\/(\d+)\/items$/);
  if (boardItemMatch && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    const boardId = Number(boardItemMatch[1]);
    const item = {
      id: state.nextItemId++,
      mood_board_id: boardId,
      item_type: body.item_type || "room",
      item_id: body.item_id,
      title: body.title || fixtures.room.display_name,
      description: body.description || "Saved from public Room",
      tags: body.tags || [],
      source_context: body.source_context || "Saved from public Room",
      created_at: new Date().toISOString(),
    };
    const board = state.boards.find((entry) => entry.id === boardId);
    if (board) board.items = [item, ...(board.items || [])];
    return sendData(res, item, 201);
  }

  if (url.pathname === "/api/observer/field-notes" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, {
      id: 1301,
      author_observer_id: fixtures.observer.id,
      room_id: body.room_id,
      body: body.body,
      visibility: body.visibility || "public",
      status: "active",
      moderation_state: "clean",
      created_at: new Date().toISOString(),
    }, 201);
  }

  if (url.pathname === "/api/observer/signals" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, {
      id: 1401,
      observer_id: fixtures.observer.id,
      target_type: body.target_type,
      target_id: body.target_id,
      signal_type: body.signal_type,
      created_at: new Date().toISOString(),
    }, 201);
  }

  if (url.pathname === "/api/paths/1001" || url.pathname === "/api/paths/from-room/101" || url.pathname === "/api/paths/from-mood-board/801") {
    return sendData(res, url.pathname.includes("from-mood-board") ? { ...fixtures.path, trailhead_type: "mood_board", trailhead_id: 801 } : fixtures.path);
  }

  if (url.pathname === "/api/paths/generate/from-room/101" || url.pathname === "/api/paths/generate/from-mood-board/801") {
    return sendData(res, fixtures.path, 201);
  }

  if (url.pathname === "/api/observer/paths/1001/walks" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, { id: 1501, observer_id: fixtures.observer.id, path_id: 1001, saved: false, started_at: new Date().toISOString() }, 201);
  }

  if (url.pathname === "/api/observer/paths/1001/traces" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, { id: 1502, observer_id: fixtures.observer.id, path_id: 1001, waypoint_id: body.waypoint_id, trace_type: body.trace_type, created_at: new Date().toISOString() }, 201);
  }

  if (url.pathname === "/api/observer/paths/1001/choose" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, { id: 1503, observer_id: fixtures.observer.id, path_id: 1001, trace_type: "fork_chosen", metadata: { choice_id: body.choice_id }, created_at: new Date().toISOString() }, 201);
  }

  if (url.pathname === "/api/presence/owner/studio-rooms/from-template-kit" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    const kitId = String(body.kit_id || body.kitId || body.template_kit_id || body.templateKitId || "").trim();
    if (candidateTemplateKits.has(kitId)) {
      return sendError(res, 403, "template_kit_not_owner_creatable", "This TemplateKit is not available for owner draft creation.");
    }
    const kitName = primaryTemplateKits[kitId];
    if (!kitName) return sendError(res, 404, "template_kit_not_found", "TemplateKit was not found.");
    const draftPayload = body.draft_payload || body.draftPayload || body.saveable_payload || body.saveablePayload;
    if (!draftPayload || typeof draftPayload !== "object") {
      return sendError(res, 422, "validation_error", "draft_payload is required.");
    }
    if (containsRestrictedKey(draftPayload)) {
      return sendError(res, 422, "validation_error", "TemplateKit draft payload contains a restricted field.");
    }
    if (!validateSafeUrls(draftPayload)) {
      return sendError(res, 422, "validation_error", "Editable links must be public http(s), public relative paths, or safe chamber fragments.");
    }
    const room = draftPayload.room;
    if (!room || typeof room !== "object" || room.state !== "draft" || room.templateKitId !== kitId) {
      return sendError(res, 422, "validation_error", "TemplateKit-created Studio Rooms must be draft state.");
    }

    const roomId = state.nextStudioRoomId++;
    const slug = `studio-${kitId}-draft-${roomId}`;
    const storedDraft = toStoredStudioRoomDraft(kitId, kitName, draftPayload);
    const summary = summarizeStudioRoom(storedDraft.room);
    const draftConfig = buildStudioRoomDraftEditorConfig(roomId, kitId, kitName, storedDraft, summary);
    const node = buildStudioRoomDraftNode(roomId, slug, kitId, kitName, storedDraft);
    state.studioRoomDrafts[String(roomId)] = {
      node,
      draft: draftConfig,
      studioRoomDraft: storedDraft,
      published: null,
      summary,
    };

    return sendData(res, {
      node_id: roomId,
      room_id: roomId,
      slug,
      template_kit_id: kitId,
      template_kit_name: kitName,
      support_state: "primary",
      status: "draft",
      visibility: "private",
      public_status: "draft",
      published: null,
      published_at: null,
      base_published_version: 0,
      draft: {
        id: draftConfig.id,
        version: draftConfig.version,
        status: draftConfig.status,
        schema_version: draftConfig.schema_version,
      },
      contract: templateKitDraftContractVersion,
      schema_version: storedDraft.schema_version,
      chamber_count: summary.chamber_count,
      object_count: summary.object_count,
      mobile_variant_count: summary.mobile_variant_count,
      editor_path: `/studio/${roomId}/studio-room`,
    }, 201);
  }

  const studioRoomDraftSaveMatch = url.pathname.match(/^\/api\/presence\/owner\/studio-rooms\/(\d+)\/draft$/);
  if (studioRoomDraftSaveMatch && req.method === "PATCH") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    const roomId = studioRoomDraftSaveMatch[1];
    const entry = state.studioRoomDrafts[roomId];
    if (!entry) return sendError(res, 404, "studio_room_draft_not_found", "Studio Room draft config was not found.");
    const incoming = body.studio_room_draft || body.studioRoomDraft;
    if (!incoming || typeof incoming !== "object") {
      return sendError(res, 422, "validation_error", "studio_room_draft is required.");
    }
    if (containsRestrictedKey(incoming)) {
      return sendError(res, 422, "validation_error", "TemplateKit draft payload contains a restricted field.");
    }
    if (!validateSafeUrls(incoming)) {
      return sendError(res, 422, "validation_error", "Editable links must be public http(s), public relative paths, or safe chamber fragments.");
    }
    if (
      incoming.contract !== templateKitDraftContractVersion ||
      incoming.support_state !== "primary" ||
      incoming.published_state !== null ||
      incoming.room?.state !== "draft"
    ) {
      return sendError(res, 422, "validation_error", "Studio Room draft updates must remain private draft payloads.");
    }

    const summary = summarizeStudioRoom(incoming.room);
    const version = state.nextStudioRoomDraftVersion++;
    const saved = {
      ...entry.draft,
      version,
      updated_at: new Date().toISOString(),
      scene_config: {
        ...(entry.draft.scene_config || {}),
        summary,
      },
      content_config: {
        ...(entry.draft.content_config || {}),
        studio_room_draft: incoming,
      },
    };
    entry.draft = saved;
    entry.studioRoomDraft = incoming;
    entry.summary = summary;

    return sendData(res, {
      room_id: Number(roomId),
      slug: entry.node.slug,
      template_kit_id: incoming.template_kit_id,
      status: "draft",
      visibility: "private",
      public_status: "draft",
      published: null,
      published_config_present: false,
      published_at: null,
      base_published_version: incoming.base_published_version || 0,
      contract: templateKitDraftContractVersion,
      draft: {
        id: saved.id,
        version: saved.version,
        status: saved.status,
        updated_at: saved.updated_at,
      },
      studio_room_draft: incoming,
      chamber_count: summary.chamber_count,
      object_count: summary.object_count,
      mobile_variant_count: summary.mobile_variant_count,
    });
  }

  const studioRoomOwnerNodeMatch = url.pathname.match(/^\/api\/presence\/owner\/nodes\/(\d+)$/);
  if (studioRoomOwnerNodeMatch && req.method === "GET" && state.studioRoomDrafts[studioRoomOwnerNodeMatch[1]]) {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    return sendData(res, state.studioRoomDrafts[studioRoomOwnerNodeMatch[1]].node);
  }

  const studioRoomEditorMatch = url.pathname.match(/^\/api\/presence\/owner\/rooms\/(\d+)\/editor$/);
  if (studioRoomEditorMatch && req.method === "GET" && state.studioRoomDrafts[studioRoomEditorMatch[1]]) {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    const entry = state.studioRoomDrafts[studioRoomEditorMatch[1]];
    return sendData(res, {
      room: {
        id: entry.node.id,
        slug: entry.node.slug,
        display_name: entry.node.display_name,
        owner_user_id: entry.node.owner_user_id,
      },
      draft: entry.draft,
      published: null,
      published_public_config: null,
      suggested_config: null,
      history: [entry.draft],
      assets: [],
      media_capability: {
        private_draft_media_active: false,
        v1b_fallback_available: true,
        migration_ready: true,
        protected_storage_configured: false,
        protected_storage_verified: false,
        reason: "private_storage_not_configured",
        owner_message: "Private draft media is not enabled on this environment. Use only public-safe images.",
      },
    });
  }

  if (url.pathname === "/api/presence/owner/nodes/101" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    if (state.failNextOwnerNodeReads > 0) {
      state.failNextOwnerNodeReads -= 1;
      return sendError(res, 503, "cold_start", "Room read is warming up.");
    }
    return sendData(res, publicRoomFixture());
  }

  if (url.pathname === "/api/presence/owner/rooms/101/editor" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    if (state.failNextEditorReads > 0) {
      state.failNextEditorReads -= 1;
      return sendError(res, 503, "cold_start", "Editor read is warming up.");
    }
    return sendData(res, {
      room: { id: fixtures.room.id, slug: fixtures.room.slug, display_name: fixtures.room.display_name, owner_user_id: fixtures.room.owner_user_id },
      draft: state.editorDraft,
      published: state.editorPublished,
      published_public_config: redactEditorConfig(state.editorPublished),
        suggested_config: state.editorDraft || state.editorPublished ? null : buildEditorConfig("draft", 1),
        history: [state.editorDraft, state.editorPublished].filter(Boolean),
        assets: state.editorAssets,
        media_capability: {
          private_draft_media_active: state.privateDraftMedia,
          v1b_fallback_available: true,
          migration_ready: true,
          protected_storage_configured: state.privateDraftMedia,
          protected_storage_verified: state.privateDraftMedia,
          reason: state.privateDraftMedia ? null : "private_storage_not_configured",
          owner_message: state.privateDraftMedia
            ? "Uploaded images stay private in your Draft room until you open the room."
            : "Private draft media is not enabled on this environment. Use only public-safe images.",
        },
      });
  }

  if (url.pathname === "/api/presence/owner/rooms/101/editor/draft") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    if (req.method === "GET") return sendData(res, { draft: state.editorDraft });
    if (req.method === "POST" || req.method === "PATCH") {
      const base = state.editorDraft || state.editorPublished || buildEditorConfig("draft", state.nextEditorVersion++);
      state.editorDraft = {
        ...base,
        ...body,
        id: base.id || 9500 + state.nextEditorVersion,
        version: base.version || state.nextEditorVersion++,
        status: "draft",
        updated_at: new Date().toISOString(),
      };
      return sendData(res, { draft: state.editorDraft, created: req.method === "POST" }, req.method === "POST" ? 201 : 200);
    }
  }

  if (url.pathname === "/api/presence/owner/rooms/101/editor/preview" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    if (state.failNextPreviewReads > 0) {
      state.failNextPreviewReads -= 1;
      return sendError(res, 503, "cold_start", "Preview read is warming up.");
    }
    if (!state.editorDraft) state.editorDraft = buildEditorConfig("draft", state.nextEditorVersion++);
    return sendData(res, {
      created_draft: false,
      preview: true,
      expires_at: Math.floor(Date.now() / 1000) + 900,
      preview_token: "mock-preview-token",
      preview_url: "/studio/101/preview?presencePreviewToken=mock-preview-token",
      editable_config: { ...redactEditorConfig(state.editorDraft), status: "preview" },
      draft: state.editorDraft,
    });
  }

  if (url.pathname === "/api/presence/owner/rooms/101/editor/publish" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    if (!state.editorDraft) return sendError(res, 422, "validation_error", "No draft config exists for this Room.");
    const publishedDraft = state.privateDraftMedia ? promotePrivateMedia(state.editorDraft) : state.editorDraft;
    state.editorPublished = { ...publishedDraft, status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    state.editorDraft = null;
    return sendData(res, { published: state.editorPublished, public_config: redactEditorConfig(state.editorPublished) });
  }

  if (url.pathname === "/api/presence/owner/rooms/101/editor/rollback" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    state.editorPublished = { ...buildEditorConfig("published", state.nextEditorVersion++), scene_config: state.editorPublished.scene_config };
    return sendData(res, { published: state.editorPublished, public_config: redactEditorConfig(state.editorPublished) });
  }

  if (url.pathname === "/api/presence/owner/rooms/101/editor/history" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    return sendData(res, { items: [state.editorDraft, state.editorPublished].filter(Boolean) });
  }

  if (url.pathname === "/api/presence/owner/rooms/101/assets" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    return sendData(res, { items: state.editorAssets });
  }

  if (url.pathname === "/api/presence/owner/rooms/101/assets/attach" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    if (/^file:|^data:|localhost|127\.0\.0\.1|^[a-zA-Z]:[\\/]/i.test(body.url || "")) {
      return sendError(res, 422, "validation_error", "Unsafe asset URL.");
    }
    if (!state.editorDraft) state.editorDraft = buildEditorConfig("draft", state.nextEditorVersion++);
    const asset = { url: body.url, alt_text: body.alt_text || body.alt || "Attached asset", source: "editable_config:draft", slot: body.slot || "attached_assets", asset_type: body.asset_type || "image" };
    state.editorAssets.push(asset);
    state.editorDraft.asset_config = {
      ...(state.editorDraft.asset_config || {}),
      attached_assets: [...(state.editorDraft.asset_config?.attached_assets || []), asset],
    };
    return sendData(res, { draft: state.editorDraft, assets: state.editorAssets }, 201);
  }

  if (url.pathname === "/api/presence/owner/rooms/101/assets/upload" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    if (isForbiddenAuth(req)) return sendError(res, 403, "forbidden", "You do not own this Presence Room.");
    if (!state.editorDraft) state.editorDraft = buildEditorConfig("draft", state.nextEditorVersion++);
    const asset = {
      media_id: state.privateDraftMedia ? "uploaded-v1c-proof" : "uploaded-v1b-proof",
      url: state.privateDraftMedia
        ? "/ggm/works/bridle-road-2005.webp?draft-preview=v1c-proof"
        : "/ggm/works/bridle-road-2005.webp?uploaded=v1b-proof",
      alt_text: "Uploaded studio cover image",
      source: "editable_config:draft",
      slot: "attached_assets",
      asset_type: "image",
      role: "cover",
      mime_type: "image/png",
      size_bytes: 68,
      visibility: state.privateDraftMedia ? "private_draft" : "public_unlisted",
    };
    state.editorAssets.push(asset);
    state.editorDraft.asset_config = {
      ...(state.editorDraft.asset_config || {}),
      attached_assets: [...(state.editorDraft.asset_config?.attached_assets || []), asset],
    };
    return sendData(res, {
      draft: state.editorDraft,
      assets: state.editorAssets,
      uploaded_asset: asset,
      storage_policy: state.privateDraftMedia ? "private_draft_promoted_on_publish" : "public_unlisted_until_used",
    }, 201);
  }

  if (url.pathname === "/api/presence/owner/nodes/101/analytics" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, fixtures.analytics.legacy);
  }

  if (url.pathname === "/api/presence/owner/rooms/101/analytics" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, fixtures.analytics.graph);
  }

  if (url.pathname === "/api/presence/owner/rooms/101/passes" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, { items: state.passes });
  }

  if (url.pathname === "/api/presence/owner/rooms/101/passes" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    const pass = { ...fixtures.presencePass, id: state.nextPassId++, label: body.label || "Test Presence Pass", pass_type: body.pass_type || "nfc_card" };
    state.passes.unshift(pass);
    return sendData(res, pass, 201);
  }

  if (url.pathname === "/api/presence/owner/rooms/101/keys" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, { items: state.keys });
  }

  if (url.pathname === "/api/presence/owner/rooms/101/keys" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    const key = {
      ...fixtures.roomKey,
      id: state.nextKeyId++,
      public_token: `created-room-key-${state.nextKeyId}`,
      key_type: body.key_type || "nfc",
      campaign_label: body.campaign_label || "Test NFC Card",
      status: "active",
    };
    state.keys.unshift(key);
    return sendData(res, key, 201);
  }

  const keyPatchMatch = url.pathname.match(/^\/api\/presence\/owner\/rooms\/101\/keys\/(\d+)$/);
  if (keyPatchMatch && req.method === "PATCH") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    const key = state.keys.find((entry) => entry.id === Number(keyPatchMatch[1]));
    if (!key) return sendError(res, 404, "not_found", "Room Key not found.");
    Object.assign(key, body);
    return sendData(res, key);
  }

  // ─── Gardens + Observations ───────────────────────────────────────────────
  if (url.pathname === "/api/garden/home" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, fixtures.gardenHome ?? buildEmptyGarden());
  }

  if (url.pathname === "/api/garden/seeds" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, { items: fixtures.gardenSeeds ?? [] });
  }

  if (url.pathname === "/api/garden/shared-spaces" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, { items: [] });
  }

  const seedActionMatch = url.pathname.match(/^\/api\/garden\/seeds\/(\d+)\/(nurture|prune|compost|block)$/);
  if (seedActionMatch && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    const id = Number(seedActionMatch[1]);
    const action = seedActionMatch[2];
    const stateMap = {
      nurture: "recently_watered",
      prune: "pruned",
      compost: "composted",
      block: "blocked",
    };
    const state = stateMap[action];
    const strength = action === "nurture" ? 0.9 : 0.2;
    // Canonical contract: serialize both frontend and backend names.
    const seed = {
      id,
      garden_id: 1,
      observer_id: 1,
      seed_kind: "room",
      seed_type: "room",
      seed_id: 101,
      source_id: 101,
      source_label: "Watered Seed",
      source_type: "mood_board_overlap",
      source_slug: "garden-hall-room",
      state,
      status: state,
      strength,
      current_weight: strength * 100,
      reason: "Test seed reason",
      reason_label: "Test seed reason",
      primary_action: "open",
      href: "/r/garden-hall-room",
    };
    return sendData(res, { seed });
  }

  if (url.pathname === "/api/observations" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    // Server-side self-promotion guardrail mirror (matches contract).
    if (typeof body.body === "string" && /(book me|hire me|http|@\w+\.com)/i.test(body.body)) {
      return send(res, 400, {
        ok: false,
        error: {
          code: "validation_error",
          message:
            "Observation cannot include commercial links, booking/contact prompts, services, or portfolio-style business positioning.",
          details: {
            reason: "observer_business_profile_attempt",
            upgrade_required: true,
            upgrade_target: "presence_room",
            message:
              "Observer Masks are personal and social. To publish services, booking details, portfolios, commercial links, or business contact points, create or upgrade to a Presence Room.",
            allowed_actions: ["create_presence_room", "link_existing_room"],
          },
        },
      });
    }
    const id = Math.floor(Math.random() * 1000) + 500;
    const kind = body.observation_kind || body.observation_type || "text";
    const vis = body.visibility === "mask_only" ? "garden" : body.visibility || "public";
    return sendData(res, {
      id,
      observer_id: 1,
      author_observer_id: 1,
      observation_kind: kind,
      observation_type: kind,
      body: body.body,
      body_format: body.body_format || "plain",
      visibility: vis,
      nurture_count: 0,
      echo_count: 0,
      has_nurtured: false,
      author: { observer_id: 1, alias: "test-observer-mask", mask_name: "test-observer-mask" },
      source: body.hall_id
        ? { source_kind: "hall", source_id: body.hall_id, source_slug: body.source_slug || null, source_label: null }
        : body.source_kind
          ? { source_kind: body.source_kind, source_id: body.source_id, source_slug: body.source_slug || null, source_label: null }
          : null,
      created_at: new Date().toISOString(),
    }, 201);
  }

  const obsActionMatch = url.pathname.match(/^\/api\/observations\/(\d+)\/(nurture|echoes|report)$/);
  if (obsActionMatch) {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    const id = Number(obsActionMatch[1]);
    if (obsActionMatch[2] === "nurture") {
      if (req.method === "POST") {
        return sendData(res, {
          observation: {
            id,
            observer_id: 1,
            author_observer_id: 1,
            observation_kind: "text",
            observation_type: "text",
            body: "ok",
            visibility: "public",
            nurture_count: 1,
            echo_count: 0,
            has_nurtured: true,
          },
        });
      }
      if (req.method === "DELETE") {
        return sendData(res, {
          observation: {
            id,
            observer_id: 1,
            author_observer_id: 1,
            observation_kind: "text",
            observation_type: "text",
            body: "ok",
            visibility: "public",
            nurture_count: 0,
            echo_count: 0,
            has_nurtured: false,
          },
        });
      }
    }
    if (obsActionMatch[2] === "echoes" && req.method === "POST") {
      const message = (body.message || body.commentary || "").toString();
      // Self-promotion guardrail also applies to Echo commentary per contract.
      if (message && /(book me|hire me|http|@\w+\.com)/i.test(message)) {
        return send(res, 400, {
          ok: false,
          error: {
            code: "validation_error",
            message: "Echo commentary cannot include commercial links.",
            details: {
              reason: "observer_business_profile_attempt",
              upgrade_required: true,
              upgrade_target: "presence_room",
            },
          },
        });
      }
      return sendData(
        res,
        {
          id: id + 1000,
          observation_id: id,
          source_observation_id: id,
          observer_id: 2,
          message: message || null,
          commentary: message || null,
          source_attribution: {
            id,
            author_observer_id: 1,
            body: "Source Observation body snippet.",
          },
          created_at: new Date().toISOString(),
        },
        201,
      );
    }
    if (obsActionMatch[2] === "report" && req.method === "POST") {
      return sendData(res, { received: true }, 201);
    }
  }

  // ─── Mood Board → Seed (canonical contract) ───────────────────────────────
  const moodBoardSeedMatch = url.pathname.match(
    /^\/api\/observer\/mood-boards\/(\d+)\/items\/(\d+)\/seed$/,
  );
  if (moodBoardSeedMatch && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    const boardId = Number(moodBoardSeedMatch[1]);
    const itemId = Number(moodBoardSeedMatch[2]);
    return sendData(res, {
      seed: {
        id: 9100 + itemId,
        garden_id: 1,
        observer_id: 1,
        seed_kind: "room",
        seed_type: "room",
        seed_id: itemId,
        source_id: itemId,
        source_type: "mood_board_overlap",
        source_label: "Planted from your Mood Board",
        source_slug: `mb-${boardId}-item-${itemId}`,
        state: "recently_watered",
        status: "recently_watered",
        strength: 0.8,
        current_weight: 80,
        reason: "Added from your Mood Board.",
        reason_label: "Added from your Mood Board.",
        primary_action: "open",
      },
      reason_label: "Added from your Mood Board.",
      garden_home_update_hint: "from_mood_boards",
    }, 201);
  }

  const maskMatch = url.pathname.match(/^\/api\/masks\/([^/]+)$/);
  if (maskMatch && req.method === "GET") {
    return sendData(res, fixtures.publicMask ?? buildMaskFixture(decodeURIComponent(maskMatch[1])));
  }

  // ─── Halls ────────────────────────────────────────────────────────────────
  if (url.pathname === "/api/halls" && req.method === "GET") {
    return sendData(res, fixtures.hallsList ?? buildHallsList());
  }

  const hallDetailMatch = url.pathname.match(/^\/api\/halls\/([^/]+)$/);
  if (hallDetailMatch && req.method === "GET") {
    return sendData(res, fixtures.hall ?? buildHallFixture(decodeURIComponent(hallDetailMatch[1])));
  }

  const hallParticipantsMatch = url.pathname.match(/^\/api\/halls\/([^/]+)\/participants$/);
  if (hallParticipantsMatch && req.method === "GET") {
    return sendData(res, { items: fixtures.hallParticipants ?? [] });
  }

  const hallObsMatch = url.pathname.match(/^\/api\/halls\/([^/]+)\/observations$/);
  if (hallObsMatch && req.method === "GET") {
    return sendData(res, { items: fixtures.hallObservations ?? [] });
  }

  const hallJoinMatch = url.pathname.match(/^\/api\/halls\/([^/]+)\/(join|leave)$/);
  if (hallJoinMatch && req.method === "POST") {
    const joined = hallJoinMatch[2] === "join";
    // Per contract, guest join is allowed when no Authorization header is
    // present. We require a token only for the canonical Observer join.
    if (!hasAuth(req) && !joined) {
      return sendError(res, 401, "auth_required", "Missing Authorization Header");
    }
    const isGuest = !hasAuth(req);
    return sendData(res, {
      id: isGuest ? null : 7001,
      hall_id: 1,
      observer_id: isGuest ? null : 1,
      role: "participant",
      status: joined ? "joined" : "left",
      identity_type: isGuest ? "guest" : "mask",
      alias: isGuest ? null : "test-observer-mask",
      mask_name: isGuest ? null : "test-observer-mask",
      participant: joined
        ? {
            id: 7001,
            hall_id: 1,
            observer_id: isGuest ? null : 1,
            alias: isGuest ? null : "test-observer-mask",
            mask_name: isGuest ? null : "test-observer-mask",
            role: "participant",
            joined_at: new Date().toISOString(),
          }
        : null,
      joined,
      available_actions: joined ? ["post_observation", "visit_stall", "open_portal"] : [],
    });
  }

  // Dedicated Hall Observation create (per contract).
  const hallObservationCreateMatch = url.pathname.match(
    /^\/api\/halls\/([^/]+)\/observations$/,
  );
  if (hallObservationCreateMatch && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    const slug = hallObservationCreateMatch[1];
    const id = Math.floor(Math.random() * 1000) + 800;
    return sendData(res, {
      id,
      observer_id: 1,
      author_observer_id: 1,
      observation_kind: body.observation_kind || "hall",
      observation_type: body.observation_kind || "hall",
      body: body.body,
      visibility: body.visibility === "mask_only" ? "garden" : body.visibility || "public",
      nurture_count: 0,
      echo_count: 0,
      has_nurtured: false,
      author: { observer_id: 1, alias: "test-observer-mask", mask_name: "test-observer-mask" },
      source: { source_kind: "hall", source_id: 1, source_slug: slug, source_label: null },
      created_at: new Date().toISOString(),
    }, 201);
  }

  // Hall portal click and stall visit events.
  const portalClickMatch = url.pathname.match(
    /^\/api\/halls\/([^/]+)\/portals\/(\d+)\/click$/,
  );
  if (portalClickMatch && req.method === "POST") {
    state.hallPortalClicks = (state.hallPortalClicks || 0) + 1;
    return sendData(res, {
      id: Math.floor(Math.random() * 10_000),
      hall_id: 1,
      event_type: "portal_click",
      portal_id: Number(portalClickMatch[2]),
      observer_id: hasAuth(req) ? 1 : null,
      created_at: new Date().toISOString(),
    }, 201);
  }
  const stallVisitMatch = url.pathname.match(
    /^\/api\/halls\/([^/]+)\/stalls\/(\d+)\/visit$/,
  );
  if (stallVisitMatch && req.method === "POST") {
    state.hallStallVisits = (state.hallStallVisits || 0) + 1;
    return sendData(res, {
      id: Math.floor(Math.random() * 10_000),
      hall_id: 1,
      event_type: "stall_visit",
      stall_id: Number(stallVisitMatch[2]),
      observer_id: hasAuth(req) ? 1 : null,
      created_at: new Date().toISOString(),
    }, 201);
  }

  // Hall trailhead Paths.
  const pathFromHallMatch = url.pathname.match(/^\/api\/paths\/from-hall\/(\d+)$/);
  if (pathFromHallMatch && req.method === "GET") {
    return sendData(res, buildHallTrailheadPath(Number(pathFromHallMatch[1])));
  }
  const pathGenFromHallMatch = url.pathname.match(/^\/api\/paths\/generate\/from-hall\/(\d+)$/);
  if (pathGenFromHallMatch && req.method === "POST") {
    return sendData(res, buildHallTrailheadPath(Number(pathGenFromHallMatch[1])), 201);
  }

  // Owner Hall studio
  if (url.pathname === "/api/presence/owner/halls" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, { items: fixtures.ownerHalls ?? [] });
  }

  if (url.pathname === "/api/presence/owner/halls" && req.method === "POST") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    const hall = {
      id: 9001,
      slug: `studio-hall-${Date.now()}`,
      title: body.title,
      description: body.description || null,
      hall_type: body.hall_type || "salon",
      status: "scheduled",
      visibility: body.visibility || "public",
      host_room_id: body.host_room_id,
      zones: [],
      sessions: [],
      stalls: [],
      portals: [],
    };
    return sendData(res, hall, 201);
  }

  const ownerHallMatch = url.pathname.match(/^\/api\/presence\/owner\/halls\/(\d+)$/);
  if (ownerHallMatch && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, fixtures.ownerHall ?? buildOwnerHall(Number(ownerHallMatch[1])));
  }

  const ownerHallAnalyticsMatch = url.pathname.match(/^\/api\/presence\/owner\/halls\/(\d+)\/analytics$/);
  if (ownerHallAnalyticsMatch && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    const stallVisits = state.hallStallVisits ?? 3;
    const portalClicks = state.hallPortalClicks ?? 1;
    return sendData(res, {
      hall_id: Number(ownerHallAnalyticsMatch[1]),
      participants_joined: 4,
      people_gathered: 4,
      observers: 3,
      guests: 1,
      observations_posted: 2,
      observations_shared: 2,
      rooms_entered: 5,
      stall_visits: stallVisits,
      portal_clicks: portalClicks,
      seeds_created: 2,
      paths_generated: 1,
      paths_opened: 1,
      enquiries: 0,
      top_stalls: [
        { room_slug: fixtures.room.slug, room_display_name: fixtures.room.display_name, visits: stallVisits },
      ],
      most_visited_stall: {
        stall_id: 1,
        room_slug: fixtures.room.slug,
        room_display_name: fixtures.room.display_name,
        visits: stallVisits,
      },
      most_used_portal: {
        portal_id: 1,
        label: "To the Listening Hall",
        clicks: portalClicks,
        destination_kind: "hall",
        destination_slug: "listening-hall-april",
      },
      source_breakdown: [
        { source: "garden_seed", count: 2 },
        { source: "direct", count: 2 },
      ],
    });
  }

  return sendError(res, 404, "not_found", `No mock route for ${req.method} ${url.pathname}`);
});

function buildEmptyGarden() {
  return {
    observer: { id: 1, alias: "test-observer-mask", visibility: "public_mask", self_promotion_locked: true, status: "active" },
    sections: [
      { id: "new_growth", title: "New Growth", blurb: "Fresh Observations from strong Seeds.", observations: [] },
      { id: "recently_watered", title: "Recently Watered", blurb: "Seeds you watered.", seeds: [] },
      { id: "crossed_paths", title: "Crossed Paths", blurb: "Recent overlaps.", shared_spaces: [] },
      { id: "from_rooms", title: "From Rooms You Entered", blurb: "Rooted in places.", observations: [] },
      { id: "wilting_seeds", title: "Wilting Seeds", blurb: "Fading.", seeds: [] },
    ],
  };
}

function promotePrivateMedia(value) {
  if (Array.isArray(value)) return value.map(promotePrivateMedia);
  if (!value || typeof value !== "object") return value;
  const mapped = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, promotePrivateMedia(entry)]));
  if (mapped.media_id === "uploaded-v1c-proof") {
    mapped.url = "/ggm/works/bridle-road-2005.webp?published=v1c-proof";
    mapped.visibility = "public_published";
    mapped.status = "published";
  }
  return mapped;
}

function buildMaskFixture(alias) {
  return {
    observer: { id: 1, alias, mask_name: alias, visibility: "public_mask", self_promotion_locked: true, status: "active", bio_fragment: "Walking quietly through Rooms." },
    recent_observations: [
      {
        id: 4242,
        observer_id: 1,
        author_observer_id: 1,
        observation_kind: "text",
        observation_type: "text",
        body: "A quiet observation about the walk this morning.",
        body_format: "plain",
        visibility: "public",
        nurture_count: 0,
        echo_count: 0,
        has_nurtured: false,
        author: { observer_id: 1, alias, mask_name: alias },
        source: null,
        created_at: new Date().toISOString(),
      },
    ],
    echoes: [],
    public_mood_boards: [],
    seeds_kept_close: [],
    rooms_returned_to: [],
  };
}

function buildHallsList() {
  return {
    items: [
      {
        id: 1, slug: "open-studio-friday", title: "Open Studio Friday", hall_type: "studio_hall", status: "live",
        visibility: "public", participants_count: 6, observations_count: 4, host_room_id: fixtures.room.id, host_room_slug: fixtures.room.slug, host_room_display_name: fixtures.room.display_name,
        description: "Doors open. Stop by.",
      },
      {
        id: 2, slug: "listening-hall-april", title: "Listening Hall — April", hall_type: "listening_hall", status: "scheduled",
        visibility: "public", participants_count: 0, observations_count: 0, host_room_id: fixtures.room.id, host_room_slug: fixtures.room.slug, host_room_display_name: fixtures.room.display_name,
        starts_at: new Date(Date.now() + 86_400_000).toISOString(),
      },
    ],
    total: 2, live_count: 1, scheduled_count: 1,
  };
}

function buildHallFixture(slug) {
  return {
    id: 1, slug, title: "Open Studio Friday", hall_type: "studio_hall", status: "live",
    visibility: "public", participants_count: 6, observations_count: 4,
    description: "A studio open to anyone. Walk in, see what's on the bench, talk if you want.",
    host_room_id: fixtures.room.id, host_room_slug: fixtures.room.slug, host_room_display_name: fixtures.room.display_name,
    zones: [
      { id: 1, hall_id: 1, zone_kind: "lobby", title: "Lobby", blurb: "Soft entry.", order_index: 1, participants_here: 3 },
      { id: 2, hall_id: 1, zone_kind: "stage", title: "Welcome Stage", blurb: "Quick hello, then look around.", order_index: 2 },
      { id: 3, hall_id: 1, zone_kind: "table", title: "Material Table", blurb: "Talking about pigment.", order_index: 3 },
      { id: 4, hall_id: 1, zone_kind: "stall", title: "Pigment Stall", blurb: "Step into the Stall.", order_index: 4, links_to_kind: "room", links_to_slug: fixtures.room.slug },
      { id: 5, hall_id: 1, zone_kind: "noticeboard", title: "Notes from the bench", blurb: "Pinned Observations.", order_index: 5 },
      { id: 6, hall_id: 1, zone_kind: "portal", title: "To the Listening Hall", blurb: "Step through.", order_index: 6, links_to_kind: "hall", links_to_slug: "listening-hall-april" },
    ],
    sessions: [
      { id: 1, hall_id: 1, title: "Opening notes", status: "scheduled" },
    ],
    stalls: [
      { id: 1, hall_id: 1, room_id: fixtures.room.id, room_slug: fixtures.room.slug, room_display_name: fixtures.room.display_name, short_pitch: "Studio open today.", visit_count: 3 },
    ],
    portals: [
      { id: 1, hall_id: 1, label: "To the Listening Hall", destination_kind: "hall", destination_slug: "listening-hall-april" },
    ],
    recent_observations: [],
    noticeboard: [],
  };
}

function buildOwnerHall(id) {
  return {
    ...buildHallFixture("open-studio-friday"),
    id,
  };
}

function buildHallTrailheadPath(hallId) {
  return {
    id: 5000 + hallId,
    title: "From the Open Studio",
    description: "A short walk through the Hall and out into related Rooms.",
    path_type: "hall_trailhead",
    trailhead_type: "hall",
    trailhead_id: hallId,
    generated_by: "system",
    visibility: "public",
    status: "active",
    waypoints: [
      {
        id: 1,
        path_id: 5000 + hallId,
        waypoint_type: "hall",
        waypoint_id: hallId,
        title: "The Hall itself",
        reason_shown: "Trailhead from this Hall.",
        order_index: 0,
      },
      {
        id: 2,
        path_id: 5000 + hallId,
        waypoint_type: "room",
        waypoint_id: fixtures.room.id,
        title: fixtures.room.display_name,
        reason_shown: "Host Room of the Hall.",
        order_index: 1,
      },
    ],
    choices: [
      {
        id: 1,
        path_id: 5000 + hallId,
        from_waypoint_id: 1,
        label: "Follow similar Rooms",
        direction_type: "similar_rooms",
      },
    ],
  };
}

function toStoredStudioRoomDraft(kitId, kitName, draftPayload) {
  return {
    contract: templateKitDraftContractVersion,
    schema_version: draftPayload.schemaVersion || draftPayload.schema_version,
    template_kit_id: kitId,
    template_kit_name: kitName,
    support_state: "primary",
    base_published_version: 0,
    published_state: null,
    room: draftPayload.room,
    required_fields: Array.isArray(draftPayload.requiredFields) ? draftPayload.requiredFields : [],
    optional_fields: Array.isArray(draftPayload.optionalFields) ? draftPayload.optionalFields : [],
    copy_scaffolds: Array.isArray(draftPayload.copyScaffolds) ? draftPayload.copyScaffolds : [],
    cta_strategy: draftPayload.ctaStrategy || {},
    source_persistence_boundary: draftPayload.persistenceBoundary || null,
  };
}

function buildStudioRoomDraftNode(roomId, slug, kitId, kitName, storedDraft) {
  return {
    id: roomId,
    owner_user_id: 1,
    slug,
    display_name: `Untitled ${kitName}`,
    headline: `Draft Studio Room from ${kitName}`,
    bio: "Replace this scaffold copy before publishing.",
    node_type: "creative",
    display_mode: "studio_room_draft",
    plan_type: "basic",
    status: "draft",
    visibility: "private",
    public_status: "draft",
    room_type: "studio_room",
    theme_preset: "studio_room_template",
    accent_color: storedDraft.room?.theme?.accent || "#d8a44a",
    primary_cta_label: storedDraft.cta_strategy?.label || null,
    public_url: `/p/${slug}`,
    services: [],
    works: [],
    links: [],
    metadata: {
      studio_room_template: {
        kit_id: kitId,
        kit_name: kitName,
        support_state: "primary",
        contract: templateKitDraftContractVersion,
        created_via: "template-kit-start",
      },
    },
  };
}

function buildStudioRoomDraftEditorConfig(roomId, kitId, kitName, storedDraft, summary) {
  const now = new Date().toISOString();
  const version = state.nextStudioRoomDraftVersion++;
  return {
    id: 9700 + roomId,
    room_id: roomId,
    schema_version: "presence-editable-config-v1",
    version,
    status: "draft",
    renderer_key: "studio-room-template-kit-v1",
    scene_config: {
      studio_room_contract: templateKitDraftContractVersion,
      schema_version: storedDraft.schema_version,
      template_kit_id: kitId,
      entry_chamber_id: storedDraft.room?.entryChamberId || null,
      summary,
    },
    style_dna: {},
    motion_config: {},
    asset_config: {},
    content_config: {
      studio_room_draft: storedDraft,
      template_kit: {
        id: kitId,
        name: kitName,
        support_state: "primary",
      },
    },
    roomkey_config: {
      created_via: "template-kit-start",
      public_route_behavior: "unchanged",
    },
    enquiry_config: {
      cta_label: storedDraft.cta_strategy?.label || null,
      delivery_posture: "owner_config_required_before_publish",
    },
    locked_fields: {
      studio_room_persistence_contract: {
        contract: templateKitDraftContractVersion,
        schema_version: storedDraft.schema_version,
        base_published_version: 0,
        candidate_kits_excluded: true,
      },
    },
    created_at: now,
    updated_at: now,
    published_at: null,
    archived_at: null,
  };
}

function summarizeStudioRoom(room) {
  const chambers = Array.isArray(room?.chambers) ? room.chambers : [];
  let objectCount = 0;
  let mobileVariantCount = room?.mobile ? 1 : 0;
  for (const chamber of chambers) {
    if (!chamber || typeof chamber !== "object") continue;
    if (chamber.mobile) mobileVariantCount += 1;
    const objects = Array.isArray(chamber.objects) ? chamber.objects : [];
    objectCount += objects.length;
    mobileVariantCount += objects.filter((object) => object && typeof object === "object" && object.mobile).length;
  }
  return {
    chamber_count: chambers.length,
    object_count: objectCount,
    mobile_variant_count: mobileVariantCount,
  };
}

const restrictedStudioRoomKeys = new Set([
  "accesstoken",
  "apikey",
  "authsubject",
  "contactemail",
  "contactphone",
  "draftconfig",
  "editableconfig",
  "editoronly",
  "email",
  "internal",
  "motionconfig",
  "owneremail",
  "owneruserid",
  "password",
  "phone",
  "privatekey",
  "publicemail",
  "publicphone",
  "raweditableconfig",
  "refreshtoken",
  "secret",
  "signedurl",
  "styledna",
]);

function containsRestrictedKey(value) {
  if (Array.isArray(value)) return value.some((item) => containsRestrictedKey(item));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => {
    const compact = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
    return restrictedStudioRoomKeys.has(compact) || containsRestrictedKey(child);
  });
}

function validateSafeUrls(value) {
  if (Array.isArray(value)) return value.every((item) => validateSafeUrls(item));
  if (!value || typeof value !== "object") return true;
  return Object.entries(value).every(([key, child]) => {
    const lowered = String(key).toLowerCase();
    if ((lowered === "url" || lowered === "href") && typeof child === "string") {
      return isSafeStudioRoomUrl(child);
    }
    return validateSafeUrls(child);
  });
}

function isSafeStudioRoomUrl(value) {
  const text = String(value || "").trim();
  if (!text || text.startsWith("#")) return true;
  if (text.startsWith("/")) {
    const lowered = text.toLowerCase();
    return !text.split("/").includes("..") && !lowered.startsWith("/studio") && !lowered.startsWith("/internal") && !lowered.startsWith("/api") && !lowered.startsWith("/admin");
  }
  try {
    const parsed = new URL(text);
    const host = parsed.hostname.toLowerCase();
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      host &&
      !["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host) &&
      !host.endsWith(".local") &&
      !host.endsWith(".internal")
    );
  } catch {
    return false;
  }
}

function buildEditorConfig(status = "published", version = 1) {
  const now = new Date().toISOString();
  return {
    id: 9400 + version,
    room_id: fixtures.room.id,
    schema_version: "presence-editable-config-v1",
    version,
    status,
    renderer_key: "ggm-faithful-room-v1",
    scene_config: {
      scenes: [
        {
          id: "artwork_field",
          number: "01",
          label: "Artwork Field",
          title: "Colour as Memory",
          subtitle: "liquid slideshow",
          statement: "Christina Kerkvliet Goddard - selected watercolour works",
          primary_artwork_slug: "willow-of-port-arthur-2019",
          intro_copy: "Australian artist working across memory, colour, and lived landscape.",
          action_labels: { primary: "Begin a conversation", work_advance: "Show next artwork" },
          roomkey_provenance_text: "Opened via NFC/QR",
        },
        {
          id: "work_wall",
          number: "02",
          label: "Work Wall",
          artwork_order: ["willow-of-port-arthur-2019", "bridle-road-2005"],
          selected_work_slug: "willow-of-port-arthur-2019",
          work_detail_behaviour: "route_or_inline_detail",
        },
        { id: "practice_studio", number: "03", label: "Practice Studio", about_title: "Who is Christina", note_cards_enabled: true },
        { id: "calling_card", number: "04", label: "Calling Card", contact_title: "Begin a conversation", enquiry_cta: "Begin a conversation" },
      ],
    },
    style_dna: {
      palette: { bg: "#f4f4f4", paper: "#eceae7", paper_warm: "#e7e1d7", ink: "#111111", muted: "#6a6a6a", line: "#d7d2c8", hero_stage_bg: "#eaeaea", accent: "#ffffff" },
      typography: { heading_stack: "Inter, Helvetica Neue, Arial, sans-serif", body_stack: "Inter, Helvetica Neue, Arial, sans-serif" },
      background_treatment: "paper_field_with_atmospheric_liquid_bloom",
      frame_treatment: "hairline_no_rounded_gallery_cards",
    },
    motion_config: {
      liquid_style: "ripple",
      liquid_intensity: 0.95,
      morph_speed_ms: 1100,
      distortion_scale: 1,
      dither_strength: 0.62,
      film_grain_strength: 0.42,
      blur_amount: 0.5,
      transition_style: "liquid_crossfade",
      heavy_motion_enabled: false,
      custom_cursor_enabled: false,
      reduced_motion_fallback: true,
    },
    asset_config: {
      hero_image: { url: "/ggm/works/willow-of-port-arthur-2019.webp", alt_text: "Willow of Port Arthur" },
      artworks: [
        { slug: "willow-of-port-arthur-2019", title: "Willow of Port Arthur", year: "2019", medium: "Watercolour on paper", dimensions: "93 x 104 cm", url: "/ggm/works/willow-of-port-arthur-2019.webp", thumbnail_url: "/ggm/thumbs/willow-of-port-arthur-2019.webp", alt_text: "Willow of Port Arthur", is_visible: true },
        { slug: "bridle-road-2005", title: "Bridle Road", year: "2005", medium: "Watercolour on paper", dimensions: "41 x 61 cm", url: "/ggm/works/bridle-road-2005.webp", thumbnail_url: "/ggm/thumbs/bridle-road-2005.webp", alt_text: "Bridle Road", is_visible: true },
      ],
      public_assets_only: true,
    },
    content_config: {
      display_name: fixtures.room.display_name,
      headline: fixtures.room.headline,
      about: {
        biography: "Born in Victoria and raised in South Australia.",
        artist_statement: "Memory Colours revisits and haunts its sites of episode.",
        process_notes: "Layered watercolour, line, atmosphere, landscape, and remembered encounter.",
        strands: [
          { title: "Memory colours", body: "Colour as a trigger for recollection." },
          { title: "Life-cycles", body: "Nest, branch, path, and seasonal shifts." },
        ],
      },
      contact: {
        contact_title: "Calling Card",
        contact_copy: "Use the Presence enquiry form to begin a conversation.",
        contact_posture: "presence_enquiry_form",
        availability_status: "Enquiries accepted through Presence",
        external_links: [{ label: "Reference portfolio", url: "https://christina-goddard.vercel.app/", link_type: "website" }],
      },
    },
    roomkey_config: {
      entry_label: "Opened via RoomKey",
      provenance_chip_text: "Opened via NFC/QR",
      guest_entry_copy: "You have entered Christina Kerkvliet Goddard's Presence Room.",
      invalid_copy: "This Room Key is not available.",
      revoked_copy: "This Room Key has been revoked.",
      show_save_to_garden: true,
    },
    enquiry_config: { cta_label: "Begin a conversation", delivery_posture: "backend_enquiry_capture" },
    locked_fields: { renderer_shell: { locked: true, reason: "Commissioned renderer chrome and shader contract." } },
    created_at: now,
    updated_at: now,
    published_at: status === "published" ? now : null,
    archived_at: null,
  };
}

function buildEditorAssets() {
  return [
    { url: "/ggm/works/willow-of-port-arthur-2019.webp", alt_text: "Willow of Port Arthur", source: "presence_work", slot: "hero_image", asset_type: "image" },
    { url: "/ggm/works/bridle-road-2005.webp", alt_text: "Bridle Road", source: "presence_work", slot: "artwork_images", asset_type: "image" },
    { url: "/ggm/thumbs/willow-of-port-arthur-2019.webp", alt_text: "Willow thumbnail", source: "presence_work", slot: "thumbnails", asset_type: "thumbnail" },
  ];
}

function publicRoomFixture() {
  return {
    ...fixtures.room,
    renderer_key: state.editorPublished?.renderer_key || fixtures.room.renderer_key || "ggm-faithful-room-v1",
    editable_config: redactEditorConfig(state.editorPublished),
  };
}

function redactEditorConfig(config) {
  if (!config) return null;
  const publicAssets = { ...(config.asset_config || {}) };
  delete publicAssets.attached_assets;
  return {
    schema_version: config.schema_version,
    version: config.version,
    status: "published",
    renderer_key: config.renderer_key,
    published_at: config.published_at,
    scene_config: config.scene_config,
    style_dna: config.style_dna,
    motion_config: config.motion_config,
    asset_config: publicAssets,
    content_config: config.content_config,
    roomkey_config: config.roomkey_config,
    enquiry_config: config.enquiry_config,
    locked_fields: config.locked_fields,
  };
}

server.listen(port, "127.0.0.1", () => {
  console.log(`Presence mock API listening on http://127.0.0.1:${port}`);
});

function publicState() {
  return {
    observer: Boolean(state.observer),
    saved: state.saved,
    followed: state.followed,
    passportMode: state.passportMode,
    boards: state.boards.length,
    passes: state.passes.length,
    keys: state.keys.length,
    studioRoomDrafts: Object.keys(state.studioRoomDrafts || {}).length,
  };
}

function record(req, url, body) {
  state.requests.push({
    method: req.method,
    path: url.pathname,
    body,
    has_auth: hasAuth(req),
  });
}

function hasAuth(req) {
  return Boolean(req.headers.authorization);
}

function isForbiddenAuth(req) {
  return String(req.headers.authorization || "").includes("non-owner-token");
}

function sendData(res, data, status = 200) {
  return send(res, status, { data });
}

function sendError(res, status, code, message) {
  return send(res, status, { error: { code, message } });
}

function send(res, status, payload) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept",
    "Content-Type": "application/json",
  });
  res.end(payload === null ? "" : JSON.stringify(payload));
}

async function readJson(req) {
  if (!["POST", "PATCH", "PUT"].includes(req.method || "")) return {};
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
