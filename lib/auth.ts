import "server-only";
import { redirect } from "next/navigation";
import { serverSupabase } from "./supabase/server";
import { safeNext } from "./supabase/config";
import { ApiError } from "./http";
export async function apiAuth() {
  const supabase = await serverSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new ApiError(401, "Please sign in to continue.");
  return { supabase, user };
}
export async function requireUser(next = "/dashboard") {
  const supabase = await serverSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user)
    redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  return user;
}
