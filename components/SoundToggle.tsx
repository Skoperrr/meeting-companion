"use client";
import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { setSoundEnabled, soundEnabled, subscribeSound } from "@/lib/audio";
export default function SoundToggle() {
  const enabled = useSyncExternalStore(
    subscribeSound,
    soundEnabled,
    () => false,
  );
  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? "Mute task sounds" : "Enable task sounds"}
      title={enabled ? "Sound on" : "Sound off"}
      onClick={() => setSoundEnabled(!enabled)}
      className="inline-flex items-center justify-center rounded-lg border border-slate-300/40 p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-500"
    >
      {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
