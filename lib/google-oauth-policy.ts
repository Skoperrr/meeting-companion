export const WORKSPACE_READ_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/meetings.space.readonly",
] as const;
export function validateGoogleGrant(
  info: { aud: string; sub?: string; scopes: string[]; expiry_date: number },
  clientId: string,
  googleSub: string,
  now = Date.now(),
): void {
  if (info.aud !== clientId || info.sub !== googleSub)
    throw new Error(
      "Google token identity or client does not match this sign-in.",
    );
  if (!WORKSPACE_READ_SCOPES.every((scope) => info.scopes.includes(scope)))
    throw new Error("Calendar, Drive and Meet read permissions are required.");
  if (!Number.isFinite(info.expiry_date) || info.expiry_date <= now)
    throw new Error("Google returned an expired provider token.");
}
