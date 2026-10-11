import { z } from "zod";
export const syncStepSchema = z.enum(["fetching", "analyzing", "dispatching"]);
export type SyncStep = z.infer<typeof syncStepSchema>;
export const syncResultSchema = z.object({
  ok: z.boolean().optional(),
  meetingId: z.string().uuid().optional(),
  proposalsSaved: z.boolean().optional(),
  cached: z.boolean().optional(),
  error: z.string().optional(),
});
export type SyncResult = z.infer<typeof syncResultSchema>;
const packetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("progress"), step: syncStepSchema }),
  z.object({
    type: z.literal("result"),
    status: z.number().int(),
    result: syncResultSchema,
  }),
]);
export function parseMeetSyncInput(
  value: string,
): { meetUrl: string } | { calendarEventId: string } {
  const trimmed = value.trim();
  const input = /^meet\.google\.com\//i.test(trimmed)
    ? `https://${trimmed}`
    : trimmed;
  if (!input || input.length > 1024)
    throw new Error("Enter a Calendar event ID or Google Meet URL.");
  if (/^https?:\/\//i.test(input)) {
    const url = new URL(input);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "meet.google.com" ||
      !/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/.test(url.pathname)
    )
      throw new Error(
        "Use a Google Meet URL such as https://meet.google.com/abc-defg-hij.",
      );
    return { meetUrl: url.toString() };
  }
  if (/\s|[/:]/.test(input))
    throw new Error(
      "Enter the Calendar API event ID, not a Calendar page URL.",
    );
  return { calendarEventId: input };
}
export async function readMeetSyncResponse(
  response: Response,
  onProgress: (step: SyncStep) => void,
): Promise<{ status: number; result: SyncResult }> {
  if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
    try {
      return {
        status: response.status,
        result: syncResultSchema.parse(await response.json()),
      };
    } catch {
      throw new Error(
        response.status === 404
          ? "Google Meet sync is not available in this deployment."
          : "The server returned an unreadable response. Retry the same meeting.",
      );
    }
  }
  if (!response.body)
    throw new Error("The sync response was empty. Retry the same meeting.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final: { status: number; result: SyncResult } | undefined;
  const consume = (line: string) => {
    if (!line.trim()) return;
    if (final) throw new Error("Unexpected data after sync completion.");
    const packet = packetSchema.parse(JSON.parse(line));
    if (packet.type === "progress") onProgress(packet.step);
    else final = { status: packet.status, result: packet.result };
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      if (buffer.length > 150000)
        throw new Error("The sync response exceeded its size limit.");
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        consume(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
      if (done) {
        consume(buffer);
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (!final)
    throw new Error(
      "The connection ended before completion was confirmed. Retry the same meeting; saved work will be reused.",
    );
  return final;
}
