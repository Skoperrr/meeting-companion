"use client";
import { memo, useEffect, useId, useRef } from "react";
export type ProcessingPhase =
  "idle" | "fetching" | "analyzing" | "dispatching" | "success" | "error";
function Waveform({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      visible = false,
      focused = document.hasFocus(),
      width = 320,
      height = 120,
      last = 0;
    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      for (let layer = 0; layer < 3; layer++) {
        context.beginPath();
        context.strokeStyle = `rgba(255,255,255,${0.18 + layer * 0.12})`;
        context.lineWidth = 1;
        for (let x = 0; x <= width; x += 3) {
          const envelope = Math.sin((Math.PI * x) / width) ** 2;
          const y =
            height / 2 +
            Math.sin((x / width) * Math.PI * 4 + time / 1400 + layer * 0.65) *
              envelope *
              (16 + layer * 7);
          if (x === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }
    };
    const tick = (time: number) => {
      if (time - last >= 32) {
        draw(time);
        last = time;
      }
      frame = requestAnimationFrame(tick);
    };
    const reconcile = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (active && visible && focused && !document.hidden && !media.matches)
        frame = requestAnimationFrame(tick);
      else if (visible) draw(0);
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      reconcile();
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      reconcile();
    });
    const observer = new ResizeObserver(resize);
    const onFocus = () => {
      focused = true;
      reconcile();
    };
    const onBlur = () => {
      focused = false;
      reconcile();
    };
    intersection.observe(canvas);
    observer.observe(canvas);
    resize();
    document.addEventListener("visibilitychange", reconcile);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    media.addEventListener("change", reconcile);
    return () => {
      cancelAnimationFrame(frame);
      intersection.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", reconcile);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      media.removeEventListener("change", reconcile);
    };
  }, [active]);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="my-6 h-32 w-full"
      width={640}
      height={256}
    />
  );
}
type Props = {
  title: string;
  date: string;
  phase: ProcessingPhase;
  characters?: number;
  decisions?: number;
  tasks?: number;
  onProcess?: () => void;
};
function MeetingSyncCard({
  title,
  date,
  phase,
  characters = 0,
  decisions = 0,
  tasks = 0,
  onProcess,
}: Props) {
  const heading = useId();
  const active = ["fetching", "analyzing", "dispatching"].includes(phase);
  const labels: Record<ProcessingPhase, string> = {
    idle: "Ready to process a meeting",
    fetching: "Fetching transcript and attendees…",
    analyzing: "Extracting decisions and tasks…",
    dispatching: "Saving the meeting…",
    success: `${decisions} decisions · ${tasks} proposed tasks`,
    error: "Processing needs attention",
  };
  return (
    <section aria-labelledby={heading} className="processing-pod craft-pod">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2
          id={heading}
          className="text-xl font-semibold tracking-[-0.02em] text-white"
        >
          Meeting analysis
        </h2>
        {onProcess && (
          <button type="button" className="craft-button" onClick={onProcess}>
            {phase === "success" ? "View meeting" : "Process"}
          </button>
        )}
      </div>
      <div className="mt-8">
        <p className="craft-label">Current meeting</p>
        <h3 className="mt-3 text-[clamp(1.5rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.02em] text-white">
          {title || "Your next conversation"}
        </h3>
        <p className="mt-4 text-sm text-text-secondary">
          {date || "Choose a meeting to begin"}
        </p>
      </div>
      <Waveform active={active} />
      <div className="mt-auto border-t border-white/[.07] pt-6">
        <p className="text-xs text-text-secondary">
          {characters.toLocaleString()} characters
          {characters === 0 ? " · Awaiting transcript" : ""}
        </p>
        {active && (
          <div
            className="my-4 h-1 overflow-hidden rounded bg-white/10"
            aria-hidden="true"
          >
            <div className="craft-processing-indicator h-full w-1/3 bg-white/70" />
          </div>
        )}
        <div
          aria-live="polite"
          aria-atomic="true"
          role="status"
          className="mt-4 min-h-10 text-sm leading-5 text-text-secondary"
        >
          {labels[phase]}
        </div>
      </div>
    </section>
  );
}
export default memo(MeetingSyncCard);
