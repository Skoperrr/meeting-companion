"use client";
import { useState } from "react";
import { browserSupabase } from "@/lib/supabase/browser";
export default function UserMenu({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="p-4 text-sm">
      <p className="mb-2 truncate" title={email}>
        {email}
      </p>
      <button
        className="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const { error } = await browserSupabase().auth.signOut({
              scope: "local",
            });
            if (error) throw error;
            window.location.replace("/");
          } catch {
            setError("Sign-out failed. Try again.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
