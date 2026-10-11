export function assigneeAppearance(name: string) {
  const normalized = (name.trim() || "Unassigned")
    .normalize("NFKC")
    .toLowerCase();
  let hash = 2166136261;
  for (const character of normalized) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const shade = 74 + (hash % 15);
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
    foreground: "#111215",
    background: `linear-gradient(135deg, hsl(0 0% ${shade}%), hsl(0 0% ${shade - 4}%))`,
  };
}
