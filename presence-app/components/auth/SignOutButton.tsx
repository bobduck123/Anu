"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({
  className,
  iconOnly = false,
}: {
  className: string;
  iconOnly?: boolean;
}) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  async function signOut() {
    setState("busy");
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState("error");
      return;
    }
    window.location.assign("/");
  }

  const text =
    state === "busy"
      ? "Signing out..."
      : state === "error"
        ? "Try signing out again"
        : "Sign out";

  return (
    <button
      type="button"
      data-testid="explicit-sign-out"
      onClick={() => void signOut()}
      disabled={state === "busy"}
      aria-label={iconOnly ? text : undefined}
      title={iconOnly ? text : undefined}
      className={className}
    >
      <LogOut className="h-3.5 w-3.5" />
      {!iconOnly && text}
    </button>
  );
}
