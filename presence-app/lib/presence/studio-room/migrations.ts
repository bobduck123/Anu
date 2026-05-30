import { PRESENCE_STUDIO_ROOM_SCHEMA_VERSION, type Room } from "./model.ts";

export interface StudioRoomMigrationResult {
  room: Room;
  migrated: boolean;
  warnings: string[];
}

export function migrateStudioRoomConfig(
  room: Room,
  options: { now?: string } = {},
): StudioRoomMigrationResult {
  if (room.schemaVersion === PRESENCE_STUDIO_ROOM_SCHEMA_VERSION) {
    return { room, migrated: false, warnings: [] };
  }

  return {
    room: {
      ...room,
      schemaVersion: PRESENCE_STUDIO_ROOM_SCHEMA_VERSION,
      migration: {
        from: String(room.schemaVersion || "unknown"),
        migratedAt: options.now ?? new Date(0).toISOString(),
      },
    },
    migrated: true,
    warnings: ["Applied placeholder Studio room schema migration."],
  };
}
