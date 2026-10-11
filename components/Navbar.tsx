import Link from "next/link";
import StrideShiftLogo from "./StrideShiftLogo";
import type { ReactNode } from "react";
export default function Navbar({
  children,
  variant = "public",
}: {
  children: ReactNode;
  variant?: "public" | "workspace";
}) {
  return (
    <header
      className={`botanical-navbar ${variant === "workspace" ? "topbar" : "public-navbar"}`}
    >
      {variant === "public" && (
        <Link href="/" className="botanical-wordmark">
          <StrideShiftLogo />
        </Link>
      )}
      {children}
    </header>
  );
}
