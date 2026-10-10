import GoogleSignInButton from "@/components/GoogleSignInButton";
import { safeNext } from "@/lib/supabase/config";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const query = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f4ed] px-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="mb-4 text-xs font-bold tracking-[.2em] text-slate-500">
          STRIDESHIFT / MEETING COMPANION
        </p>
        <h1 className="mb-3 text-3xl font-semibold text-slate-900">
          Turn conversations into progress.
        </h1>
        <p className="mb-8 text-slate-600">
          Sign in to review your meetings and track your action items.
        </p>
        {query.error && (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {query.error === "workspace"
              ? "Google Workspace access could not be saved. Grant Calendar, Drive and Meet permissions, then try again. The administrator should verify OAuth client settings and migration 005."
              : "Google sign-in was not completed. Please try again."}
          </p>
        )}
        <GoogleSignInButton next={safeNext(query.next)} />
      </section>
    </main>
  );
}
