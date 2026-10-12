import { listData } from "@/lib/db";
import Workspace from "@/components/Workspace";
import { requireUser } from "@/lib/auth";
export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  return (
    <Workspace
      initialView="overview"
      initialData={{
        ...(await listData()),
        ai_configured: Boolean(process.env.GEMINI_API_KEY),
      }}
      email={user.email ?? "Google account"}
    />
  );
}
