export type SourceLine = {
  id: number;
  text: string;
  start: number;
  end: number;
};
/** Offsets refer to the original UTF-16 string, preserving CRLF and speaker labels. */
export function transcriptSource(transcript: string): SourceLine[] {
  const lines: SourceLine[] = [];
  const pattern = /[^\r\n]+(?:\r\n|\r|\n|$)|\r\n|\r|\n/g;
  for (const match of transcript.matchAll(pattern)) {
    const raw = match[0];
    const start = match.index!;
    const text = raw.replace(/[\r\n]+$/, "");
    // Only split unusually long turns to stay inside the public evidence field limit.
    for (let offset = 0; offset < text.length; offset += 1800) {
      let end = Math.min(offset + 1800, text.length);
      if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
      lines.push({
        id: lines.length + 1,
        text: text.slice(offset, end),
        start: start + offset,
        end: start + end,
      });
      if (end !== Math.min(offset + 1800, text.length)) offset--;
    }
  }
  return lines;
}
export function quoteFromLines(
  transcript: string,
  lines: SourceLine[],
  start: number,
  end: number,
): string {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end < start ||
    end > lines.length
  )
    throw new Error("AI selected an invalid source line range.");
  const quote = transcript.slice(lines[start - 1].start, lines[end - 1].end);
  if (!quote.trim() || quote.length > 4000)
    throw new Error(
      "AI selected too much evidence. Select a shorter contiguous source range.",
    );
  return quote;
}
