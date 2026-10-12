import Link from "next/link";
import { AudioLines } from "lucide-react";
import type { ReactNode } from "react";
import SignOutButton from "./SignOutButton";
export default function Navbar({
  children,
  variant = "public",
  email,
  actions,
}: {
  children: ReactNode;
  variant?: "public" | "workspace";
  email?: string;
  actions?: ReactNode;
}) {
  const workspace = variant === "workspace";
  return (
    <header
      className={`botanical-navbar ${workspace ? "topbar monochrome-header luxury-header app-navigation" : "public-navbar landing-navigation"}`}
    >
      <a
        href="#main-content"
        className="nav-skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
      >
        Skip to main content
      </a>
      <Link
        href={workspace ? "/dashboard" : "/"}
        className="navigation-brand"
        aria-label="StrideShift home"
      >
        <span className="brand-seed">
          <AudioLines size={24} strokeWidth={1.4} aria-hidden="true" />
        </span>
        <span className="font-serif text-2xl text-text-primary">
          StrideShift
        </span>
      </Link>
      <nav aria-label="Main Navigation" className="navigation-controls">
        {children}
      </nav>
      {!workspace && actions && (
        <div className="navigation-account navigation-actions">{actions}</div>
      )}
      {workspace && (
        <div className="navigation-account">
          {email && (
            <span className="navigation-email" title={email}>
              {email}
            </span>
          )}
          <SignOutButton />
        </div>
      )}
    </header>
  );
}
