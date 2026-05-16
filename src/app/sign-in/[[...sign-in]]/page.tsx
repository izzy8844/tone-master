"use client";

import Link from "next/link";

const isClerkConfigured =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("REPLACE_ME");

function ClerkSignInPage() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SignIn } = require("@clerk/nextjs") as typeof import("@clerk/nextjs");
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <SignIn
        routing="hash"
        forceRedirectUrl="/"
        appearance={{
          elements: {
            card: "bg-[#18181b] border border-zinc-700",
            formButtonPrimary: "bg-green-500 hover:bg-green-600",
          },
        }}
      />
    </div>
  );
}

function FallbackSignInPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#18181b] rounded-2xl border border-zinc-700 p-6 text-center space-y-4">
        <h1 className="text-xl font-semibold text-white">Sign In</h1>
        <p className="text-sm text-zinc-400">
          Authentication is not configured. Set <code className="text-zinc-300 bg-zinc-800 px-1 rounded">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in your environment variables.
        </p>
        <Link
          href="/"
          className="inline-block text-sm text-green-400 hover:underline"
        >
          ← Back to ToneMaster
        </Link>
      </div>
    </div>
  );
}

export default function SignInPage() {
  if (!isClerkConfigured) return <FallbackSignInPage />;
  return <ClerkSignInPage />;
}
