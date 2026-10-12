"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
export type ProcessingPhase =
  | "idle"
  | "fetching"
  | "analyzing"
  | "dispatching"
  | "success"
  | "review"
  | "complete"
  | "error";
export default function MeetingSyncCard({
  title,
  date,
  phase,
  characters = 0,
  decisions = 0,
  tasks = 0,
  onProcess,
}: {
  title: string;
  date: string;
  phase: ProcessingPhase;
  characters?: number;
  decisions?: number;
  tasks?: number;
  onProcess?: () => void;
}) {
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [syncPhase, setSyncPhase] = useState<ProcessingPhase | null>(null);
  useEffect(() => {
    const receive = (event: Event) => {
      const next = (event as CustomEvent<ProcessingPhase | null>).detail;
      setSyncPhase(next);
    };
    window.addEventListener("meeting-companion:processing", receive);
    return () =>
      window.removeEventListener("meeting-companion:processing", receive);
  }, []);
  const currentPhase = syncPhase ?? phase;
  const step =
    currentPhase === "review" ||
    currentPhase === "success" ||
    currentPhase === "complete"
      ? 2
      : currentPhase === "analyzing" || currentPhase === "dispatching"
        ? 1
        : 0;
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    let frame = 0;
    let visible = true;
    let time = 0;
    let last = 0;
    const draw = (stamp: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      time += last ? Math.min(stamp - last, 50) / 1000 : 0;
      last = stamp;
      const width = element.clientWidth;
      const height = 120;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (
        element.width !== Math.round(width * ratio) ||
        element.height !== height * ratio
      ) {
        element.width = Math.round(width * ratio);
        element.height = height * ratio;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const busy = ["fetching", "analyzing", "dispatching"].includes(
        currentPhase,
      );
      for (let layer = 0; layer < 3; layer++) {
        const gradient = context.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "rgba(255,255,255,0.08)");
        gradient.addColorStop(
          0.5,
          layer === 1 ? "rgba(99,102,241,.75)" : "rgba(59,130,246,.65)",
        );
        gradient.addColorStop(1, "rgba(255,255,255,0.08)");
        context.strokeStyle = gradient;
        context.lineWidth = 1.5;
        context.beginPath();
        for (let x = 0; x <= width; x += 3) {
          const envelope = Math.sin((Math.PI * x) / Math.max(width, 1));
          const y =
            60 +
            Math.sin(
              (x / Math.max(width, 1)) * Math.PI * 6 +
                time * (busy ? 2.8 : 0.9) +
                layer * 1.4,
            ) *
              envelope *
              (busy ? 30 : 14) *
              (1 - layer * 0.18);
          if (!x) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    const resume = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (visible && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", resume);
    resume();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", resume);
    };
  }, [currentPhase, reduced]);
  const headingId = useId();
  const active = ["fetching", "analyzing", "dispatching"].includes(
    currentPhase,
  );
  const labels: Record<ProcessingPhase, string> = {
    idle: "Ready for your conversation",
    fetching: "Reading the conversation",
    analyzing: "Finding decisions and commitments",
    dispatching: "Saving your meeting",
    success: `${decisions} decisions · ${tasks} proposed tasks`,
    review: "Extraction complete · Ready for human review",
    complete: "Review complete · Approved tasks saved",
    error: "Processing needs attention",
  };
  return (
    <section
      aria-labelledby={headingId}
      className="processing-pod rounded-3xl border border-border-subtle bg-surface-base p-6"
    >
      <span className="text-[10px] uppercase tracking-[.2em] text-text-secondary">
        Meeting Analysis & Sync
      </span>
      <h2
        id={headingId}
        className="mt-6 font-serif text-2xl sm:text-3xl font-normal text-white"
      >
        {title || "A conversation, made clear."}
      </h2>
      <p className="mt-3 text-xs text-text-secondary">
        {date || "Choose a meeting date"}
      </p>
      <canvas
        ref={canvas}
        className="my-6 h-[120px] w-full"
        aria-hidden="true"
      />
      <div
        role="status"
        aria-live="polite"
        className="rounded-full border border-border-focus px-3 py-2 text-xs text-text-secondary"
      >
        {labels[currentPhase]}
      </div>
      <p className="mt-4 text-xs text-text-secondary">
        {characters.toLocaleString()} transcript characters
      </p>
      {onProcess && (
        <button type="button" className="secondary mt-4" onClick={onProcess}>
          View meeting
        </button>
      )}
      <ol
        aria-label="Meeting analysis workflow"
        className="mt-5 grid grid-cols-3 gap-3"
      >
        {["Capture", "Extract", "Review"].map((label, index) => {
          const done = currentPhase === "complete" || index < step;
          const selected = index === step && currentPhase !== "complete";
          return (
            <li
              key={label}
              aria-current={selected ? "step" : undefined}
              className="min-w-0"
            >
              <div
                className={`mb-3 h-1 rounded ${done || selected ? "bg-blue-500" : "bg-white/10"}`}
              />
              <span
                className={`text-xs font-semibold ${selected ? "text-white" : "text-slate-300"}`}
              >
                {label}
              </span>
              <p className="mt-1 text-xs text-slate-300">
                {done
                  ? "Done"
                  : selected
                    ? currentPhase === "error"
                      ? "Needs attention"
                      : active
                        ? "In progress"
                        : currentPhase === "review" ||
                            currentPhase === "success"
                          ? "Awaiting approval"
                          : "Ready"
                    : "Waiting"}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
