import { listData } from "@/lib/db";
import Workspace from "@/components/Workspace";
import { requireUser } from "@/lib/auth";
export default async function Page() {
  const user = await requireUser("/tracker");
  return (
    <Workspace
      initialView="board"
      initialData={{
        ...(await listData()),
        ai_configured: Boolean(process.env.GEMINI_API_KEY),
      }}
      email={user.email ?? "Google account"}
    />
  );
}
