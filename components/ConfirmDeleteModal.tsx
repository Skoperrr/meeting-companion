"use client";
import { useEffect, useId, useRef } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
};
export default function ConfirmDeleteModal({
  title,
  message,
  confirmLabel,
  busy,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    cancel.current?.focus();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 text-zinc-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <AlertTriangle className="text-red-400" size={24} aria-hidden="true" />
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          aria-label="Close deletion confirmation"
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 disabled:opacity-40"
        >
          <X size={18} />
        </button>
      </div>
      <h2 id={`${id}-title`} className="mt-4 text-xl font-semibold">
        {title}
      </h2>
      <p id={`${id}-message`} className="mt-3 text-sm leading-6 text-zinc-400">
        {message}
      </p>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-400/10 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          ref={cancel}
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {busy && (
            <LoaderCircle
              size={16}
              className="animate-spin"
              aria-hidden="true"
            />
          )}
          {busy ? "Deleting..." : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
