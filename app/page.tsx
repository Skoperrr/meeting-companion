import Link from "next/link";
import {
  ArrowUpRight,
  AudioLines,
  Check,
  CheckCheck,
  FileText,
  Fingerprint,
  Layers3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { serverSupabase } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function LandingPage() {
  let signedIn = false;
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    const supabase = await serverSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }
  const features = [
    {
      icon: Sparkles,
      number: "01",
      title: "Smart Commitment Extraction",
      description:
        "Turn multi-speaker transcripts into a clear recap and proposed actions. Missing owners and deadlines stay explicit.",
    },
    {
      icon: ShieldCheck,
      number: "02",
      title: "Human-in-the-Loop Review",
      description:
        "Compare each proposal with its source, edit the details, and approve only the commitments that belong on your board.",
    },
    {
      icon: Fingerprint,
      number: "03",
      title: "Traceability & Evidence Backlinks",
      description:
        "Keep every approved task connected to its meeting and verbatim evidence. Follow progress without losing the context.",
    },
  ];
  return (
    <div className="min-h-screen !bg-[#101315] !text-[#f4f2ec] selection:bg-amber-300 selection:text-slate-950">
      <header className="border-b border-white/10">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-5 lg:px-10"
        >
          <Link href="/" className="flex items-center gap-3 !text-white">
            <span className="rounded-xl border border-white/20 bg-white/5 p-2.5">
              <AudioLines size={24} />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              StrideShift
              <span className="block text-[10px] font-medium tracking-[.22em] text-white/45">
                MEETING COMPANION
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-white/65">
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#workflow" className="hover:text-white">
              Workflow
            </a>
          </div>
          <div className="w-full sm:w-auto">
            {signedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-[#e4bd77] px-5 py-3 text-sm font-semibold !text-slate-950"
              >
                Dashboard <ArrowUpRight size={16} />
              </Link>
            ) : (
              <GoogleSignInButton />
            )}
          </div>
        </nav>
      </header>
      <main className="!m-0 !max-w-none !p-0">
        <section className="mx-auto grid max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-[1.1fr_1fr] lg:px-10 lg:py-28">
          <div>
            <p className="!mb-7 flex items-center gap-2 text-xs font-semibold tracking-[.2em] text-[#e4bd77]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e4bd77]" />
              LESS ADMIN. CLEARER ACCOUNTABILITY.
            </p>
            <h1 className="!mb-7 !font-sans !text-5xl !font-medium !leading-[1.08] !tracking-tight !text-white sm:!text-6xl">
              A conversation.
              <br />
              <span className="!text-[#e4bd77]">A commitment.</span>
              <br />A clear next step.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-white/65">
              Turn meeting conversations into tracked, auditable commitments
              automatically—with a human in control.
            </p>
            <p className="!mt-4 max-w-xl text-sm leading-7 text-white/45">
              Bring in your transcript. Extract the actions with AI. Review the
              evidence. Track approved tasks through to completion.
            </p>
            <div className="!mt-9 flex flex-col gap-3 sm:flex-row">
              <div>
                {signedIn ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold !text-slate-950"
                  >
                    Open your dashboard <ArrowUpRight size={18} />
                  </Link>
                ) : (
                  <GoogleSignInButton />
                )}
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold !text-white transition hover:bg-white/5"
              >
                Launch App <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="!mt-7 flex flex-wrap gap-5 text-xs text-white/45">
              <span className="flex items-center gap-2">
                <Check size={14} />
                Google sign-in
              </span>
              <span className="flex items-center gap-2">
                <Check size={14} />
                Review before saving
              </span>
              <span className="flex items-center gap-2">
                <Check size={14} />
                Evidence on every task
              </span>
            </div>
          </div>
          <div
            className="relative rounded-2xl border border-white/15 bg-[#191d20] p-5 shadow-2xl sm:p-7"
            aria-label="Sample meeting review preview"
          >
            <div className="!mb-6 flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-xs font-semibold tracking-widest text-white/55">
                MEETING → MOMENTUM
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-white/45">
                SAMPLE WORKFLOW
              </span>
            </div>
            <div className="!mb-5 flex items-center gap-3">
              <span className="rounded-lg bg-[#e4bd77]/10 p-2 text-[#e4bd77]">
                <FileText size={20} />
              </span>
              <div>
                <h2 className="!text-lg !font-medium !text-white">
                  D-Lab product sync
                </h2>
                <p className="text-xs text-white/40">
                  From the transcript to your task board
                </p>
              </div>
            </div>
            <blockquote className="rounded-xl border border-[#e4bd77]/25 bg-[#e4bd77]/5 p-5 text-sm leading-7 text-[#dfd6c5]">
              “Maya: I’ll prepare the prototype by Friday.”
            </blockquote>
            <div className="mx-auto my-4 h-7 w-px bg-white/15" />
            <article className="rounded-xl border border-white/10 bg-[#22282c] p-5">
              <div className="!mb-4 flex items-center justify-between">
                <span className="rounded-full bg-amber-200/10 px-3 py-1 text-[10px] font-semibold text-amber-200">
                  PROPOSED COMMITMENT
                </span>
                <CheckCheck className="text-[#e4bd77]" size={19} />
              </div>
              <h3 className="!mb-3 !text-base !font-semibold !text-white">
                Prepare the prototype
              </h3>
              <div className="flex justify-between text-xs text-white/50">
                <span>Owner · Maya</span>
                <span>Due · by Friday</span>
              </div>
              <div className="!mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-[#e4bd77]">
                <ShieldCheck size={15} />
                Ready for human review
              </div>
            </article>
            <div className="!mt-5 grid grid-cols-3 gap-2 text-center text-[10px] text-white/40">
              {["To Do", "In Progress", "Completed"].map((status, i) => (
                <div
                  key={status}
                  className="rounded-lg border border-white/10 py-3"
                >
                  <span
                    className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${i === 2 ? "bg-emerald-300" : i === 1 ? "bg-amber-200" : "bg-slate-400"}`}
                  />
                  {status}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section
          id="features"
          className="scroll-mt-6 border-y border-white/10 bg-white/[.02]"
        >
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
            <p className="!mb-4 text-xs font-semibold tracking-[.2em] text-[#e4bd77]">
              BUILT FOR FOLLOW-THROUGH
            </p>
            <h2 className="!mb-10 !font-sans !text-3xl !font-medium !text-white">
              Clarity at every step.
            </h2>
            <div className="grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, number, title, description }) => (
                <article
                  key={number}
                  className="rounded-2xl border border-white/10 bg-[#191d20] p-7"
                >
                  <div className="!mb-8 flex items-center justify-between">
                    <Icon size={25} className="text-[#e4bd77]" />
                    <span className="text-xs text-white/25">{number}</span>
                  </div>
                  <h3 className="!mb-4 !text-lg !font-medium !text-white">
                    {title}
                  </h3>
                  <p className="text-sm leading-7 text-white/50">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          id="workflow"
          className="mx-auto max-w-7xl scroll-mt-6 px-6 py-20 lg:px-10"
        >
          <div className="!mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="!mb-4 text-xs font-semibold tracking-[.2em] text-[#e4bd77]">
                THE WORKFLOW
              </p>
              <h2 className="!font-sans !text-3xl !font-medium !text-white">
                From spoken intent to visible progress.
              </h2>
            </div>
            <Layers3 className="text-white/25" size={32} />
          </div>
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Capture", "Paste your transcript or upload a .txt file."],
              [
                "02",
                "Extract",
                "AI proposes a recap, decisions and evidence-backed commitments.",
              ],
              [
                "03",
                "Verify",
                "Edit, approve or reject proposals beside the original transcript.",
              ],
              [
                "04",
                "Track",
                "Move tasks through the board, export the recap and add deadlines to your calendar.",
              ],
            ].map(([number, title, body]) => (
              <li key={number} className="border-t border-white/20 pt-6">
                <span className="text-xs text-[#e4bd77]">{number}</span>
                <h3 className="!my-4 !text-xl !font-medium !text-white">
                  {title}
                </h3>
                <p className="text-sm leading-7 text-white/45">{body}</p>
              </li>
            ))}
          </ol>
          <div className="!mt-12">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold !text-[#e4bd77]"
            >
              Start with your first meeting <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="!m-0 !block !border-t !border-white/10 !p-0 !tracking-normal">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-6 py-7 text-xs text-white/35 lg:px-10">
          <span>STRIDESHIFT / MEETING COMPANION</span>
          <span>D-Lab Blitz · AI-assisted. Human-approved.</span>
        </div>
      </footer>
    </div>
  );
}
