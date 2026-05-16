"use client";

import Link from "next/link";
import { ArrowLeft, Zap, Crown, Check } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function PricingPage() {
  const tier = useAuthStore((s) => s.tier);

  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/billing/create-checkout", { method: "POST" });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch {
      alert("Payment system is not configured yet.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Choose Your Plan</h1>
          <p className="text-sm text-zinc-400">Unlock advanced features and unlimited projects</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-6">
          {/* Free */}
          <div className="rounded-2xl border border-zinc-700 bg-zinc-800/50 p-6 space-y-4">
            <Zap className="w-8 h-8 text-green-400" />
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Free</h2>
              {tier === "free" && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                  Current Plan
                </span>
              )}
            </div>
            <div>
              <span className="text-3xl font-bold text-white">$0</span>
              <span className="text-zinc-500">/month</span>
            </div>
            <ul className="space-y-2">
              {[
                "10 triggers per project",
                "3 projects",
                "Basic tones",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-400">
                  <Check className="w-4 h-4 text-zinc-600" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border-2 border-green-500 bg-zinc-800/50 p-6 space-y-4 relative">
            <Crown className="w-8 h-8 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Pro</h2>
            <div>
              <span className="text-3xl font-bold text-white">$9.99</span>
              <span className="text-zinc-500">/month</span>
            </div>
            <ul className="space-y-2">
              {[
                "Unlimited triggers",
                "Unlimited projects",
                "All tones",
                "MIDI export",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                  <Check className="w-4 h-4 text-green-400" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgrade}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white font-medium hover:from-green-600 hover:to-green-700 transition-all"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Back to ToneMaster
          </Link>
        </div>
      </div>
    </div>
  );
}
