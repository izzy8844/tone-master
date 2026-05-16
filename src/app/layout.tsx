import type { Metadata } from "next";
import "./globals.css";

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
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
