"use client";
import type { Meeting, Task } from "@/lib/schemas";
import MeetingExportMenu from "./MeetingExportMenu";
import MeetingDeleteButton from "./MeetingDeleteButton";
import TaskBoard from "./TaskBoard";
export default function MeetingDetails({
  meeting,
  tasks,
  onUpdated,
  onMeeting,
  onDeleted,
}: {
  meeting: Meeting;
  tasks: Task[];
  onUpdated: () => Promise<void>;
  onMeeting: (id: string) => void;
  onDeleted: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            SOURCE MEETING · {meeting.meeting_date}
          </span>
          <h1>{meeting.title}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <MeetingExportMenu meeting={meeting} tasks={tasks} />
          <MeetingDeleteButton meetingId={meeting.id} onDeleted={onDeleted} />
        </div>
      </div>
      <div className="panel analysis">
        <span className="eyebrow">SUMMARY</span>
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
              <ul>
                {items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              {!items.length && <p className="muted">None identified.</p>}
            </div>
          ))}
        </div>
        <details>
          <summary>Read original transcript</summary>
          <pre className="transcript-source">{meeting.transcript}</pre>
        </details>
      </div>
      <div className="linked-tasks">
        <TaskBoard
          tasks={tasks.filter((task) => task.meeting_id === meeting.id)}
          onUpdated={onUpdated}
          onMeeting={onMeeting}
        />
      </div>
    </>
  );
}
