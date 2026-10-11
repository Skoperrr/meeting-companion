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
    idle: "Ready to process a meeting",
    fetching: "Fetching transcript & attendees…",
    analyzing: "Extracting decisions & tasks…",
    dispatching: "Saving the meeting…",
    success: `${decisions} Decisions & ${tasks} Proposed Tasks`,
    error: "Processing needs attention",
  };
  const progress =
    phase === "success"
      ? 100
      : phase === "dispatching"
        ? 85
        : phase === "analyzing"
          ? 55
          : phase === "fetching"
            ? 20
            : 0;
  return (
    <section
      aria-label="Meeting analysis and sync"
      className="processing-pod luxury-pod"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl text-white">
          Meeting Analysis &amp; Sync
        </h2>
        {onProcess ? (
          <button className="luxury-filter" onClick={onProcess}>
            Process
          </button>
        ) : (
          <span className="luxury-filter">
            {active ? "Processing" : "Analysis"}
          </span>
        )}
      </div>
      <div className="mt-10">
        <p className="text-xs text-text-secondary">Current meeting</p>
        <h3 className="mt-3 font-serif text-3xl leading-tight text-white">
          {title || "Your next conversation"}
        </h3>
        <p className="mt-3 text-xs text-text-secondary">
          {date || "Choose a meeting to begin"}
        </p>
      </div>
      <svg viewBox="0 0 360 160" className="my-10 w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gradient}>
            <stop stopColor="white" stopOpacity="0" />
            <stop offset=".5" stopColor="white" stopOpacity=".9" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 7 }, (_, index) => (
          <motion.path
            key={index}
            d={`M0 80 C40 ${22 + index * 7},70 ${138 - index * 7},120 80 S190 ${22 + index * 7},240 80 S315 ${138 - index * 7},360 80`}
            stroke={`url(#${gradient})`}
            strokeWidth={index === 3 ? 1.5 : 0.7}
            fill="none"
            initial={false}
            animate={
              active && !reduced
                ? {
                    opacity: [0.2, 0.8, 0.2],
                    y: [-5, 5, -5],
                    scaleY: [0.85, 1.2, 0.85],
                  }
                : { opacity: 0.35, y: 0, scaleY: 1 }
            }
            transition={{
              duration: 5,
              repeat: active && !reduced ? Infinity : 0,
              delay: index * 0.2,
              ease: fluidEase,
            }}
          />
        ))}
      </svg>
      <div className="mt-auto border-t border-white/[.08] pt-5">
        <p className="text-xs text-text-secondary">
          {characters.toLocaleString()} character transcript
          {characters === 0 ? " · Awaiting input" : ""}
        </p>
        <div
          role="progressbar"
          aria-label="Meeting processing"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="my-4 h-1 overflow-hidden rounded-full bg-white/10"
        >
          <motion.div
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: reduced ? 0 : 0.8, ease: fluidEase }}
            className="h-full bg-white"
          />
        </div>
        <p role="status" className="text-xs text-white/75">
          {labels[phase]}
        </p>
      </div>
    </section>
  );
}
