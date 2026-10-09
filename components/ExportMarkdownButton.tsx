"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { Meeting, Task } from "@/lib/schemas";
import { meetingMarkdown } from "@/lib/productivity";
export default function ExportMarkdownButton({
  meeting,
  tasks,
}: {
  meeting: Meeting;
  tasks: Task[];
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div>
      <button
        type="button"
        className="secondary"
        onClick={async () => {
          setError("");
          try {
            await navigator.clipboard.writeText(
              meetingMarkdown(meeting, tasks),
            );
            setCopied(true);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 2500);
          } catch {
            setCopied(false);
            setError(
              "Clipboard access failed. Allow clipboard access and try again.",
            );
          }
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Copied Markdown" : "Export to Markdown"}
      </button>
      <span className="sr-only" role="status">
        {copied ? "Meeting recap copied to clipboard." : ""}
      </span>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
