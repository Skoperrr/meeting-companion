import Link from "next/link";
import { Leaf } from "lucide-react";
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
          <span className="brand-seed">
            <Leaf size={20} strokeWidth={1.4} />
          </span>
          <span>
            meeting companion
            <span className="brand-caption">a little clarity, every day</span>
          </span>
        </Link>
      )}
      {children}
    </header>
  );
}
