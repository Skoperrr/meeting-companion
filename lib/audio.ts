const KEY = "meeting-companion:sound";
const EVENT = "meeting-companion:sound-change";
let context: AudioContext | undefined;
export function soundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, enabled ? "on" : "off");
  } catch {
    /* Storage restrictions leave sound disabled. */
  }
  window.dispatchEvent(new Event(EVENT));
}
export function subscribeSound(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
export function playTaskSound(kind: "drop" | "complete"): void {
  if (!soundEnabled() || typeof window.AudioContext === "undefined") return;
  try {
    context ??= new window.AudioContext();
    const audio = context;
    void audio
      .resume()
      .then(() => {
        if (!soundEnabled()) return;
        const start = audio.currentTime;
        const notes = kind === "complete" ? [523.25, 659.25, 783.99] : [140];
        notes.forEach((frequency, index) => {
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          const at = start + index * 0.065;
          const duration = kind === "complete" ? 0.25 : 0.075;
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(frequency, at);
          if (kind === "drop")
            oscillator.frequency.exponentialRampToValueAtTime(
              65,
              at + duration,
            );
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(
            kind === "complete" ? 0.035 : 0.045,
            at + 0.008,
          );
          gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
          oscillator.start(at);
          oscillator.stop(at + duration + 0.01);
        });
      })
      .catch(() => {});
  } catch {
    /* Unsupported/blocked audio never interrupts the board. */
  }
}
