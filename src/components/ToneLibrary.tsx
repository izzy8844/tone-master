"use client";

import { useState } from "react";
import { Search } from "lucide-react";

const TONE_CATEGORIES = [
  {
    name: "Clean",
    tones: [
      { name: "Clean Chorus", program: 1 },
      { name: "Clean Warm", program: 2 },
      { name: "Jazz Clean", program: 3 },
      { name: "Funk Clean", program: 4 },
      { name: "Acoustic Sim", program: 5 },
    ],
  },
  {
    name: "Overdrive",
    tones: [
      { name: "Crunch Overdrive", program: 25 },
      { name: "Blues Overdrive", program: 26 },
      { name: "Tube Screamer", program: 27 },
      { name: "Classic Rock", program: 28 },
    ],
  },
  {
    name: "Distortion",
    tones: [
      { name: "Metal High Gain", program: 29 },
      { name: "Lead Distortion", program: 30 },
      { name: "Thrash Metal", program: 31 },
      { name: "Djent", program: 32 },
    ],
  },
  {
    name: "Effects",
    tones: [
      { name: "Ambient Reverb", program: 8 },
      { name: "Shimmer Delay", program: 9 },
      { name: "Chorus Flange", program: 10 },
      { name: "Wah Auto", program: 11 },
    ],
  },
];

export default function ToneLibraryContent() {
  const [search, setSearch] = useState("");

  const filtered = TONE_CATEGORIES.map((cat) => ({
    ...cat,
    tones: cat.tones.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.tones.length > 0);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search tones..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
        />
      </div>

      {/* Categories */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-zinc-500 py-8">
          No tones match &quot;{search}&quot;
        </p>
      ) : (
        filtered.map((cat) => (
          <div key={cat.name}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              {cat.name}
            </h3>
            <div className="space-y-1">
              {cat.tones.map((t) => (
                <div
                  key={t.program}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <span className="text-sm text-zinc-300">{t.name}</span>
                  <span className="text-xs text-zinc-500 font-mono">
                    PC {t.program}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
