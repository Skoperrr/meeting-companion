import { apiAuth } from "@/lib/auth";
import { z } from "zod";
import { deleteMeeting } from "@/lib/db";
import { failure, mutationGuard } from "@/lib/http";
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    mutationGuard(request);
    await deleteMeeting(
      z
        .string()
        .uuid()
        .parse((await params).id),
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    return failure(error);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    const { supabase, user } = await apiAuth();
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error("Could not fetch meeting.");
    if (!data)
      return Response.json({ error: "Meeting not found." }, { status: 404 });
    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
