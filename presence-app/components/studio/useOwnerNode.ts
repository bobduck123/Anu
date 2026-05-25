"use client";

import { useEffect, useState, useCallback } from "react";
import { getNode } from "@/lib/api/owner";
import type { PresenceNode } from "@/lib/api/types";
import { AUTH_REQUIRED_MESSAGE, resolveOwnerSessionToken } from "./ownerSession";

export function useOwnerNode(nodeId: number) {
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = await resolveOwnerSessionToken();
      if (!accessToken) {
        setError(AUTH_REQUIRED_MESSAGE);
        return;
      }
      setToken(accessToken);
      const data = await getNode(nodeId, accessToken);
      setNode(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load node.");
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
    reload,
  };
}
