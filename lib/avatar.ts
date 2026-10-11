export function assigneeAppearance(name: string) {
  const normalized = (name.trim() || "Unassigned")
    .normalize("NFKC")
    .toLowerCase();
  let hash = 2166136261;
  for (const character of normalized) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const hue = [105, 22, 38][hash % 3] + ((hash >>> 4) % 14);
  const second = hue + 8;
  const initials =
    normalized === "unassigned"
      ? "?"
      : name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => Array.from(word)[0] ?? "")
          .join("")
          .toUpperCase();
  return {
    initials,
    foreground: "#1a241e",
    background: `linear-gradient(135deg, hsl(${hue} 22% 84%), hsl(${second} 28% 78%))`,
  };
}
