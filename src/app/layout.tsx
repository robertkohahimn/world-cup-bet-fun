import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WCBet.fun — World Cup 2026 betting with friends",
  description:
    "Create a room, invite friends with a code, set the spread, and battle for points all tournament long.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
