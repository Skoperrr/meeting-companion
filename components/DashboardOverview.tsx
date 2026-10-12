"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { Plus } from "lucide-react";
import { springPhysics } from "@/lib/motion";
export default function DashboardOverview({
  completed,
  total,
  onCapture,
}: {
  completed: number;
  total: number;
  onCapture: () => void;
}) {
  const reduced = useReducedMotion(),
    id = useId();
  const percent = total
    ? Math.min(100, Math.round((completed / total) * 100))
    : 0;
  const circumference = 2 * Math.PI * 48;
  return (
    <section aria-labelledby={`${id}-heading`} className="dashboard-hero">
      <div>
        <p className="eyebrow">YOUR MEETINGS, MOVING FORWARD</p>
        <h1
          id={`${id}-heading`}
          className="mt-4 font-serif text-[clamp(2rem,5vw,3.75rem)] leading-tight tracking-tight text-white"
        >
          AI Meeting Companion
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-text-secondary">
          Clarity from conversation. Every commitment connected to its source.
        </p>
        <button
          type="button"
          onClick={onCapture}
          aria-label="Capture a meeting from a transcript"
          className="primary mt-6"
        >
          <Plus size={18} aria-hidden="true" />
          Capture a Meeting
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <svg
          viewBox="0 0 120 120"
          className="h-32 w-32 shrink-0"
          role="img"
          aria-labelledby={`${id}-ring`}
        >
          <title id={`${id}-ring`}>
            {completed} of {total} tasks completed, {percent}%
          </title>
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="rgba(255,255,255,.08)"
            strokeWidth="3"
          />
          <motion.circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: circumference * (1 - percent / 100) }}
            transition={reduced ? { duration: 0 } : springPhysics}
            transform="rotate(-90 60 60)"
          />
          <text
            x="60"
            y="68"
            textAnchor="middle"
            fill="white"
            fontSize="32"
            fontFamily="Georgia,serif"
          >
            {percent}
          </text>
        </svg>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-2xl sm:text-3xl text-white">
            Completion Streak &amp; Progress
          </h2>
          <p className="mt-3 text-sm text-text-secondary">
            {completed} of {total} Tasks Completed ({percent}%)
          </p>
          <div
            role="progressbar"
            aria-label="Task completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10"
          >
            <motion.div
              initial={false}
              animate={{ width: `${percent}%` }}
              transition={reduced ? { duration: 0 } : springPhysics}
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
