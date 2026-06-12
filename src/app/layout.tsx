import type { Metadata } from "next";
import { Archivo, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700"],
});

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-barlow",
  weight: ["600", "700", "800"],
});

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
      <body className={`${archivo.variable} ${barlow.variable} grain antialiased`}>
        {children}
      </body>
    </html>
  );
}
