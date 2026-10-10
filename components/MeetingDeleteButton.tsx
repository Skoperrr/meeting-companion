"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
export default function MeetingDeleteButton({
  meetingId,
  onDeleted,
}: {
  meetingId: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function remove() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/meetings/${encodeURIComponent(meetingId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        throw new Error(
          body &&
            typeof body === "object" &&
            "error" in body &&
            typeof body.error === "string"
            ? body.error
            : "Meeting deletion failed. Please retry.",
        );
      }
      setOpen(false);
      onDeleted?.();
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Meeting deletion failed.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300/40 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-500"
      >
        <Trash2 size={16} aria-hidden="true" />
        Delete Meeting
      </button>
      {open && (
        <ConfirmDeleteModal
          title="Permanently delete meeting"
          message="Are you sure? This will permanently delete this meeting transcript and all its associated tasks."
          confirmLabel="Delete meeting"
          busy={busy}
          error={error}
          onCancel={() => setOpen(false)}
          onConfirm={() => void remove()}
        />
      )}
    </>
  );
}
