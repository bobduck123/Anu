import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "presenceGraph.json"), "utf8"));
const port = Number(process.env.PORT || 5105);

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
      room: fixtures.room,
      public_url: fixtures.room.public_url,
      room_key: fixtures.roomKey,
      encounter: null,
      available_actions: ["enter_room", "save", "follow", "mood_board", "path"],
      observer_upgrade: "Create an Observer Mask to remember this Room.",
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
    return sendData(res, fixtures.room);
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

  if (url.pathname === "/api/presence/owner/nodes/101" && req.method === "GET") {
    if (!hasAuth(req)) return sendError(res, 401, "auth_required", "Missing Authorization Header");
    return sendData(res, fixtures.room);
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

  return sendError(res, 404, "not_found", `No mock route for ${req.method} ${url.pathname}`);
});

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
