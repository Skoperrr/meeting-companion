"use client";

import BatchActionBar from "./BatchActionBar";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import TypewriterSummary from "./TypewriterSummary";
import { Check, CheckCheck, FileText, Quote, RotateCcw, X } from "lucide-react";
import {
  approvalSchema,
  priorities,
  type Meeting,
  type Proposal,
} from "@/lib/schemas";

type EditableFields = Pick<
  Proposal,
  "title" | "description" | "assigned_to" | "due_date" | "priority"
>;
type StagedTask = Proposal & { proposal_index: number; approved: boolean };
type Props = { meeting: Meeting; onSaved: () => Promise<void> };

const fieldClass =
  "!rounded-lg !border-[#dbd5c9] !bg-[#fffefb] !text-sm !text-[#1c2b3c] focus:!outline-[#537d9f]";
const actionClass =
  "inline-flex items-center justify-center gap-2 rounded-lg !border !border-[#dbd5c9] !bg-[#fffefb] px-3 py-2 text-sm font-medium !text-[#22374e] hover:!bg-[#ede9e1] disabled:opacity-50";

// Keying the inner stage prevents edits leaking into a different meeting.
export default function TaskReviewList(props: Props) {
  return (
    <ReviewStage
      key={`${props.meeting.id}:${props.meeting.version}`}
      {...props}
    />
  );
}

function ReviewStage({ meeting, onSaved }: Props) {
  const [rows, setRows] = useState<StagedTask[]>(() =>
    meeting.analysis.proposed_tasks.map((task, index) => ({
      ...task,
      assigned_to: task.assigned_to || "Unassigned",
      due_date: task.due_date || "Not specified",
      proposal_index: index,
      approved: true,
    })),
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLElement>(null);
  const approved = rows.filter((task) => task.approved);
  const activeTask = rows.find((task) => task.proposal_index === activeIndex);
  const quoteRange = useMemo(() => {
    const quote = activeTask?.transcript_quote;
    if (!quote) return null;
    const start = meeting.transcript.indexOf(quote);
    return start < 0 ? null : { start, end: start + quote.length };
  }, [activeTask?.transcript_quote, meeting.transcript]);

  function scrollToEvidence() {
    const panel = transcriptRef.current;
    const mark = highlightRef.current;
    if (!panel || !mark) return;
    const panelRect = panel.getBoundingClientRect();
    const markRect = mark.getBoundingClientRect();
    if (
      markRect.top >= panelRect.top + 20 &&
      markRect.bottom <= panelRect.bottom - 20
    )
      return;
    const top =
      panel.scrollTop +
      markRect.top -
      panelRect.top -
      Math.max(20, (panel.clientHeight - markRect.height) / 2);
    panel.scrollTo({
      top: Math.max(0, top),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  useEffect(() => {
    scrollToEvidence();
  }, [activeIndex, quoteRange]);

  function selectEvidence(index: number) {
    if (index === activeIndex) scrollToEvidence();
    else setActiveIndex(index);
  }
  function updateField<K extends keyof EditableFields>(
    index: number,
    key: K,
    value: EditableFields[K],
  ) {
    setRows((previous) =>
      previous.map((task) =>
        task.proposal_index === index
          ? {
              ...task,
              [key]: value,
              ...(key === "assigned_to" ? { assigned_email: null } : {}),
            }
          : task,
      ),
    );
  }
  function setApproval(index: number, value: boolean) {
    setRows((previous) =>
      previous.map((task) =>
        task.proposal_index === index ? { ...task, approved: value } : task,
      ),
    );
  }
  function resetEdits(index: number) {
    const original = meeting.analysis.proposed_tasks[index];
    if (!original) return;
    setRows((previous) =>
      previous.map((task) =>
        task.proposal_index === index
          ? {
              ...task,
              ...original,
              assigned_to: original.assigned_to || "Unassigned",
              due_date: original.due_date || "Not specified",
            }
          : task,
      ),
    );
  }
  function isEdited(task: StagedTask) {
    const original = meeting.analysis.proposed_tasks[task.proposal_index];
    return (
      task.title !== original.title ||
      task.description !== original.description ||
      task.assigned_to !== (original.assigned_to || "Unassigned") ||
      task.due_date !== (original.due_date || "Not specified") ||
      task.priority !== original.priority
    );
  }
  async function commit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const payload = approvalSchema.safeParse({
      version: meeting.version,
      tasks: approved.map((task) => ({
        proposal_index: task.proposal_index,
        title: task.title,
        description: task.description,
        assigned_to: task.assigned_to,
        assigned_email: task.assigned_email ?? null,
        due_date: task.due_date,
        priority: task.priority,
        transcript_quote: task.transcript_quote,
      })),
    });
    if (!payload.success) {
      setError(
        "Check the approved tasks: title, description, assignee and deadline must contain text.",
      );
      return;
    }
    savingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/meetings/${encodeURIComponent(meeting.id)}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload.data),
        },
      );
      if (!response.ok) {
        const body: unknown = await response.json();
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Unable to save approved tasks. Please try again.";
        throw new Error(message);
      }
      await onSaved();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Saving failed. Your edits are still here.",
      );
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="review-stage">
      <div className="section-head">
        <div>
          <span className="eyebrow">
            02 / HUMAN REVIEW · {meeting.analysis_source}
          </span>
          <h2>{meeting.title}</h2>
          <p className="muted">
            {meeting.meeting_date} · {rows.length} proposed actions
          </p>
        </div>
      </div>
      <div className="panel analysis">
        <span className="eyebrow">MEETING SUMMARY</span>
        <TypewriterSummary text={meeting.analysis.summary} />
        <details className="!mt-0 !border-0 !pt-0">
          <summary className="text-sm font-medium">
            Key points, decisions & follow-ups
          </summary>
          <div className="analysis-grid !mt-4">
            {(
              [
                ["Key points", meeting.analysis.key_points],
                ["Decisions", meeting.analysis.decisions],
                ["Follow-ups", meeting.analysis.follow_ups],
              ] satisfies [string, string[]][]
            ).map(([label, items]) => (
              <div key={label}>
                <h3>{label}</h3>
                {items.length ? (
                  <ul>
                    {items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">None identified.</p>
                )}
              </div>
            ))}
          </div>
        </details>
      </div>
      <form onSubmit={commit}>
        <fieldset disabled={busy} className="min-w-0 border-0 p-0">
          <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <section
              aria-labelledby="transcript-heading"
              className="min-w-0 overflow-hidden rounded-2xl border border-[#e2ddd2] bg-[#fbfaf7] xl:sticky xl:top-5"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#e2ddd2] px-5 py-4">
                <h3 id="transcript-heading" className="flex items-center gap-2">
                  <FileText size={18} className="text-[#537d9f]" />
                  Original transcript
                </h3>
                <span className="text-xs text-[#687586]">SOURCE OF TRUTH</span>
              </div>
              <div
                ref={transcriptRef}
                tabIndex={0}
                aria-label="Original meeting transcript"
                className="max-h-[40vh] overflow-y-auto overscroll-contain p-5 text-base leading-8 text-[#3c4b5c] focus-visible:outline-2 focus-visible:outline-[#537d9f] xl:h-[65vh] xl:max-h-[780px]"
              >
                <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {quoteRange ? (
                    <>
                      {meeting.transcript.slice(0, quoteRange.start)}
                      <mark
                        ref={highlightRef}
                        className="rounded-sm bg-amber-200 px-0.5 py-0.5 text-[#49370e] shadow-[0_0_0_2px_#fde68a]"
                      >
                        {meeting.transcript.slice(
                          quoteRange.start,
                          quoteRange.end,
                        )}
                      </mark>
                      {meeting.transcript.slice(quoteRange.end)}
                    </>
                  ) : (
                    meeting.transcript
                  )}
                </div>
              </div>
              <div
                className="border-t border-[#e2ddd2] px-5 py-3 text-sm text-[#596674]"
                role="status"
                aria-live="polite"
              >
                {activeTask
                  ? quoteRange
                    ? `Highlighting evidence for action ${activeTask.proposal_index + 1}.`
                    : "This quote has no exact match in the transcript."
                  : "Hover, focus or click an action to locate its evidence."}
              </div>
            </section>
            <section
              aria-labelledby="proposals-heading"
              className="min-w-0 overflow-hidden rounded-2xl border border-[#e2ddd2] bg-[#f0ede6]"
            >
              <div className="space-y-3 border-b border-[#e2ddd2] bg-[#fbfaf7] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 id="proposals-heading">Proposed actions</h3>
                  <span
                    aria-live="polite"
                    className="rounded-full bg-[#e0eaf3] px-3 py-1 text-sm text-[#223e59]"
                  >
                    Approved {approved.length} of {rows.length} tasks
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={actionClass}
                    disabled={!rows.length}
                    onClick={() =>
                      setRows((previous) =>
                        previous.map((task) => ({ ...task, approved: true })),
                      )
                    }
                  >
                    <CheckCheck size={16} />
                    Approve All
                  </button>
                  <button
                    type="button"
                    className={actionClass}
                    disabled={!rows.length}
                    onClick={() =>
                      setRows((previous) =>
                        previous.map((task) => ({ ...task, approved: false })),
                      )
                    }
                  >
                    <X size={16} />
                    Reject All
                  </button>
                </div>
              </div>
              <div
                tabIndex={0}
                aria-label="Proposed task list"
                className="space-y-4 overflow-y-auto overscroll-contain p-4 focus-visible:outline-2 focus-visible:outline-[#537d9f] xl:max-h-[65vh]"
              >
                {!rows.length && (
                  <div className="rounded-xl bg-[#fbfaf7] p-6 text-sm text-[#596674]">
                    No actionable commitments were found. You can finish the
                    review without creating tasks.
                  </div>
                )}
                {rows.map((task) => {
                  const index = task.proposal_index;
                  const edited = isEdited(task);
                  return (
                    <article
                      key={index}
                      style={{
                        animationDelay: `${Math.min(index, 12) * 70}ms`,
                      }}
                      onMouseEnter={() => selectEvidence(index)}
                      onClick={() => selectEvidence(index)}
                      onFocusCapture={() => selectEvidence(index)}
                      className={`review-arrival min-w-0 rounded-xl border bg-[#fbfaf7] p-4 shadow-sm ${activeIndex === index ? "border-[#537d9f] ring-2 ring-[#537d9f]/20" : "border-[#ded8cd]"}`}
                    >
                      <label className="mb-3 flex items-center gap-2 text-xs text-botanical-muted">
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={selected.has(index)}
                          onChange={(e) =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (e.target.checked) next.add(index);
                              else next.delete(index);
                              return next;
                            })
                          }
                        />
                        Select for batch actions
                      </label>
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <label className="flex !items-center gap-2 !text-sm !font-semibold !text-[#22374e]">
                          <input
                            type="checkbox"
                            checked={task.approved}
                            onChange={(event) =>
                              setApproval(index, event.target.checked)
                            }
                            aria-label={`Approve action ${index + 1}`}
                          />
                          Action {index + 1}
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${task.approved ? "bg-[#e2f4e9] text-[#367155]" : "bg-[#ede9e1] text-[#687586]"}`}
                          >
                            {task.approved ? "Approved" : "Rejected"}
                          </span>
                        </label>
                        <button
                          type="button"
                          className="text-button"
                          disabled={!edited}
                          onClick={() => resetEdits(index)}
                          aria-label={`Reset action ${index + 1} to AI output`}
                        >
                          <RotateCcw size={14} />
                          Undo edits
                        </button>
                      </div>
                      <div className="space-y-3">
                        <label htmlFor={`task-${index}-title`}>
                          Task title
                          <input
                            id={`task-${index}-title`}
                            required={task.approved}
                            maxLength={250}
                            className={fieldClass}
                            value={task.title}
                            onChange={(event) =>
                              updateField(index, "title", event.target.value)
                            }
                          />
                        </label>
                        <label htmlFor={`task-${index}-description`}>
                          Description
                          <textarea
                            id={`task-${index}-description`}
                            required={task.approved}
                            maxLength={4000}
                            rows={2}
                            className={fieldClass}
                            value={task.description}
                            onChange={(event) =>
                              updateField(
                                index,
                                "description",
                                event.target.value,
                              )
                            }
                          />
                        </label>
                        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                          <label htmlFor={`task-${index}-owner`}>
                            Assignee
                            <input
                              id={`task-${index}-owner`}
                              required={task.approved}
                              maxLength={150}
                              className={fieldClass}
                              value={task.assigned_to}
                              onChange={(event) =>
                                updateField(
                                  index,
                                  "assigned_to",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <label htmlFor={`task-${index}-deadline`}>
                            Deadline
                            <input
                              id={`task-${index}-deadline`}
                              required={task.approved}
                              maxLength={150}
                              className={fieldClass}
                              value={task.due_date}
                              onChange={(event) =>
                                updateField(
                                  index,
                                  "due_date",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                        </div>
                        <label htmlFor={`task-${index}-priority`}>
                          Priority
                          <select
                            id={`task-${index}-priority`}
                            className={fieldClass}
                            value={task.priority}
                            onChange={(event) => {
                              const priority = priorities.find(
                                (value) => value === event.target.value,
                              );
                              if (priority)
                                updateField(index, "priority", priority);
                            }}
                          >
                            {priorities.map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => selectEvidence(index)}
                          className="flex w-full items-start gap-2 rounded-lg !bg-[#edf2f6] p-3 text-left text-sm leading-6 !text-[#466b8c]"
                          aria-controls="transcript-heading"
                        >
                          <Quote size={16} className="mt-1 shrink-0" />
                          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                            {task.transcript_quote}
                          </span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="error !mt-5">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-xl border border-[#e2ddd2] bg-[#fbfaf7] p-5 sm:flex-row sm:items-center">
          <p className="text-sm leading-6 text-[#596674]">
            {approved.length
              ? "Only approved tasks will be saved, with their original source evidence."
              : "Committing with zero approvals finishes this review without creating tasks."}
          </p>
          <button type="submit" className="primary shrink-0" disabled={busy}>
            <Check size={17} />
            {busy
              ? "Saving approved tasks…"
              : `Commit Approved Tasks (${approved.length})`}
          </button>
        </div>
        <BatchActionBar
          count={rows.filter((row) => selected.has(row.proposal_index)).length}
          assignees={rows.map((row) => row.assigned_to)}
          disabled={busy}
          onClear={() => setSelected(new Set())}
          onApprove={() => {
            setRows((current) =>
              current.map((row) =>
                selected.has(row.proposal_index)
                  ? { ...row, approved: true }
                  : row,
              ),
            );
            setSelected(new Set());
          }}
          onAssign={(name) => {
            setRows((current) =>
              current.map((row) =>
                selected.has(row.proposal_index)
                  ? { ...row, assigned_to: name, assigned_email: null }
                  : row,
              ),
            );
            setSelected(new Set());
          }}
          onDelete={() => {
            setRows((current) =>
              current.filter((row) => !selected.has(row.proposal_index)),
            );
            setSelected(new Set());
          }}
        />
      </form>
    </section>
  );
}
