import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "@/components/AppProviders";

export const metadata: Metadata = {
  title: "ToneMaster",
  description: "Guitar tone switching app — switch tones at the right moment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
