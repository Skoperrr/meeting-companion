"use client";
import VirtualTaskList from "./VirtualTaskList";
import {
  prefetchMeeting,
  clearMeetingCache,
  cachedMeeting,
} from "@/lib/prefetch";
import DashboardHeader from "./DashboardHeader";
import DashboardOverview from "./DashboardOverview";
import MeetingSyncCard from "./MeetingSyncCard";
import { useState, useCallback } from "react";
import {
  Columns3,
  FileText,
  Plus,
  ArrowUpRight,
  CheckCheck,
  Clock3,
  AlertCircle,
} from "lucide-react";
import SoundToggle from "./SoundToggle";
import MeetSyncModal from "@/components/MeetSyncModal";
import TranscriptInput from "@/components/TranscriptInput";
import TaskReviewList from "@/components/TaskReviewList";
import TaskBoard from "@/components/TaskBoard";
import type { Snapshot, Meeting } from "@/lib/schemas";
import { useRouter } from "next/navigation";
import MeetingDetails from "./MeetingDetails";
import MeetingDeleteButton from "./MeetingDeleteButton";
type View = "overview" | "board" | "history" | "new" | "review" | "meeting";
export default function Workspace({
  initialView,
  email,
  initialData,
}: {
  initialView: "overview" | "board" | "history";
  email: string;
  initialData: Snapshot;
}) {
  const router = useRouter();
  const [data, setData] = useState<Snapshot>(initialData);
  const [view, setView] = useState<View>(initialView);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/meetings", { cache: "no-store" });
      const d = (await r.json()) as Snapshot & { error?: string };
      if (r.status === 401) {
        router.replace("/login");
        throw new Error("Please sign in to continue.");
      }
      if (!r.ok) throw new Error(d.error);
      clearMeetingCache();
      setData(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load meetings.");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [router]);
  function navigate(v: View) {
    const route =
      v === "overview"
        ? "/dashboard"
        : v === "board"
          ? "/tracker"
          : v === "history"
            ? "/meetings"
            : null;
    if (route) router.push(route);
    setView(v);
  }
  function openMeeting(id: string) {
    void prefetchMeeting(id, router.prefetch);
    const local = data.meetings.find((m) => m.id === id);
    const cached = cachedMeeting(id);
    const m =
      cached && (!local || cached.version >= local.version) ? cached : local;
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
    <div className="app-shell luxury-workspace streamlined-workspace">
      <div className="main-shell">
        <DashboardHeader
          completed={completed}
          total={data.tasks.length}
          email={email}
        >
          <div className="luxury-nav-tabs">
            <button
              className={
                view === "overview" ? "luxury-nav-active" : "luxury-filter"
              }
              onClick={() => navigate("overview")}
              aria-current={view === "overview" ? "page" : undefined}
            >
              Dashboard
            </button>
            <button
              className={
                view === "history" ? "luxury-nav-active" : "luxury-filter"
              }
              onClick={() => navigate("history")}
              aria-current={view === "history" ? "page" : undefined}
            >
              Meetings
            </button>
            <button
              className={
                view === "board" ? "luxury-nav-active" : "luxury-filter"
              }
              onClick={() => navigate("board")}
              aria-current={view === "board" ? "page" : undefined}
            >
              Tracker
            </button>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <SoundToggle />
            <MeetSyncModal onSynced={refresh} />
          </div>
        </DashboardHeader>
        <main id="main-content" tabIndex={-1} className="streamlined-main">
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
                <div className="dashboard-stack">
                  <DashboardOverview
                    completed={completed}
                    total={data.tasks.length}
                    onCapture={() => navigate("new")}
                  />
                  <MeetingSyncCard
                    title={data.meetings[0]?.title ?? ""}
                    date={data.meetings[0]?.meeting_date ?? ""}
                    phase={
                      data.meetings[0]
                        ? data.meetings[0].review_state === "pending"
                          ? "review"
                          : "complete"
                        : "idle"
                    }
                    characters={data.meetings[0]?.transcript.length ?? 0}
                    decisions={data.meetings[0]?.analysis.decisions.length ?? 0}
                    tasks={
                      data.meetings[0]?.analysis.proposed_tasks.length ?? 0
                    }
                    onProcess={
                      data.meetings[0]
                        ? () => openMeeting(data.meetings[0].id)
                        : undefined
                    }
                  />
                  <section
                    aria-labelledby="workspace-overview-heading"
                    className="workspace-overview"
                  >
                    <h2
                      id="workspace-overview-heading"
                      className="font-serif text-2xl sm:text-3xl lg:text-4xl tracking-tight text-white"
                    >
                      Your workspace at a glance.
                    </h2>
                    <p className="mt-4 text-sm sm:text-base leading-7 text-text-secondary">
                      Capture the discussion. Review the actions. Keep the work
                      moving.
                    </p>
                    <div className="mt-8">
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
                                <I size={17} aria-hidden="true" />
                              </div>
                              <strong>{String(value).padStart(2, "0")}</strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                </div>
              )}
              {view === "new" && (
                <TranscriptInput
                  draftKey={email}
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
                <div className="space-y-6">
                  <MeetingSyncCard
                    title={selected.title}
                    date={selected.meeting_date}
                    phase="review"
                    characters={selected.transcript.length}
                    decisions={selected.analysis.decisions.length}
                    tasks={selected.analysis.proposed_tasks.length}
                  />
                  <TaskReviewList
                    key={selected.id}
                    meeting={selected}
                    onSaved={async () => {
                      await refresh();
                      navigate("board");
                    }}
                  />
                </div>
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
                    <button
                      className="primary"
                      aria-label="Capture a meeting from a transcript"
                      onClick={() => navigate("new")}
                    >
                      <Plus size={18} aria-hidden="true" /> Capture a Meeting
                    </button>
                  </div>
                  <VirtualTaskList
                    items={data.meetings}
                    getKey={(m) => m.id}
                    label="Meeting history"
                    estimate={290}
                    renderItem={(m) => (
                      <article
                        className="panel history-card"
                        key={m.id}
                        onMouseEnter={() =>
                          void prefetchMeeting(m.id, router.prefetch)
                        }
                        onFocusCapture={() =>
                          void prefetchMeeting(m.id, router.prefetch)
                        }
                      >
                        <button
                          className="w-full text-left"
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
                            saved tasks · {m.analysis.decisions.length}{" "}
                            decisions
                          </small>
                        </button>
                        <div className="mt-4">
                          <MeetingDeleteButton
                            meetingId={m.id}
                            onDeleted={() => {
                              setData((current) => ({
                                ...current,
                                meetings: current.meetings.filter(
                                  (item) => item.id !== m.id,
                                ),
                                tasks: current.tasks.filter(
                                  (task) => task.meeting_id !== m.id,
                                ),
                              }));
                              setSelected(null);
                              setView("overview");
                              void refresh().catch(() => {});
                            }}
                          />
                        </div>
                      </article>
                    )}
                  />
                  {!data.meetings.length && (
                    <div className="panel empty">
                      No meetings yet. Add a transcript to start your history.
                    </div>
                  )}
                </>
              )}
              {view === "meeting" && selected && (
                <MeetingDetails
                  meeting={selected}
                  tasks={data.tasks}
                  onUpdated={refresh}
                  onMeeting={openMeeting}
                  onDeleted={() => {
                    setData((current) => ({
                      ...current,
                      meetings: current.meetings.filter(
                        (m) => m.id !== selected.id,
                      ),
                      tasks: current.tasks.filter(
                        (t) => t.meeting_id !== selected.id,
                      ),
                    }));
                    setSelected(null);
                    setView("overview");
                    void refresh().catch(() => {});
                  }}
                />
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
