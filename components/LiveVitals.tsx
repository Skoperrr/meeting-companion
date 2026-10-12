"use client";
import { useEffect, useRef, useState } from "react";
export default function LiveVitals() {
  const ref = useRef<SVGSVGElement>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let visible = false;
    const update = () => setRunning(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  const path = "M 2 44 H 22 L 32 12 L 48 76 L 58 44 H 86";
  return (
    <svg ref={ref} width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden="true" focusable="false" className="live-vitals" style={{animationPlayState:running ? "running" : "paused"}}>
      <path d={path} stroke="currentColor" strokeWidth="1.2" opacity=".3" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} pathLength="100" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="22 78" className="live-vitals-trace" style={{animationPlayState:running ? "running" : "paused"}} />
      <style>{`
        .live-vitals { animation:vitals-breathe 3.2s ease-in-out infinite; }
        .live-vitals-trace { animation:vitals-travel 3.2s linear infinite; }
        @keyframes vitals-travel { from { stroke-dashoffset:100; } to { stroke-dashoffset:0; } }
        @keyframes vitals-breathe { 0%,100% { opacity:.65; } 50% { opacity:1; } }
        @media(prefers-reduced-motion:reduce) { .live-vitals,.live-vitals-trace { animation:none; opacity:1; } .live-vitals-trace { stroke-dasharray:none; } }
      `}</style>
    </svg>
  );
}
