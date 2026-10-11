"use client";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
export type TranscriptDraft = {
  title: string;
  transcript: string;
  date: string;
};
export function useDraftRecovery(
  key: string,
  value: TranscriptDraft,
  onRestore: (draft: TranscriptDraft) => void,
) {
  const [restored, setRestored] = useState(false);
  const [ready, setReady] = useState<string | null>(null);
  const restore = useEffectEvent(onRestore);
  const skip = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const data: unknown = JSON.parse(raw);
          if (
            data &&
            typeof data === "object" &&
            "title" in data &&
            "transcript" in data &&
            "date" in data &&
            typeof data.title === "string" &&
            typeof data.transcript === "string" &&
            typeof data.date === "string" &&
            data.transcript.length <= 100000 &&
            data.title.length <= 200
          ) {
            restore({
              title: data.title,
              transcript: data.transcript,
              date: data.date,
            });
            setRestored(true);
          }
        }
      } catch {
        /* Storage may be blocked. */
      }
      setReady(key);
    }, 0);
    return () => clearTimeout(timer);
  }, [key]);
  const { title, transcript, date } = value;
  useEffect(() => {
    if (ready !== key) return;
    if (skip.current) {
      skip.current = false;
      return;
    }
    const timer = setTimeout(() => {
      try {
        if (title || transcript)
          localStorage.setItem(
            key,
            JSON.stringify({ title, transcript, date }),
          );
        else localStorage.removeItem(key);
      } catch {
        /* Continue without draft storage. */
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [key, ready, title, transcript, date]);
  const clear = useCallback(() => {
    skip.current = true;
    try {
      localStorage.removeItem(key);
    } catch {}
    setRestored(false);
  }, [key]);
  return { restored, clear };
}
