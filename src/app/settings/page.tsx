"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ToneLibraryContent from "@/components/ToneLibrary";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">MIDI Tone Mapping</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <ToneLibraryContent />
      </main>
    </div>
  );
}
