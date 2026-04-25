import type { Metadata } from "next";
import { Web3Provider } from "@/providers/Web3Provider";
import { Analytics } from "@vercel/analytics/react";
// @ts-ignore
import "./globals.css";

export const metadata: Metadata = {
  title: "ArcWave — USDC Payment Links on Arc Network",
  description:
    "Generate shareable USDC payment links on Arc Network. Create a link, share it, get paid in 30 minutes. Powered by Circle.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "ArcWave — USDC Payment Links",
    description: "Create shareable USDC payment links on Arc Network. Simple, fast, decentralized.",
    url: "https://arcwave-k8k3.vercel.app",
    siteName: "ArcWave",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ArcWave — USDC Payment Links",
    description: "Create shareable USDC payment links on Arc Network.",
  },
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
