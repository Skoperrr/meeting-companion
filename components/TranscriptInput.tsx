"use client";
import { useState, useRef } from "react";
import { FileText, Upload, FlaskConical, Sparkles } from "lucide-react";
import { sampleTranscript } from "@/lib/sample";
import type { Meeting } from "@/lib/schemas";
export default function TranscriptInput({
  configured,
  onProcessed,
  onCancel,
}: {
  configured: boolean;
  onProcessed: (m: Meeting) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [transcript, setTranscript] = useState("");
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(crypto.randomUUID());
  function changed() {
    requestId.current = crypto.randomUUID();
    setDemo(false);
  }
  return (
    <section className="panel input-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">01 / CAPTURE</span>
          <h2>Bring your meeting in.</h2>
        </div>
        <FileText className="teal" size={28} />
      </div>
      <p className="muted">
        Paste the conversation or upload a text file. You’ll review every action
        before it becomes a task.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const r = await fetch("/api/process-transcript", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                meeting_date: date,
                transcript,
                demo,
                request_id: requestId.current,
              }),
            });
            const data = (await r.json()) as Meeting & { error?: string };
            if (!r.ok) throw new Error(data.error);
            onProcessed(data);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Processing failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Meeting title
            <input
              required
              maxLength={200}
              value={title}
              onChange={(e) => {
                changed();
                setTitle(e.target.value);
              }}
              placeholder="e.g. Product sprint planning"
            />
          </label>
          <label>
            Meeting date
            <input
              required
              type="date"
              value={date}
              onChange={(e) => {
                changed();
                setDate(e.target.value);
              }}
            />
          </label>
        </div>
        <div className="transcript-label">
          <label htmlFor="transcript">Transcript</label>
          <label className="upload">
            <Upload size={15} /> Upload .txt
            <input
              type="file"
              accept=".txt,text/plain"
              disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (!f.name.toLowerCase().endsWith(".txt") || f.size > 100000) {
                  setError("Choose a .txt file smaller than 100 KB.");
                  return;
                }
                changed();
                setTranscript(await f.text());
                setError("");
              }}
            />
          </label>
        </div>
        <textarea
          id="transcript"
          required
          minLength={20}
          maxLength={100000}
          rows={12}
          value={transcript}
          onChange={(e) => {
            changed();
            setTranscript(e.target.value);
          }}
          placeholder="Maya: I’ll prepare the prototype by Friday…"
        />
        <div className="input-meta">
          <span>{transcript.length.toLocaleString()} / 100,000 characters</span>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => {
              requestId.current = crypto.randomUUID();
              setTitle("D-Lab product sync");
              setDate("2026-10-09");
              setTranscript(sampleTranscript);
              setDemo(true);
              setError("");
            }}
          >
            <FlaskConical size={15} /> Load test transcript
          </button>
        </div>
        {demo ? (
          <div className="notice">
            Sample walkthrough: uses the bundled expected JSON, with real
            database persistence. No AI request is made.
          </div>
        ) : !configured ? (
          <div className="notice">
            AI requires a server-side GEMINI_API_KEY. You can try the full
            review and tracking flow using the test transcript.
          </div>
        ) : null}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button className="primary" disabled={busy || (!demo && !configured)}>
            <Sparkles size={17} />
            {busy
              ? "Analysing transcript…"
              : demo
                ? "Run sample walkthrough"
                : "Analyse meeting"}
          </button>
        </div>
      </form>
    </section>
  );
}
