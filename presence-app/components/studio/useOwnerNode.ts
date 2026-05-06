"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getNode } from "@/lib/api/owner";
import type { PresenceNode } from "@/lib/api/types";

export function useOwnerNode(nodeId: number) {
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Sign in required.");
        return;
      }
      setToken(session.access_token);
      const data = await getNode(nodeId, session.access_token);
      setNode(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load node.");
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => { void reload(); }, [reload]);

  return { node, token, loading, error, reload };
}
