"use client";
import { useEffect, useState } from "react";
export default function TypewriterSummary({ text }: { text: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let position = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const chunk = Math.max(1, Math.ceil(text.length / 75));
    const timer = setInterval(() => {
      position = motion.matches
        ? text.length
        : Math.min(text.length, position + chunk);
      setCount(position);
      if (position >= text.length) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [text]);
  return (
    <div className="grid">
      <p className="sr-only">{text}</p>
      <p
        aria-hidden="true"
        className="summary invisible col-start-1 row-start-1"
      >
        {text}
      </p>
      <p aria-hidden="true" className="summary col-start-1 row-start-1">
        {text.slice(0, count)}
        {count < text.length && (
          <span className="ml-1 inline-block h-4 w-0.5 bg-indigo-400 motion-safe:animate-pulse" />
        )}
      </p>
    </div>
  );
}
