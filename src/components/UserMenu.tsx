"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const isClerkConfigured =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("REPLACE_ME");

function ClerkUserMenu() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SignInButton, UserButton, useUser } = require("@clerk/nextjs") as typeof import("@clerk/nextjs");
  const { isLoaded, isSignedIn } = useUser();
  const tier = useAuthStore((s) => s.tier);

  if (!isLoaded) {
    return <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />;
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="flex items-center gap-1.5 border border-green-500/30 bg-green-500/10 text-green-400 rounded-lg px-3 py-1.5 text-xs hover:bg-green-500/20 hover:text-green-300 transition-colors">
          <LogIn className="w-3.5 h-3.5" />
          Login
        </button>
      </SignInButton>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {tier === "pro" && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase tracking-wider">
          Pro
        </span>
      )}
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox: "w-8 h-8",
          },
        }}
      />
    </div>
  );
}

function GuestUserMenu() {
  return (
    <Link
      href="/sign-in"
      className="flex items-center gap-1.5 border border-green-500/30 bg-green-500/10 text-green-400 rounded-lg px-3 py-1.5 text-xs hover:bg-green-500/20 hover:text-green-300 transition-colors"
    >
      <LogIn className="w-3.5 h-3.5" />
      Login
    </Link>
  );
}

export default function UserMenu() {
  if (!isClerkConfigured) return <GuestUserMenu />;
  return <ClerkUserMenu />;
}
