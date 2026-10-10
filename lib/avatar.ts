export function assigneeAppearance(name: string) {
  const normalized = (name.trim() || "Unassigned")
    .normalize("NFKC")
    .toLowerCase();
  let hash = 2166136261;
  for (const character of normalized) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const hue = hash % 360;
  const second = (hue + 35 + ((hash >>> 8) % 65)) % 360;
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
    background: `linear-gradient(135deg, hsl(${hue} 58% 24%), hsl(${second} 62% 26%))`,
  };
}
