"use client";
import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import type { DuplicateMatch } from "@/lib/schemas";
export default function DuplicateMeetingModal({
  match,
  onCancel,
  onContinue,
}: {
  match: DuplicateMatch;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="duplicate-title"
      aria-describedby="duplicate-warning"
      className="quote-dialog !max-w-lg"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <AlertTriangle size={30} className="mb-4 text-amber-600" />
      <h2 id="duplicate-title">Existing meeting found</h2>
      <p id="duplicate-warning" className="mt-4 leading-7">
        A meeting with this transcript already exists. Reprocessing will update
        existing tasks instead of duplicating them.
      </p>
      <p className="mt-3 text-sm text-slate-600">
        Matched {match.matched_by === "title" ? "meeting title" : "transcript"}:{" "}
        <strong>{match.title}</strong>. You will review the new proposals before
        task updates are committed. Superseded tasks will be archived with their
        original evidence.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          autoFocus
          className="secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button type="button" className="primary" onClick={onContinue}>
          Continue &amp; Update
        </button>
      </div>
    </dialog>
  );
}
