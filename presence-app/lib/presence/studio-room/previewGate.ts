export interface StudioRoomPreviewEnv {
  NODE_ENV?: string;
}

export function isStudioRoomInternalPreviewEnabled(env: StudioRoomPreviewEnv = process.env): boolean {
  return env.NODE_ENV !== "production";
}
