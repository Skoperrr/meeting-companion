"use client";
import { AudioLines } from "lucide-react";
export default function SignInTransition() {
 return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#090A0D]/95 px-6 backdrop-blur-xl" role="status" aria-live="polite" aria-label="Opening your workspace">
  <div className="signin-arrival flex flex-col items-center text-center">
   <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
    <span className="signin-orbit absolute inset-0 rounded-full border border-blue-400/20 border-t-blue-400" aria-hidden="true" />
    <span className="signin-orbit-inner absolute inset-3 rounded-full border border-indigo-400/15 border-b-indigo-400" aria-hidden="true" />
    <AudioLines size={36} className="text-white" aria-hidden="true" />
   </div>
   <span className="mb-3 text-xs uppercase tracking-[.24em] text-blue-300">StrideShift</span>
   <h2 className="font-serif text-3xl text-white">Opening your workspace.</h2>
   <p className="mt-3 text-sm text-slate-300">Continuing to secure sign-in…</p>
  </div>
  <style>{`
   .signin-arrival { animation:signin-arrive .5s cubic-bezier(.16,1,.3,1) both; }
   .signin-orbit { animation:signin-spin 1.8s linear infinite; }
   .signin-orbit-inner { animation:signin-spin 2.6s linear infinite reverse; }
   @keyframes signin-spin { to { transform:rotate(360deg); } }
   @keyframes signin-arrive { from { opacity:0; transform:translateY(12px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
   @media(prefers-reduced-motion:reduce) { .signin-arrival,.signin-orbit,.signin-orbit-inner { animation:none; } }
  `}</style>
 </div>;
}
