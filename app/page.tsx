import Link from "next/link";
import LiveVitals from "@/components/LiveVitals";
import {
  ArrowUpRight,
  Check,
  AudioLines,
  Quote,
  Activity,
  Fingerprint,
  Layers3,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import LandingNavLinks from "@/components/LandingNavLinks";
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
      icon: Activity,
      title: "Capture the commitments.",
      description:
        "Let AI gather the decisions and actionable next steps. Unclear owners and deadlines stay explicit.",
    },
    {
      icon: Layers3,
      title: "Review with intention.",
      description:
        "Read each proposal beside the original conversation. Refine the details and approve what matters.",
    },
    {
      icon: Fingerprint,
      title: "Keep the context.",
      description:
        "Every task carries its source evidence. Follow the work from first conversation to completion.",
    },
  ];
  return (
    <div className="botanical-landing">
      <Navbar
        actions={
          signedIn ? (
            <Link
              href="/dashboard"
              className="botanical-primary"
              aria-label="Open your workspace"
            >
              Your workspace <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <GoogleSignInButton />
          )
        }
      >
        <LandingNavLinks />
      </Navbar>
      <main id="main-content" tabIndex={-1} className="!m-0 !max-w-none !p-0">
        <section className="botanical-hero">
          <div className="hero-copy">
            <span className="botanical-tag">
              <AudioLines size={12} />
              Intelligence for every conversation
            </span>
            <h1>
              Clarity from conversation.
              <br />
              <em>Action without friction.</em>
            </h1>
            <p className="hero-description">
              Good conversations deserve thoughtful follow-through. Turn your
              meeting notes into clear, evidence-backed commitments—with you in
              control.
            </p>
            <div className="hero-actions">
              {signedIn ? (
                <Link href="/dashboard" className="botanical-primary">
                  Open your workspace <ArrowUpRight size={17} />
                </Link>
              ) : (
                <GoogleSignInButton />
              )}
              <Link href="/dashboard" className="botanical-secondary">
                Launch app <ArrowUpRight size={17} />
              </Link>
            </div>
            <p className="hero-footnote">
              Capture. Reflect. Approve. Move forward.
            </p>
          </div>
          <div
            className="field-note-preview"
            aria-label="Illustrative meeting review"
          >
            <div className="preview-orbit" aria-hidden="true">
              <LiveVitals />
            </div>
            <div className="flex items-center justify-between border-b border-botanical-border pb-5">
              <span className="botanical-eyebrow">01 / A conversation</span>
              <span className="botanical-tag">Sample workflow</span>
            </div>
            <blockquote>
              <Quote size={20} />
              <p>“Maya: I’ll prepare the prototype by Friday.”</p>
            </blockquote>
            <div className="preview-task">
              <span className="botanical-eyebrow">A clear next step</span>
              <h2>Prepare the prototype</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="botanical-tag">Maya</span>
                <span className="botanical-tag">by Friday</span>
                <span className="botanical-tag">Medium priority</span>
              </div>
              <div className="mt-7 flex items-center gap-2 text-sm text-botanical-sage">
                <Check size={16} />
                Reviewed by a human. Ready to track.
              </div>
            </div>
            <p className="mt-5 text-xs text-botanical-muted">
              The original words stay with the work.
            </p>
          </div>
        </section>
        <section id="features" className="botanical-features">
          <div className="editorial-section-heading">
            <span className="botanical-eyebrow">A thoughtful companion</span>
            <h2>
              Less noise.
              <br />
              More meaningful progress.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className="botanical-feature">
                <div className="flex justify-between">
                  <Icon size={26} strokeWidth={1.3} />
                  <span className="botanical-eyebrow">0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="workflow" className="botanical-workflow">
          <span className="botanical-eyebrow">From notes to next steps</span>
          <h2>A natural rhythm for your work.</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Bring it in",
                "Paste a transcript, upload a text file, or sync Google Meet.",
              ],
              [
                "Find the signal",
                "AI proposes a recap and evidence-backed actions.",
              ],
              [
                "Give it a thoughtful look",
                "Edit and approve the tasks you want to keep.",
              ],
              [
                "Watch it move forward",
                "Track owners, deadlines and progress on your board.",
              ],
            ].map(([title, description], i) => (
              <li key={title}>
                <span className="botanical-tag">0{i + 1}</span>
                <h3 className="mt-5 text-xl font-serif">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-botanical-muted">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="botanical-footer">
        <span className="flex items-center gap-2">
          <AudioLines size={16} />
          Meeting Companion · StrideShift D-Lab
        </span>
        <Link href="/dashboard">
          Find your next step <ArrowUpRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
