"use client";
import { useEffect, useRef, useState } from "react";
import { Download, ChevronDown } from "lucide-react";
import type { Meeting, Task } from "@/lib/schemas";
import { emailDigest, slackDigest, taskCsv } from "@/lib/digest-export";
export default function MeetingExportMenu({
  meeting,
  tasks: allTasks,
}: {
  meeting: Meeting;
  tasks: Task[];
}) {
  const tasks = allTasks.filter((task) => task.meeting_id === meeting.id);
  const ref = useRef<HTMLDetailsElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node))
        ref.current?.removeAttribute("open");
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        ref.current?.removeAttribute("open");
        ref.current?.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", escape);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  async function copy(format: "slack" | "email") {
    ref.current?.removeAttribute("open");
    setError("");
    try {
      const text = slackDigest(meeting, tasks);
      if (format === "email") {
        if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined")
          throw new Error(
            "Rich HTML copying is unavailable in this browser. Use Copy for Slack or download CSV.",
          );
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([emailDigest(meeting, tasks)], {
              type: "text/html",
            }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
      } else await navigator.clipboard.writeText(text);
      setMessage("Copied to clipboard!");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(""), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clipboard access failed.");
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([taskCsv(tasks)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting-${meeting.id}-tasks.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ref.current?.removeAttribute("open");
  }
  return (
    <div className="relative">
      <details ref={ref} className="relative">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800">
          <Download size={16} />
          Export digest
          <ChevronDown size={14} />
        </summary>
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-white/10 bg-zinc-950 p-1.5 text-sm text-zinc-100 shadow-2xl">
          {(["slack", "email"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => void copy(f)}
              className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/10 focus-visible:bg-white/10"
            >
              Copy for {f === "slack" ? "Slack" : "Email"}
            </button>
          ))}
          <button
            type="button"
            onClick={download}
            className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/10"
          >
            Download as CSV
          </button>
        </div>
      </details>
      {message && (
        <div
          role="status"
          className="absolute right-0 top-full z-40 mt-2 whitespace-nowrap rounded-lg bg-emerald-950 px-3 py-2 text-xs text-emerald-200 shadow-lg"
        >
          {message}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 max-w-xs text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
