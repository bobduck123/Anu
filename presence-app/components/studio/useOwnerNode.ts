"use client";

import { useEffect, useState, useCallback } from "react";
import { getNode } from "@/lib/api/owner";
import { PresenceApiError } from "@/lib/api/client";
import type { PresenceNode } from "@/lib/api/types";
import { AUTH_REQUIRED_MESSAGE, resolveOwnerSessionToken } from "./ownerSession";

export type OwnerAccessState =
  | "checking-session"
  | "confirming-room"
  | "ready"
  | "sign-in"
  | "forbidden"
  | "unavailable";

export function useOwnerNode(nodeId: number) {
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessState, setAccessState] = useState<OwnerAccessState>("checking-session");

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAccessState("checking-session");
    try {
      const accessToken = await resolveOwnerSessionToken({ waitForHydration: true });
      if (!accessToken) {
        setNode(null);
        setToken(null);
        setError(AUTH_REQUIRED_MESSAGE);
        setAccessState("sign-in");
        return;
      }
      setToken(accessToken);
      setAccessState("confirming-room");
      const data = await getNode(nodeId, accessToken);
      setNode(data);
      setAccessState("ready");
    } catch (e) {
      if (e instanceof PresenceApiError && e.status === 401) {
        setNode(null);
        setToken(null);
        setError(AUTH_REQUIRED_MESSAGE);
        setAccessState("sign-in");
      } else if (e instanceof PresenceApiError && e.status === 403) {
        setNode(null);
        setError("You do not have access to this Room.");
        setAccessState("forbidden");
      } else {
        setError(e instanceof Error ? e.message : "Unable to confirm Room access.");
        setAccessState("unavailable");
      }
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => { void reload(); }, [reload]);

  return {
    node,
    token,
    loading,
    error,
    authRequired: error === AUTH_REQUIRED_MESSAGE,
    accessState,
    reload,
  };
}
