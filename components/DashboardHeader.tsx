"use client";
import type { ReactNode } from "react";
import Navbar from "./Navbar";
export default function DashboardHeader({
  children,
  email,
}: {
  completed: number;
  total: number;
  children: ReactNode;
  email: string;
}) {
  return (
    <Navbar variant="workspace" email={email}>
      {children}
    </Navbar>
  );
}
