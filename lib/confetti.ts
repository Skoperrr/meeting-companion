export async function celebrateCompletion(): Promise<void> {
  if (
    typeof window === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  try {
    const { default: confetti } = await import("canvas-confetti");
    void confetti({
      particleCount: 55,
      spread: 65,
      startVelocity: 24,
      gravity: 1.1,
      origin: { x: 0.75, y: 0.65 },
      colors: ["#6366f1", "#10b981", "#fcd34d"],
      disableForReducedMotion: true,
      zIndex: 1000,
    });
  } catch {
    /* Celebration must never interrupt task persistence. */
  }
}
