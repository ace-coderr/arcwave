import type { Metadata } from "next";
import { Web3Provider } from "@/providers/Web3Provider";
import { Analytics } from "@vercel/analytics/react";
// @ts-ignore: CSS import side effects are handled by Next.js
import "./globals.css";

export const metadata: Metadata = {
  title: "ArcWave — USDC Payment Links on Arc Network",
  description: "Generate shareable USDC payment links on Arc Network. Powered by Circle.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Web3Provider>{children}</Web3Provider>
        <Analytics />
      </body>
    </html>
  );
}
