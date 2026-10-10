import "server-only";
// Load only the Calendar, Drive and Meet adapters from the official googleapis package.
import {
  auth as googleAuth,
  calendar,
  type calendar_v3,
} from "googleapis/build/src/apis/calendar";
import { drive, type drive_v3 } from "googleapis/build/src/apis/drive";
import { meet } from "googleapis/build/src/apis/meet";
import { ApiError } from "./http";
import {
  uniqueAttendees,
  workspaceMeetingSchema,
  type MeetSyncInput,
  type WorkspaceMeeting,
} from "./workspace-types";
export const GOOGLE_WORKSPACE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/meetings.space.readonly",
];
export function createGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID,
    secret = process.env.GOOGLE_CLIENT_SECRET,
    appUrl = process.env.APP_URL;
  if (!clientId || !secret || !appUrl)
    throw new ApiError(503, "Google Workspace OAuth is not configured.");
  const url = new URL(appUrl);
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw new Error("APP_URL must use HTTPS.");
  return new googleAuth.OAuth2(
    clientId,
    secret,
    new URL("/api/google-workspace/callback", url.origin).toString(),
  );
}
export function meetCode(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "meet.google.com" ||
    !/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/.test(url.pathname)
  )
    throw new ApiError(
      422,
      "Provide a standard https://meet.google.com/abc-defg-hij link.",
    );
  return url.pathname.replaceAll("/", "");
}
function eventCode(event: calendar_v3.Schema$Event): string | null {
  const links = [
    event.hangoutLink,
    ...(event.conferenceData?.entryPoints ?? [])
      .filter((e) => e.entryPointType === "video")
      .map((e) => e.uri),
  ];
  for (const link of links) {
    if (!link) continue;
    try {
      return meetCode(link);
    } catch {
      continue;
    }
  }
  return null;
}
function eventTime(value?: calendar_v3.Schema$EventDateTime): number {
  const date =
    value?.dateTime ?? (value?.date ? `${value.date}T00:00:00Z` : "");
  return Date.parse(date);
}
function statusOf(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const object = error as { response?: { status?: number }; code?: number };
  return object.response?.status ?? object.code;
}
const options = { timeout: 15000, retry: false };
const quote = (value: string) =>
  value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
async function calendarEvent(
  client: ReturnType<typeof calendar>,
  input: MeetSyncInput,
): Promise<{ calendarId: string; event: calendar_v3.Schema$Event }> {
  if (input.calendarEventId) {
    const { data } = await client.events.get(
      { calendarId: input.calendarId, eventId: input.calendarEventId },
      options,
    );
    if (data.status === "cancelled")
      throw new ApiError(422, "The calendar event was cancelled.");
    if (data.recurrence && !data.recurringEventId)
      throw new ApiError(
        422,
        "Use a recurring event instance ID, not its series ID.",
      );
    return { calendarId: input.calendarId, event: data };
  }
  const code = meetCode(input.meetUrl!);
  const now = Date.now();
  const calendarIds: string[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 10; page++) {
    const { data } = await client.calendarList.list(
      { maxResults: 250, pageToken },
      options,
    );
    calendarIds.push(
      ...(data.items ?? []).flatMap((item) => (item.id ? [item.id] : [])),
    );
    pageToken = data.nextPageToken ?? undefined;
    if (!pageToken) break;
    if (page === 9)
      throw new ApiError(
        422,
        "Too many calendars. Submit an event ID and calendarId instead.",
      );
  }
  let chosen: { calendarId: string; event: calendar_v3.Schema$Event } | null =
    null;
  let inspected = 0;
  for (const calendarId of calendarIds) {
    pageToken = undefined;
    do {
      const { data }: { data: calendar_v3.Schema$Events } =
        await client.events.list(
          {
            calendarId,
            timeMin: new Date(now - 30 * 86400000).toISOString(),
            timeMax: new Date(now).toISOString(),
            singleEvents: true,
            showDeleted: false,
            maxResults: 2500,
            pageToken,
          },
          options,
        );
      for (const event of data.items ?? [])
        if (
          eventCode(event) === code &&
          eventTime(event.end) <= now &&
          (!chosen || eventTime(event.start) > eventTime(chosen.event.start))
        )
          chosen = { calendarId, event };
      pageToken = data.nextPageToken ?? undefined;
      if (++inspected > 40)
        throw new ApiError(
          422,
          "Calendar search limit reached. Submit an event ID and calendarId instead.",
        );
    } while (pageToken);
  }
  if (!chosen)
    throw new ApiError(
      404,
      "No completed calendar event with this Meet link was found in the last 30 days.",
    );
  return chosen;
}
async function listDriveFiles(
  client: ReturnType<typeof drive>,
  q: string,
): Promise<drive_v3.Schema$File[]> {
  const files: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const { data } = await client.files.list(
      {
        q,
        pageSize: 1000,
        pageToken,
        orderBy: "createdTime desc",
        fields:
          "nextPageToken,files(id,name,mimeType,createdTime,parents,properties,appProperties,size)",
        spaces: "drive",
      },
      options,
    );
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken ?? undefined;
    if (!pageToken) return files;
  }
  throw new ApiError(
    422,
    "Drive search limit reached; narrow the Meet Recordings folder.",
  );
}
export async function fetchGoogleMeeting(
  refreshToken: string,
  input: MeetSyncInput,
): Promise<WorkspaceMeeting> {
  const auth = createGoogleOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  const calendarClient = calendar({ version: "v3", auth }),
    driveClient = drive({ version: "v3", auth }),
    meetClient = meet({ version: "v2", auth });
  try {
    const { calendarId, event } = await calendarEvent(calendarClient, input);
    const code = eventCode(event);
    if (
      !event.id ||
      !code ||
      !Number.isFinite(eventTime(event.start)) ||
      !Number.isFinite(eventTime(event.end))
    )
      throw new ApiError(
        422,
        "Event has no usable Google Meet link or scheduled time.",
      );
    if (event.attendeesOmitted)
      throw new ApiError(
        422,
        "Google did not provide the complete attendee list for this event.",
      );
    if (eventTime(event.end) > Date.now())
      throw new ApiError(409, "The meeting has not finished yet.");
    const attendees = uniqueAttendees(
      (event.attendees ?? [])
        .filter((a) => !a.resource && a.email)
        .map((a) => ({ name: a.displayName?.trim() || null, email: a.email! })),
    );
    if (!attendees.length || attendees.length > 100)
      throw new ApiError(
        422,
        "A recap requires between 1 and 100 non-resource calendar invitees with valid emails.",
      );
    let canonicalId: string | undefined;
    try {
      const { data } = await meetClient.conferenceRecords.list(
        {
          filter: `space.meeting_code = "${code}" AND start_time >= "${new Date(eventTime(event.start) - 2 * 3600000).toISOString()}" AND start_time <= "${new Date(eventTime(event.end) + 2 * 3600000).toISOString()}"`,
          pageSize: 100,
        },
        options,
      );
      const records = (data.conferenceRecords ?? [])
        .filter((record) => record.endTime && record.name)
        .sort(
          (a, b) =>
            Date.parse(b.startTime ?? "") - Date.parse(a.startTime ?? ""),
        );
      // Refuse overlap with other scheduled occurrences of a reused Meet space.
      if (records.length > 1)
        throw new ApiError(
          409,
          "Multiple Meet conferences overlap this calendar occurrence; use an event with an unambiguous session.",
        );
      if (records[0]?.name) {
        const transcripts = [];
        let pageToken: string | undefined;
        do {
          const response = await meetClient.conferenceRecords.transcripts.list(
            { parent: records[0].name, pageSize: 100, pageToken },
            options,
          );
          transcripts.push(...(response.data.transcripts ?? []));
          pageToken = response.data.nextPageToken ?? undefined;
          if (transcripts.length > 500)
            throw new ApiError(422, "Too many transcript sessions.");
        } while (pageToken);
        canonicalId =
          transcripts
            .filter(
              (t) =>
                t.state === "FILE_GENERATED" && t.docsDestination?.document,
            )
            .sort(
              (a, b) =>
                Date.parse(b.startTime ?? "") - Date.parse(a.startTime ?? ""),
            )[0]?.docsDestination?.document ?? undefined;
      }
    } catch (error) {
      if (statusOf(error) !== 403 && statusOf(error) !== 404) throw error;
    }
    const folders = await listDriveFiles(
      driveClient,
      "trashed=false and mimeType='application/vnd.google-apps.folder' and name='Meet Recordings'",
    );
    if (folders.length > 10)
      throw new ApiError(
        422,
        "Too many Meet Recordings folders. Consolidate folders before syncing.",
      );
    const files: drive_v3.Schema$File[] = [];
    for (const folder of folders)
      if (folder.id)
        files.push(
          ...(await listDriveFiles(
            driveClient,
            `trashed=false and '${quote(folder.id)}' in parents and (mimeType='application/vnd.google-apps.document' or mimeType='text/plain')`,
          )),
        );
    if (canonicalId && !files.some((file) => file.id === canonicalId)) {
      const { data } = await driveClient.files.get(
        { fileId: canonicalId, fields: "id,name,mimeType,createdTime,size" },
        options,
      );
      files.push(data);
    }
    const attachmentIds = new Set(
      (event.attachments ?? [])
        .filter((a) => /transcript|transcription/i.test(a.title ?? ""))
        .flatMap((a) => (a.fileId ? [a.fileId] : [])),
    );
    for (const id of attachmentIds)
      if (!files.some((file) => file.id === id)) {
        const { data } = await driveClient.files.get(
          { fileId: id, fields: "id,name,mimeType,createdTime,size" },
          options,
        );
        files.push(data);
      }
    const candidates = files.filter(
      (file) =>
        file.id &&
        ["application/vnd.google-apps.document", "text/plain"].includes(
          file.mimeType ?? "",
        ) &&
        (file.id === canonicalId ||
          attachmentIds.has(file.id) ||
          file.properties?.calendarEventId === event.id ||
          file.appProperties?.calendarEventId === event.id),
    );
    const file = candidates.sort(
      (a, b) =>
        Date.parse(b.createdTime ?? "") - Date.parse(a.createdTime ?? ""),
    )[0];
    if (!file?.id)
      throw new ApiError(
        409,
        "No associated transcript is ready. Enable Meet transcription, wait for export, or attach a transcript to this calendar event.",
      );
    if (file.size && Number(file.size) > 400000)
      throw new ApiError(413, "Transcript file is too large.");
    const response =
      file.mimeType === "application/vnd.google-apps.document"
        ? await driveClient.files.export(
            { fileId: file.id, mimeType: "text/plain" },
            { ...options, responseType: "text", maxContentLength: 400000 },
          )
        : await driveClient.files.get(
            { fileId: file.id, alt: "media" },
            { ...options, responseType: "text", maxContentLength: 400000 },
          );
    if (typeof response.data !== "string")
      throw new ApiError(502, "Google returned an invalid transcript export.");
    return workspaceMeetingSchema.parse({
      calendarId,
      eventId: event.id,
      title:
        `${(event.summary?.trim() || "Google Meet").slice(0, 165)} · ${event.start?.dateTime ?? event.start?.date}`.slice(
          0,
          200,
        ),
      meetingDate: (event.start?.dateTime ?? event.start?.date ?? "").slice(
        0,
        10,
      ),
      meetUrl: `https://meet.google.com/${code}`,
      documentId: file.id,
      documentUrl: `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`,
      transcript: response.data,
      attendees,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const status = statusOf(error);
    if (status === 401 || status === 403 || status === 400)
      throw new ApiError(
        403,
        "Google denied Workspace access. Reconnect with the required scopes and check transcript permissions.",
      );
    if (status === 404)
      throw new ApiError(
        404,
        "Google event or transcript was not found or is inaccessible.",
      );
    if (status === 429)
      throw new ApiError(429, "Google API rate limit reached. Retry later.");
    throw new ApiError(
      502,
      "Google Workspace retrieval failed. No recap was emailed.",
    );
  }
}
