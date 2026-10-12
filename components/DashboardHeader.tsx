"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useId, type ReactNode } from "react";
import { springPhysics } from "@/lib/motion";
export default function DashboardHeader({
  completed,
  total,
  children,
}: {
  completed: number;
  total: number;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const id = useId();
  const percent = total
    ? Math.min(100, Math.round((completed / total) * 100))
    : 0;
  const circumference = 2 * Math.PI * 18;
  return (
    <header className="topbar monochrome-header">
      <div className="flex items-center gap-3">
        <svg
          width="46"
          height="46"
          viewBox="0 0 46 46"
          role="img"
          aria-labelledby={id}
        >
          <title id={id}>
            {completed} of {total} tasks completed, {percent}%
          </title>
          <circle
            cx="23"
            cy="23"
            r="18"
            stroke="rgba(255,255,255,.1)"
            strokeWidth="2"
            fill="none"
          />
          <motion.circle
            cx="23"
            cy="23"
            r="18"
            stroke="#8B5CF6"
            className="neon-completion-ring"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: circumference * (1 - percent / 100) }}
            transition={reduced ? { duration: 0 } : springPhysics}
            transform="rotate(-90 23 23)"
          />
          <text x="23" y="26" textAnchor="middle" fontSize="9" fill="#F8FAFC">
            {percent}%
          </text>
        </svg>
        <div className="hidden xl:block">
          <span className="block text-xs text-white">Completion progress</span>
          <span className="text-[10px] text-text-secondary">
            {completed} of {total} commitments
          </span>
        </div>
      </div>
      {children}
    </header>
  );
}
