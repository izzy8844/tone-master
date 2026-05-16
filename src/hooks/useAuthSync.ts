"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useAuthStore } from "@/store/authStore";
import type { Tier, User } from "@/lib/types";

/**
 * Syncs Clerk user state into Zustand auth store.
 *
 * IMPORTANT: This hook calls useUser() from @clerk/nextjs and MUST only be
 * rendered inside <ClerkProvider>. It is exclusively used by <AuthSyncProvider>,
 * which AppProviders.tsx only renders when Clerk is configured.
 * Do NOT call this hook from components outside the Clerk tree.
 */
export function useAuthSync() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !clerkUser) {
      setAuth(null);
      return;
    }

    const rawTier = clerkUser.publicMetadata?.tier as string | undefined;
    const tier: Tier = rawTier === "pro" ? "pro" : "free";

    const user: User = {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
      name: clerkUser.fullName ?? clerkUser.firstName ?? undefined,
      avatarUrl: clerkUser.imageUrl,
    };

    setAuth(user, tier);
  }, [isLoaded, isSignedIn, clerkUser, setAuth]);
}
