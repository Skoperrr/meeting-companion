/** Match only whitespace changes; return a literal, contiguous source substring. */
export function sourceQuote(transcript: string, quote: string): string {
  if (!quote.trim()) throw new Error("AI evidence quote is empty.");
  if (transcript.includes(quote)) return quote;
  const offsets: { start: number; end: number }[] = [];
  let text = "";
  for (let i = 0; i < transcript.length; i++) {
    const char = transcript[i];
    if (/\s/u.test(char)) {
      if (text.endsWith(" ")) {
        offsets[offsets.length - 1].end = i + 1;
        continue;
      }
      text += " ";
      offsets.push({ start: i, end: i + 1 });
    } else {
      text += char;
      offsets.push({ start: i, end: i + 1 });
    }
  }
  const needle = quote.replace(/\s+/gu, " ").trim();
  const start = text.indexOf(needle);
  if (start < 0 || text.indexOf(needle, start + 1) >= 0)
    throw new Error(
      "AI returned a quote that is not present verbatim in the transcript. Please retry.",
    );
  return transcript.slice(
    offsets[start].start,
    offsets[start + needle.length - 1].end,
  );
}
export function restoreSourceQuotes<
  T extends { proposed_tasks: { transcript_quote: string }[] },
>(analysis: T, transcript: string): T {
  return {
    ...analysis,
    proposed_tasks: analysis.proposed_tasks.map((task) => ({
      ...task,
      transcript_quote: sourceQuote(transcript, task.transcript_quote),
    })),
  };
}
