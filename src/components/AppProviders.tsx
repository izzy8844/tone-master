"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import AuthSyncProvider from "@/components/AuthSyncProvider";
import GateModalProvider from "@/components/GateModalProvider";
import ToastContainer from "@/components/Toast";

const isClerkConfigured =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("REPLACE_ME");

export default function AppProviders({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured) {
    return (
      <>
        {children}
        <GateModalProvider />
        <ToastContainer />
      </>
    );
  }

  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#1db954",
          colorBackground: "#18181b",
          colorInputBackground: "#27272a",
          colorText: "#ededed",
        },
      }}
    >
      <AuthSyncProvider>
        {children}
      </AuthSyncProvider>
      <GateModalProvider />
      <ToastContainer />
    </ClerkProvider>
  );
}
