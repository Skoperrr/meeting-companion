"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import StrideShiftLogo from "./StrideShiftLogo";
export default function DashboardHeader({
  children,
}: {
  completed: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <header className="topbar monochrome-header luxury-header">
      <Link href="/dashboard" aria-label="StrideShift dashboard">
        <StrideShiftLogo />
      </Link>
      {children}
    </header>
  );
}
