"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Save, Cloud, CloudOff, FolderOpen, Settings, HelpCircle,
  Pencil,
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { usePlaybackStore } from "@/store/playbackStore";
import { useAuthStore } from "@/store/authStore";
import { useGatekeeper } from "@/hooks/useGatekeeper";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useMidiTrigger } from "@/hooks/useMidiTrigger";
import { connectWS, disconnectWS, onWSMessage } from "@/lib/ws";
import PlaybackControls from "@/components/PlaybackControls";
import Timeline from "@/components/Timeline";
import TriggerList from "@/components/TriggerList";
import ToneAddDialog from "@/components/ToneAddDialog";
import MidiSetup from "@/components/MidiSetup";
import ExportButton from "@/components/ExportButton";
import UserMenu from "@/components/UserMenu";
import { toast } from "@/components/Toast";

export default function Home() {
  const projectName = useProjectStore((s) => s.projectName);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const isDemo = useProjectStore((s) => s.isDemo);
  const setPlaying = usePlaybackStore((s) => s.setPlaying);
  const setCurrentTick = usePlaybackStore((s) => s.setCurrentTick);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const { guard } = useGatekeeper();
  const { saveToCloud, syncStatus } = useCloudSync();
  useMidiTrigger();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(projectName);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogTime, setAddDialogTime] = useState(0);

  // WebSocket connection
  useEffect(() => {
    connectWS();
    const unsub = onWSMessage((msg) => {
      if (msg.type === "playback_state") {
        const isPlaying = msg.is_playing as boolean;
        const currentTime = msg.current_time as number;
        setPlaying(isPlaying);
        setCurrentTick(currentTime);
      }
    });
    return () => {
      unsub();
      disconnectWS();
    };
  }, [setPlaying, setCurrentTick]);

  const handleSave = () => {
    guard("save_project", () => {
      if (isSignedIn) {
        saveToCloud();
        toast.success("Project saved to cloud");
      } else {
        toast.info("Signed out — saving locally");
      }
    });
  };

  const handleAddTrigger = useCallback(
    (time: number) => {
      setAddDialogTime(time);
      setAddDialogOpen(true);
    },
    []
  );

  const SyncIcon = syncStatus === "syncing" ? Cloud : syncStatus === "error" ? CloudOff : Save;

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {isEditingName ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => {
                setProjectName(editName || "Untitled Project");
                setIsEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setProjectName(editName || "Untitled Project");
                  setIsEditingName(false);
                }
              }}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setEditName(projectName);
                setIsEditingName(true);
              }}
              className="flex items-center gap-2 group"
            >
              <h1 className="text-lg font-semibold text-white truncate max-w-[300px]">
                {projectName}
              </h1>
              <Pencil className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
            </button>
          )}
          {isDemo && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase tracking-wider">
              Demo
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <PlaybackControls />

          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-green-400 hover:border-green-500 text-xs transition-colors ${syncStatus === "syncing" ? "animate-pulse" : ""}`}
            title="Save project"
          >
            <SyncIcon className="w-3.5 h-3.5" />
          </button>

          <ExportButton />

          <Link
            href="/projects"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Projects
          </Link>

          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Tones
          </Link>

          <Link
            href="/guide"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Guide
          </Link>

          <UserMenu />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col gap-4 p-6 overflow-hidden">
        <Timeline onAddTrigger={handleAddTrigger} />

        <div className="flex gap-4">
          <TriggerList />
          <div className="w-72 shrink-0">
            <MidiSetup />
          </div>
        </div>
      </main>

      {/* Dialog */}
      <ToneAddDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        time={addDialogTime}
      />
    </>
  );
}
