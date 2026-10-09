export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error("Supabase authentication is not configured.");
  return { url, key };
}
export function safeNext(value: string | null | undefined): string {
  return value && ["/dashboard", "/tracker", "/meetings"].includes(value)
    ? value
    : "/dashboard";
}
