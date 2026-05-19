"use client";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { Lock, Sparkles, X } from "lucide-react";

const isClerkConfigured = typeof process !== "undefined" && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("REPLACE_ME");

export default function GateModal() {
  const gateModal = useAuthStore((s) => s.gateModal);
  const closeGate = useAuthStore((s) => s.closeGate);
  const [showClerkSignIn, setShowClerkSignIn] = useState(false);

  useEffect(() => {
    if (!gateModal) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeGate() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gateModal, closeGate])

  if (!gateModal) return null;
  const isUpgrade = gateModal.requiredTier === "pro";

  if (showClerkSignIn && isClerkConfigured) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center">
        <div className="relative w-full max-w-md">
          <button onClick={() => setShowClerkSignIn(false)} className="absolute top-4 right-4 z-10 text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
          <ClerkSignInEmbed />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeGate} role="dialog" aria-modal="true" aria-label={gateModal.title}>
      <div className="relative w-full max-w-md bg-[#18181b] rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={closeGate} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
        <div className="flex justify-center mb-4">
          {isUpgrade ? (<div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center"><Sparkles className="w-7 h-7 text-amber-400" /></div>)
            : (<div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center"><Lock className="w-7 h-7 text-green-400" /></div>)}
        </div>
        <h2 className="text-xl font-semibold text-white text-center mb-2">{gateModal.title}</h2>
        <p className="text-zinc-400 text-sm text-center mb-6">{gateModal.message}</p>
        <div className="flex flex-col gap-3">
          {isUpgrade ? (
            <a href="/pricing" className="w-full py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white font-medium text-center hover:from-green-600 hover:to-green-700 transition-all">Upgrade to Pro</a>
          ) : (
            <button onClick={() => isClerkConfigured ? setShowClerkSignIn(true) : alert("Clerk is not configured.")} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white font-medium hover:from-green-600 hover:to-green-700 transition-all">Sign In — It's Free</button>
          )}
          <button onClick={closeGate} className="w-full py-2.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-sm">Maybe Later</button>
        </div>
      </div>
    </div>
  );
}

function ClerkSignInEmbed() {
  const { SignIn } = require("@clerk/nextjs") as typeof import("@clerk/nextjs");
  return <SignIn routing="hash" forceRedirectUrl="/" appearance={{ elements: { card: "bg-[#18181b] border border-zinc-700" } }} />;
}
