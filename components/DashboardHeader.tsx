"use client";
import { AudioLines } from "lucide-react";
import type { ReactNode } from "react";
export default function DashboardHeader({
  children,
}: {
  completed: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <header className="topbar monochrome-header luxury-header">
      <a
        href="/dashboard"
        className="inline-flex items-center gap-3"
        aria-label="StrideShift dashboard"
      >
        <span className="brand-icon">
          <AudioLines size={24} />
        </span>
        <span className="font-serif text-2xl text-text-primary">
          StrideShift
        </span>
      </a>
      {children}
    </header>
  );
}
