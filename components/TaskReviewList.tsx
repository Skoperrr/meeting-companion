"use client";
import { useState } from "react";
import { Check, Quote, Trash2 } from "lucide-react";
import type { Meeting, Proposal } from "@/lib/schemas";
import { priorities } from "@/lib/schemas";
import QuoteModal from "./QuoteModal";
export default function TaskReviewList({
  meeting,
  onSaved,
}: {
  meeting: Meeting;
  onSaved: () => Promise<void>;
}) {
  const [rows, setRows] = useState(
    meeting.analysis.proposed_tasks.map((t, i) => ({
      ...t,
      proposal_index: i,
      approved: true,
      deleted: false,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<Proposal | null>(null);
  const selected = rows.filter((t) => t.approved && !t.deleted);
  function edit(i: number, key: keyof Proposal, value: string) {
    setRows((r) =>
      r.map((t) => (t.proposal_index === i ? { ...t, [key]: value } : t)),
    );
  }
  return (
    <section>
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
        <p className="summary">{meeting.analysis.summary}</p>
        <div className="analysis-grid">
          {(
            [
              ["Key points", meeting.analysis.key_points],
              ["Decisions", meeting.analysis.decisions],
              ["Follow-ups", meeting.analysis.follow_ups],
            ] as [string, string[]][]
          ).map(([label, items]) => (
            <div key={label}>
              <h3>{label}</h3>
              {items.length ? (
                <ul>
                  {items.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">None identified.</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="section-head review-heading">
        <h3>Proposed action items</h3>
        <span className="muted">{selected.length} selected for approval</span>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const r = await fetch(`/api/meetings/${meeting.id}/approve`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tasks: selected.map(({ approved, deleted, ...t }) => t),
              }),
            });
            if (!r.ok)
              throw new Error(((await r.json()) as { error: string }).error);
            await onSaved();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Saving failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {rows
          .filter((t) => !t.deleted)
          .map((t) => (
            <div
              className={`panel proposal ${t.approved ? "selected" : ""}`}
              key={t.proposal_index}
            >
              <div className="proposal-top">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={t.approved}
                    onChange={(e) =>
                      setRows((r) =>
                        r.map((x) =>
                          x.proposal_index === t.proposal_index
                            ? { ...x, approved: e.target.checked }
                            : x,
                        ),
                      )
                    }
                  />{" "}
                  Approve action {t.proposal_index + 1}
                </label>
                <div className="inline">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setQuote(t)}
                  >
                    <Quote size={15} /> Evidence
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Reject proposed task"
                    onClick={() =>
                      setRows((r) =>
                        r.map((x) =>
                          x.proposal_index === t.proposal_index
                            ? { ...x, deleted: true }
                            : x,
                        ),
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <label>
                Task title
                <input
                  required={t.approved}
                  maxLength={250}
                  value={t.title}
                  onChange={(e) =>
                    edit(t.proposal_index, "title", e.target.value)
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  required={t.approved}
                  maxLength={4000}
                  rows={2}
                  value={t.description}
                  onChange={(e) =>
                    edit(t.proposal_index, "description", e.target.value)
                  }
                />
              </label>
              <div className="form-grid three">
                <label>
                  Assignee
                  <input
                    required={t.approved}
                    maxLength={150}
                    value={t.assigned_to}
                    onChange={(e) =>
                      edit(t.proposal_index, "assigned_to", e.target.value)
                    }
                  />
                </label>
                <label>
                  Deadline
                  <input
                    required={t.approved}
                    maxLength={150}
                    value={t.due_date}
                    onChange={(e) =>
                      edit(t.proposal_index, "due_date", e.target.value)
                    }
                  />
                </label>
                <label>
                  Priority
                  <select
                    value={t.priority}
                    onChange={(e) =>
                      edit(t.proposal_index, "priority", e.target.value)
                    }
                  >
                    {priorities.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="approval-footer">
          <p>
            Only selected tasks will be saved. Source excerpts stay attached.
          </p>
          <button className="primary" disabled={busy}>
            <Check size={17} />
            {busy
              ? "Saving…"
              : `Confirm & save ${selected.length} approved tasks`}
          </button>
        </div>
      </form>
      {quote && (
        <QuoteModal
          title={quote.title}
          quote={quote.transcript_quote}
          onClose={() => setQuote(null)}
        />
      )}
    </section>
  );
}
