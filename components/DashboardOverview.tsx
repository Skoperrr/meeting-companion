"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { springPhysics } from "@/lib/motion";
export default function DashboardOverview({
  completed,
  total,
  onPriority,
  onDue,
  hoverScale,
  onHoverScale,
}: {
  completed: number;
  total: number;
  onPriority: () => void;
  onDue: () => void;
  hoverScale: boolean;
  onHoverScale: () => void;
}) {
  const reduced = useReducedMotion();
  const id = useId();
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const circumference = 2 * Math.PI * 48;
  return (
    <section className="luxury-overview">
      <div>
        <p className="eyebrow">LUXURIOUS DARK &amp; STARK</p>
        <h1 className="mt-4 font-serif text-5xl tracking-tight text-white md:text-6xl">
          AI Meeting
          <br className="hidden lg:block" /> Companion
        </h1>
        <p className="mt-5 max-w-sm text-sm leading-7 text-text-secondary">
          Clarity from conversation. Deliberate motion. Every commitment
          connected to its source.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <svg
          viewBox="0 0 120 120"
          className="h-32 w-32 shrink-0"
          role="img"
          aria-labelledby={id}
        >
          <title id={id}>{percent}% completed</title>
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="white"
            strokeOpacity=".07"
            strokeWidth="3"
          />
          <motion.circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: circumference * (1 - percent / 100) }}
            transition={reduced ? { duration: 0 } : springPhysics}
            transform="rotate(-90 60 60)"
            className="luxury-ring"
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
          <h2 className="font-serif text-2xl text-white">
            Completion Streak &amp; Progress
          </h2>
          <p className="mt-2 text-xs text-text-secondary">
            {completed} of {total} Tasks Completed ({percent}%)
          </p>
          <div
            role="progressbar"
            aria-label="Task completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="my-5 h-1.5 overflow-hidden rounded-full bg-white/10"
          >
            <motion.div
              initial={false}
              animate={{ width: `${percent}%` }}
              transition={reduced ? { duration: 0 } : springPhysics}
              className="h-full rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,.45)]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="luxury-filter" onClick={onPriority}>
              🔥 High Priority
            </button>
            <button className="luxury-filter" onClick={onDue}>
              ⏰ Due This Week
            </button>
            <button
              className="luxury-filter"
              aria-pressed={hoverScale}
              onClick={onHoverScale}
            >
              🗂️ Hover Scale {hoverScale ? "On" : "Off"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
