"use client";
import { useCallback, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";
export default function SignOutButton() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const flight = useRef(false);
  const signOut = useCallback(async () => {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await browserSupabase().auth.signOut({ scope: "local" });
      if (result.error) throw result.error;
      window.location.replace("/");
    } catch {
      flight.current = false;
      setBusy(false);
      setError("Sign-out failed. Please try again.");
    }
  }, []);
  return (
    <div className="nav-sign-out">
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={busy}
        aria-label="Sign out of Meeting Companion"
        aria-busy={busy}
        className="nav-sign-out-button"
      >
        <LogOut size={16} aria-hidden="true" />
        {busy ? "Signing out…" : "Sign Out"}
      </button>
      {error && (
        <p role="alert" className="mt-2 max-w-60 text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
