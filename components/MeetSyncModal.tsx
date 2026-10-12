"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Video,
  X,
} from "lucide-react";
import {
  parseMeetSyncInput,
  readMeetSyncResponse,
  type SyncStep,
} from "@/lib/meet-sync-client";
type Stage = "idle" | SyncStep | "success";
type Props = { onSynced?: () => Promise<void> | void };
const steps = [
  {
    stage: "fetching",
    label: "Fetching Drive transcript & Calendar attendees...",
  },
  { stage: "analyzing", label: "AI is extracting decisions and tasks..." },
  { stage: "dispatching", label: "Saving to database & emailing attendees..." },
] as const;
export default function MeetSyncModal({ onSynced }: Props) {
  const router = useRouter();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const busy =
    stage === "fetching" || stage === "analyzing" || stage === "dispatching";
  const locked = busy || stage === "success";
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    inputRef.current?.focus();
    return () => element?.close();
  }, [open]);
  useEffect(
    () => () => {
      abort.current?.abort();
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  useEffect(() => {
    const openRequested = () => {
      if (inFlight.current) return;
      setStage("idle");
      setError("");
      setDraftSaved(false);
      setOpen(true);
    };
    window.addEventListener("meeting-companion:sync", openRequested);
    return () =>
      window.removeEventListener("meeting-companion:sync", openRequested);
  }, []);
  function show() {
    setStage("idle");
    setError("");
    setDraftSaved(false);
    setOpen(true);
  }
  function close() {
    if (!inFlight.current && stage !== "success") setOpen(false);
  }
  async function refreshWorkspace() {
    router.refresh();
    await onSynced?.();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || stage === "success") return;
    setError("");
    setDraftSaved(false);
    let body: ReturnType<typeof parseMeetSyncInput>;
    try {
      body = parseMeetSyncInput(input);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Invalid meeting input.",
      );
      return;
    }
    inFlight.current = true;
    setStage("fetching");
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch("/api/meetings/sync-meet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const { status, result } = await readMeetSyncResponse(response, setStage);
      if (
        status < 200 ||
        status >= 300 ||
        result.ok !== true ||
        !result.meetingId
      ) {
        if (result.proposalsSaved && result.meetingId) {
          setDraftSaved(true);
          try {
            await refreshWorkspace();
          } catch {
            /* The saved draft remains available after a reload. */
          }
        }
        throw new Error(
          result.error ??
            (status === 401
              ? "Sign in before syncing Google Meet."
              : "Sync could not be completed. Retry the same meeting."),
        );
      }
      setStage("success");
      closeTimer.current = setTimeout(() => {
        setOpen(false);
        void refreshWorkspace().catch(() => {});
      }, 2000);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setStage("idle");
      setError(
        cause instanceof Error
          ? cause.message
          : "Connection failed. Retry the same meeting to resume safely.",
      );
    } finally {
      inFlight.current = false;
      abort.current = null;
    }
  }
  const currentIndex = steps.findIndex((step) => step.stage === stage);
  return (
    <>
      <button
        type="button"
        onClick={show}
        className="botanical-primary neon-sync-button"
      >
        <Video size={18} aria-hidden="true" /> Sync Google Meet
      </button>
      {open && (
        <dialog
          ref={dialog}
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-description`}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
        >
          <div className="p-6 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-amber-200">
                  <Video size={23} aria-hidden="true" />
                </span>
                <h2
                  id={`${id}-title`}
                  className="text-xl font-semibold tracking-tight"
                >
                  Sync Google Meet
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close sync modal"
                disabled={locked}
                onClick={close}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <X size={20} />
              </button>
            </div>
            <p
              id={`${id}-description`}
              className="mb-6 text-sm leading-6 text-zinc-400"
            >
              Import an existing transcript from a completed meeting. AI
              proposals stay pending for your review; a recap is emailed to
              Calendar invitees.
            </p>
            <form onSubmit={(event) => void submit(event)} aria-busy={busy}>
              <label
                htmlFor={`${id}-input`}
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Google Calendar Event ID or Google Meet URL
              </label>
              <input
                ref={inputRef}
                id={`${id}-input`}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={locked}
                required
                maxLength={1024}
                autoComplete="off"
                spellCheck={false}
                placeholder="meet.google.com/abc-defg-hij (https:// added automatically)"
                aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
                aria-invalid={Boolean(error)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/10 disabled:opacity-60"
              />
              <p
                id={`${id}-hint`}
                className="mt-2 text-xs leading-5 text-zinc-500"
              >
                Use the Calendar API event ID or a Meet link. Your connected
                Google account must have access to the transcript.
              </p>
              <div className="mt-5" aria-live="polite" aria-atomic="true">
                {busy && (
                  <div
                    role="status"
                    className="flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4 text-sm text-amber-100"
                  >
                    <LoaderCircle
                      size={19}
                      className="shrink-0 animate-spin"
                      aria-hidden="true"
                    />
                    <span>
                      {steps[currentIndex]?.label}
                      <span className="mt-2 block text-xs text-zinc-400">
                        This can take a few minutes. Keep this window open.
                      </span>
                    </span>
                  </div>
                )}
                {stage === "success" && (
                  <div
                    role="status"
                    className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200"
                  >
                    <CheckCircle2 size={20} aria-hidden="true" />
                    Meeting synced successfully!
                  </div>
                )}
              </div>
              {busy && (
                <ol aria-label="Sync progress" className="mt-4 flex gap-2">
                  {steps.map((step, index) => (
                    <li
                      key={step.stage}
                      aria-current={stage === step.stage ? "step" : undefined}
                      className={`h-1 flex-1 rounded-full ${index <= currentIndex ? "bg-amber-300" : "bg-white/10"}`}
                    >
                      <span className="sr-only">{step.label}</span>
                    </li>
                  ))}
                </ol>
              )}
              {error && (
                <div
                  id={`${id}-error`}
                  role="alert"
                  className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-200"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle
                      size={18}
                      className="mt-1 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{error}</span>
                  </div>
                  {draftSaved && (
                    <p className="mt-2 text-xs">
                      Your meeting draft is saved. Retry this same meeting to
                      resume email dispatch.
                    </p>
                  )}
                  <a
                    href="/api/google-workspace/connect"
                    className="mt-3 inline-block font-medium underline underline-offset-4"
                  >
                    Connect or reconnect Google Workspace
                  </a>
                </div>
              )}
              <button
                type="submit"
                disabled={locked || !input.trim()}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-200 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy && (
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                )}
                {stage === "success"
                  ? "Synced"
                  : busy
                    ? "Processing meeting..."
                    : "Fetch & Process"}
              </button>
            </form>
          </div>
        </dialog>
      )}
    </>
  );
}
