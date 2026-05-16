"use client";

import { useAuthSync } from "@/hooks/useAuthSync";

export default function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  useAuthSync();
  return <>{children}</>;
}
