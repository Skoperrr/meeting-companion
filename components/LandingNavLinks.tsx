"use client";
import { useSyncExternalStore } from "react";
const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
const snapshot = () => window.location.hash;
const serverSnapshot = () => "";
export default function LandingNavLinks() {
  const active = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return (
    <div className="landing-nav-links">
      {[
        { href: "#features", label: "What it does" },
        { href: "#workflow", label: "How it flows" },
      ].map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="nav-section-link"
          aria-current={active === link.href ? "location" : undefined}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
