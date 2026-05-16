"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Music, Monitor, Guitar, Globe } from "lucide-react";
import { detectOS } from "@/lib/midi";

export default function GuidePage() {
  const [os, setOs] = useState<string>("unknown");
  const [osTab, setOsTab] = useState<"mac" | "windows" | "linux">("mac");

  useState(() => {
    const detected = detectOS();
    setOs(detected);
    if (detected === "mac" || detected === "windows" || detected === "linux") {
      setOsTab(detected);
    }
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Getting Started Guide</h1>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center mx-auto">
            <Music className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold">ToneMaster AI</h2>
          <p className="text-zinc-400 max-w-md mx-auto">
            Automate your guitar tone switching with MIDI Program Change — right from your browser.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: Music, title: "Timeline-Based Switching", desc: "Place triggers on a visual timeline and switch tones at precise moments.", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
            { icon: Monitor, title: "Direct MIDI Output", desc: "Send Program Change and Control Change messages to your amp modeler or DAW instantly.", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            { icon: Guitar, title: "Works with Any Gear", desc: "Compatible with any MIDI-capable hardware: Kemper, Axe-FX, Quad Cortex, HX Stomp, and more.", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
            { icon: Globe, title: "100% Browser-Based", desc: "No install required. Runs in Chrome, Edge, or Opera with Web MIDI API support.", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
          ].map((card) => (
            <div key={card.title} className={`rounded-xl border p-5 ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.color} mb-3`} />
              <h3 className={`text-sm font-semibold ${card.color} mb-1`}>{card.title}</h3>
              <p className="text-xs text-zinc-400">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Quick Start */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-zinc-800 pb-2">Quick Start</h2>
          <div className="flex gap-2">
            {(["mac", "windows", "linux"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setOsTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
                  osTab === t
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t === "mac" ? "macOS" : t === "windows" ? "Windows" : "Linux"}
              </button>
            ))}
          </div>

          {osTab === "mac" && <MacGuide />}
          {osTab === "windows" && <WindowsGuide />}
          {osTab === "linux" && <LinuxGuide />}
        </section>

        {/* How to Use */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-zinc-800 pb-2">How to Use</h2>
          <div className="space-y-3">
            {[
              { step: 1, title: "Connect MIDI Device", desc: "Plug in your amp modeler or audio interface via USB. Select the output port in the MIDI panel." },
              { step: 2, title: "Upload a Backing Track (Optional)", desc: "Add a backing track to see the waveform and time your tone switches precisely." },
              { step: 3, title: "Add Tone Triggers", desc: "Double-click on the timeline to place trigger points. Choose from 8 preset tones or enter a custom PC number." },
              { step: 4, title: "Hit Play", desc: "Press play and watch your tone switches happen automatically as the playback cursor crosses each trigger." },
              { step: 5, title: "Export & Share", desc: "Export your project as a MIDI file to use in any DAW or share with other musicians." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Use Cases */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-zinc-800 pb-2">Typical Use Cases</h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { title: "Live Performance", desc: "Pre-program tone changes for each section of your setlist. Never step on the wrong pedal again." },
              { title: "Practice with Backing Tracks", desc: "Load a backing track, place tone triggers, and practice switching tones automatically." },
              { title: "Studio / DAW Integration", desc: "Route MIDI via IAC Driver (macOS) or loopMIDI (Windows) to control VST plugins in your DAW." },
            ].map((uc) => (
              <div key={uc.title} className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <h3 className="text-sm font-semibold text-white mb-1">{uc.title}</h3>
                <p className="text-xs text-zinc-400">{uc.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white font-medium hover:from-green-600 hover:to-green-700 transition-all"
          >
            Back to ToneMaster →
          </Link>
        </div>
      </div>
    </div>
  );
}

function MacGuide() {
  return (
    <div className="space-y-3">
      <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5 space-y-2">
        <h3 className="text-sm font-semibold text-green-400">Option A: Direct USB Connection (Recommended)</h3>
        <p className="text-xs text-zinc-400">Plug your device via USB. It should appear directly in the MIDI output list — no configuration needed.</p>
      </div>
      <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2">
        <h3 className="text-sm font-semibold text-blue-400">Option B: Route to DAW via IAC Driver</h3>
        <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
          <li>Open Audio MIDI Setup (Applications → Utilities)</li>
          <li>Window → Show MIDI Studio</li>
          <li>Double-click IAC Driver</li>
          <li>Check &quot;Device is online&quot; → Apply</li>
          <li>Select IAC Bus 1 in ToneMaster</li>
          <li>In your DAW, select IAC Bus 1 as MIDI input</li>
          <li>Done! MIDI from ToneMaster flows into your DAW</li>
        </ol>
        <a href="https://support.apple.com/guide/audio-midi-setup/transfer-midi-information-between-apps-ams1013/mac" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline inline-block">
          Apple Guide: IAC Driver Setup ↗
        </a>
      </div>
    </div>
  );
}

function WindowsGuide() {
  return (
    <div className="space-y-3">
      <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5 space-y-2">
        <h3 className="text-sm font-semibold text-green-400">Option A: Direct USB Connection (Recommended)</h3>
        <p className="text-xs text-zinc-400">Plug your device via USB. It should appear directly in the MIDI output list.</p>
      </div>
      <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-500/5 space-y-2">
        <h3 className="text-sm font-semibold text-purple-400">Option B: Route to DAW via loopMIDI</h3>
        <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
          <li>Download loopMIDI from tobias-erichsen.de</li>
          <li>Install and run loopMIDI</li>
          <li>Click &quot;+&quot; to create a virtual port (e.g. ToneMaster)</li>
          <li>Select this port in ToneMaster</li>
          <li>Select this port as MIDI input in your DAW</li>
        </ol>
        <a href="https://www.tobias-erichsen.de/software/loopmidi.html" target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline inline-block">
          Download loopMIDI (Free) ↗
        </a>
      </div>
    </div>
  );
}

function LinuxGuide() {
  return (
    <div className="space-y-3">
      <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5 space-y-2">
        <h3 className="text-sm font-semibold text-green-400">Option A: Direct USB Connection</h3>
        <p className="text-xs text-zinc-400">Plug your device via USB. Use <code className="text-zinc-300 bg-zinc-800 px-1 rounded">aconnect -l</code> to verify.</p>
      </div>
      <div className="p-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5 space-y-2">
        <h3 className="text-sm font-semibold text-cyan-400">Option B: Virtual MIDI via ALSA</h3>
        <p className="text-xs text-zinc-400">Load the virtual MIDI kernel module:</p>
        <code className="block bg-zinc-900 text-xs text-zinc-300 p-2 rounded mt-1">
          sudo modprobe snd-virmidi
        </code>
        <p className="text-xs text-zinc-400 mt-2">Then use <code className="text-zinc-300 bg-zinc-800 px-1 rounded">aconnect</code> to link ports.</p>
      </div>
    </div>
  );
}
