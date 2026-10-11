"use client";
import { useEffect, useRef, useState } from "react";
export default function TranscriptViewer({
  transcript,
  highlightQuote,
}: {
  transcript: string;
  highlightQuote?: string;
}) {
  const [hashQuote, setHashQuote] = useState("");
  const target = useRef<HTMLElement>(null);
  useEffect(() => {
    const update = () => {
      try {
        const hash = window.location.hash.slice(1);
        setHashQuote(
          hash.startsWith("quote=") ? decodeURIComponent(hash.slice(6)) : "",
        );
      } catch {
        setHashQuote("");
      }
    };
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const quote = highlightQuote ?? hashQuote;
  const index = quote ? transcript.indexOf(quote) : -1;
  useEffect(() => {
    if (index < 0) return;
    const timer = setTimeout(
      () =>
        target.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "center",
        }),
      50,
    );
    return () => clearTimeout(timer);
  }, [quote, index]);
  return (
    <div className="max-h-[65vh] overflow-y-auto rounded-2xl border border-botanical-border bg-botanical-paper p-5">
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-8 text-botanical-muted">
        {index < 0 ? (
          transcript
        ) : (
          <>
            {transcript.slice(0, index)}
            <mark
              ref={target}
              key={quote}
              className="quote-jump rounded bg-[#16181D] px-1 text-botanical-forest"
            >
              {quote}
            </mark>
            {transcript.slice(index + quote.length)}
          </>
        )}
      </pre>
      {quote && index < 0 && (
        <p role="status" className="mt-3 text-xs text-botanical-muted">
          This excerpt could not be located in the transcript.
        </p>
      )}
    </div>
  );
}
