"use client";
import { useState, useEffect, useCallback } from "react";
import {
  AudioLines,
  LayoutDashboard,
  Columns3,
  FileText,
  Plus,
  ArrowUpRight,
  CheckCheck,
  Clock3,
  AlertCircle,
  Menu,
  X,
} from "lucide-react";
import TranscriptInput from "@/components/TranscriptInput";
import TaskReviewList from "@/components/TaskReviewList";
import TaskBoard from "@/components/TaskBoard";
import type { Snapshot, Meeting } from "@/lib/schemas";
type View = "overview" | "board" | "history" | "new" | "review" | "meeting";
export default function Page() {
  const [data, setData] = useState<Snapshot>({
    meetings: [],
    tasks: [],
    ai_configured: false,
  });
  const [view, setView] = useState<View>("overview");
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/meetings", { cache: "no-store" });
      const d = (await r.json()) as Snapshot & { error?: string };
      if (!r.ok) throw new Error(d.error);
      setData(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load meetings.");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh]);
  function navigate(v: View) {
    setView(v);
    setNavOpen(false);
  }
  function openMeeting(id: string) {
    const m = data.meetings.find((m) => m.id === id);
    if (m) {
      setSelected(m);
      navigate(m.review_state === "pending" ? "review" : "meeting");
    }
  }
  const pending = data.meetings.filter((m) => m.review_state === "pending");
  const pendingCount = pending.reduce(
    (n, m) => n + m.analysis.proposed_tasks.length,
    0,
  );
  const completed = data.tasks.filter((t) => t.status === "Completed").length;
  const active = data.tasks.filter((t) =>
    ["To Do", "In Progress", "In Review"].includes(t.status),
  ).length;
  const blocked = data.tasks.filter((t) => t.status === "Blocked").length;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-icon">
            <AudioLines size={24} />
          </span>
          <div>
            stride<span>MEETING COMPANION</span>
          </div>
        </div>
        <div className="workspace-label">D-LAB WORKSPACE</div>
        <nav>
          {(
            [
              ["overview", LayoutDashboard, "Overview"],
              ["board", Columns3, "Action board"],
              ["history", FileText, "Meeting history"],
            ] as const
          ).map(([v, Icon, label]) => (
            <button
              key={v}
              className={view === v ? "active" : ""}
              onClick={() => navigate(v)}
            >
              <Icon size={19} />
              {label}
              {v === "history" && <span>{data.meetings.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="mini-rule" />
          <span className="eyebrow">FROM WORDS TO WORK</span>
          <p>
            A conversation.
            <br />A clear next step.
          </p>
        </div>
        <div className="profile">
          <span>DL</span>
          <div>
            D-Lab Blitz<small>StrideShift Internship</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-toggle icon-button"
            aria-label="Toggle navigation"
            onClick={() => setNavOpen(!navOpen)}
          >
            {navOpen ? <X /> : <Menu />}
          </button>
          <div>
            <span className="topbar-project">Workspace</span>
            <span className="divider">/</span>
            <span>
              {
                {
                  overview: "Overview",
                  board: "Action board",
                  history: "Meeting history",
                  new: "New meeting",
                  review: "Review actions",
                  meeting: "Meeting details",
                }[view]
              }
            </span>
          </div>
          <span className="poc-label">D-LAB / BLITZ POC</span>
        </header>
        <main>
          {error && (
            <div className="error" role="alert">
              {error}{" "}
              <button
                className="text-button"
                onClick={() => void refresh().catch(() => {})}
              >
                Retry
              </button>
            </div>
          )}
          {loading ? (
            <div className="panel empty">Loading your workspace…</div>
          ) : (
            <>
              {view === "overview" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        YOUR MEETINGS, MOVING FORWARD
                      </span>
                      <h1>
                        Less lost in conversation.
                        <br />
                        <span>More getting done.</span>
                      </h1>
                      <p className="muted">
                        Capture the discussion. Review the actions. Keep the
                        work moving.
                      </p>
                    </div>
                    <button className="primary" onClick={() => navigate("new")}>
                      <Plus size={18} /> New meeting
                    </button>
                  </div>
                  <div className="metrics">
                    {[
                      ["Meetings", data.meetings.length, FileText],
                      ["Action items", data.tasks.length, Columns3],
                      ["Pending approval", pendingCount, Clock3],
                      ["Active", active, ArrowUpRight],
                      ["Completed", completed, CheckCheck],
                      ["Blocked", blocked, AlertCircle],
                    ].map(([label, value, Icon]) => {
                      const I = Icon as typeof FileText;
                      return (
                        <div className="metric" key={String(label)}>
                          <div>
                            <span>{String(label)}</span>
                            <I size={17} />
                          </div>
                          <strong>{String(value).padStart(2, "0")}</strong>
                        </div>
                      );
                    })}
                  </div>
                  <div className="overview-grid">
                    <section className="panel meetings-panel">
                      <div className="section-head">
                        <h2>Recent meetings</h2>
                        <button
                          className="text-button"
                          onClick={() => navigate("history")}
                        >
                          View all
                        </button>
                      </div>
                      {data.meetings.length ? (
                        data.meetings.slice(0, 5).map((m) => (
                          <button
                            className="meeting-row"
                            key={m.id}
                            onClick={() => openMeeting(m.id)}
                          >
                            <span className="meeting-icon">
                              <FileText size={20} />
                            </span>
                            <div>
                              <strong>{m.title}</strong>
                              <small>
                                {m.meeting_date} · {m.analysis_source}
                              </small>
                            </div>
                            <span
                              className={`badge ${m.review_state === "pending" ? "pending-badge" : "saved-badge"}`}
                            >
                              {m.review_state === "pending"
                                ? "Needs review"
                                : "Approved"}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="empty">
                          <FileText size={30} />
                          <h3>Your next meeting starts here</h3>
                          <p>
                            Upload a transcript to turn commitments into
                            trackable tasks.
                          </p>
                          <button
                            className="secondary"
                            onClick={() => navigate("new")}
                          >
                            Add your first meeting
                          </button>
                        </div>
                      )}
                    </section>
                    <section className="review-callout">
                      <span className="eyebrow">YOU HAVE THE FINAL SAY</span>
                      <h2>
                        AI proposes.
                        <br />
                        You decide.
                      </h2>
                      <p>
                        Check owners, deadlines and source quotes before
                        approving a task.
                      </p>
                      <div className="callout-number">
                        {String(pendingCount).padStart(2, "0")}
                        <span>
                          actions awaiting
                          <br />
                          your review
                        </span>
                      </div>
                      {pending.length ? (
                        <button
                          className="primary"
                          onClick={() => openMeeting(pending[0].id)}
                        >
                          Review actions
                        </button>
                      ) : (
                        <button
                          className="secondary"
                          onClick={() => navigate("new")}
                        >
                          Capture a meeting
                        </button>
                      )}
                    </section>
                  </div>
                  <section className="pipeline-strip">
                    <span className="eyebrow">THE WORKFLOW</span>
                    <div>
                      <span>
                        <b>01</b> Capture transcript
                      </span>
                      <span>
                        <b>02</b> Review & approve
                      </span>
                      <span>
                        <b>03</b> Track the work
                      </span>
                    </div>
                  </section>
                </>
              )}
              {view === "new" && (
                <TranscriptInput
                  configured={data.ai_configured}
                  onCancel={() => navigate("overview")}
                  onProcessed={(m) => {
                    setSelected(m);
                    navigate("review");
                    void refresh().catch(() => {});
                  }}
                />
              )}
              {view === "review" && selected && (
                <TaskReviewList
                  key={selected.id}
                  meeting={selected}
                  onSaved={async () => {
                    await refresh();
                    navigate("board");
                  }}
                />
              )}
              {view === "board" && (
                <TaskBoard
                  tasks={data.tasks}
                  onUpdated={refresh}
                  onMeeting={openMeeting}
                />
              )}{" "}
              {view === "history" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">THE RECORD</span>
                      <h1>Meeting history</h1>
                      <p className="muted">The context stays with the work.</p>
                    </div>
                    <button className="primary" onClick={() => navigate("new")}>
                      <Plus size={18} /> New meeting
                    </button>
                  </div>
                  <div className="history-grid">
                    {data.meetings.map((m) => (
                      <button
                        className="panel history-card"
                        key={m.id}
                        onClick={() => openMeeting(m.id)}
                      >
                        <div className="inline spread">
                          <span className="eyebrow">{m.meeting_date}</span>
                          <span className="badge">
                            {m.review_state === "pending"
                              ? "Needs review"
                              : "Approved"}
                          </span>
                        </div>
                        <h2>{m.title}</h2>
                        <p>{m.analysis.summary}</p>
                        <small>
                          {
                            data.tasks.filter((t) => t.meeting_id === m.id)
                              .length
                          }{" "}
                          saved tasks · {m.analysis.decisions.length} decisions
                        </small>
                      </button>
                    ))}
                  </div>
                  {!data.meetings.length && (
                    <div className="panel empty">
                      No meetings yet. Add a transcript to start your history.
                    </div>
                  )}
                </>
              )}
              {view === "meeting" && selected && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        SOURCE MEETING · {selected.meeting_date}
                      </span>
                      <h1>{selected.title}</h1>
                    </div>
                  </div>
                  <div className="panel analysis">
                    <span className="eyebrow">SUMMARY</span>
                    <p className="summary">{selected.analysis.summary}</p>
                    <div className="analysis-grid">
                      {(
                        [
                          ["Key points", selected.analysis.key_points],
                          ["Decisions", selected.analysis.decisions],
                          ["Follow-ups", selected.analysis.follow_ups],
                        ] as [string, string[]][]
                      ).map(([k, v]) => (
                        <div key={k}>
                          <h3>{k}</h3>
                          <ul>
                            {v.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                          {!v.length && (
                            <p className="muted">None identified.</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <details>
                      <summary>Read original transcript</summary>
                      <pre className="transcript-source">
                        {selected.transcript}
                      </pre>
                    </details>
                  </div>
                  <div className="linked-tasks">
                    <TaskBoard
                      tasks={data.tasks.filter(
                        (t) => t.meeting_id === selected.id,
                      )}
                      onUpdated={refresh}
                      onMeeting={openMeeting}
                    />
                  </div>
                </>
              )}
            </>
          )}
          <footer>
            STRIDESHIFT <span>MEETING COMPANION / D-LAB BLITZ</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
