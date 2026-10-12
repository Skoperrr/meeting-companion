"use client";
import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { fluidEase } from "@/lib/motion";
export type ProcessingPhase =
  "idle" | "fetching" | "analyzing" | "dispatching" | "success" | "error";
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
  const gradient = useId();
  const active = ["fetching", "analyzing", "dispatching"].includes(phase);
  const labels: Record<ProcessingPhase, string> = {
    idle: "Ready for your conversation",
    fetching: "Reading the conversation",
    analyzing: "Finding decisions and commitments",
    dispatching: "Saving your meeting",
    success: `${decisions} decisions · ${tasks} proposed tasks`,
    error: "Processing needs attention",
  };
  return (
    <section
      aria-label="Meeting processing"
      className="processing-pod rounded-3xl border border-border-subtle bg-surface-base p-6"
    >
      <span className="text-[10px] uppercase tracking-[.2em] text-text-secondary">
        Meeting Analysis & Sync
      </span>
      <h2 className="mt-6 font-serif text-3xl font-normal text-white">
        {title || "A conversation, made clear."}
      </h2>
      <p className="mt-3 text-xs text-text-secondary">
        {date || "Choose a meeting date"}
      </p>
      <svg viewBox="0 0 360 100" className="my-6 w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gradient}>
            <stop stopColor="#FFFFFF" stopOpacity=".15" />
            <stop offset=".5" stopColor="#3B82F6" stopOpacity=".8" />
            <stop offset="1" stopColor="#6366F1" stopOpacity=".35" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((index) => (
          <motion.path
            key={index}
            d={`M0 50 C45 ${10 + index * 10},70 ${90 - index * 8},120 50 S190 ${10 + index * 8},240 50 S315 ${90 - index * 10},360 50`}
            stroke={`url(#${gradient})`}
            style={{ stroke: `url(#${gradient})` }}
            strokeWidth="1"
            fill="none"
            initial={false}
            animate={
              active && !reduced
                ? { opacity: [0.25, 0.8, 0.25], y: [-3, 3, -3] }
                : { opacity: 0.3, y: 0 }
            }
            transition={{
              duration: 3.6,
              repeat: active && !reduced ? Infinity : 0,
              delay: index * 0.3,
              ease: fluidEase,
            }}
          />
        ))}
      </svg>
      <div
        role="status"
        aria-live="polite"
        className="rounded-full border border-border-focus px-3 py-2 text-xs text-text-secondary"
      >
        {labels[phase]}
      </div>
      <p className="mt-4 text-xs text-text-secondary">
        {characters.toLocaleString()} transcript characters
      </p>
      {onProcess && (
        <button type="button" className="secondary mt-4" onClick={onProcess}>
          View meeting
        </button>
      )}
      <div
        role="progressbar"
        aria-label="Meeting processing stage"
        aria-valuetext={labels[phase]}
        className="mt-5 grid grid-cols-3 gap-2"
      >
        {["Capture", "Extract", "Review"].map((step, index) => (
          <span
            key={step}
            className={`h-1 rounded ${phase === "success" || (active && index <= (phase === "fetching" ? 0 : 1)) ? "bg-accent-blue" : "bg-white/10"}`}
          />
        ))}
      </div>
      <ol className="mt-5 grid grid-cols-3 gap-2 text-[9px] uppercase tracking-wider text-text-secondary">
        {["Capture", "Extract", "Review"].map((step, index) => (
          <li key={step}>
            <div
              className={`mb-2 h-px ${phase === "success" || (active && index < (phase === "fetching" ? 1 : 2)) ? "bg-white" : "bg-white/10"}`}
            />
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}
