import type { Metadata } from "next";
import { Web3Provider } from "@/providers/Web3Provider";
import { Analytics } from "@vercel/analytics/react";
// @ts-ignore
import "./globals.css";

export const metadata: Metadata = {
  title: "Conduit - USDC Payment Links on Arc Network",
  description: "Create shareable USDC payment links in seconds. Get paid from any chain — Base, Ethereum, Arbitrum and more. Privacy-first with stealth mode. Instant settlement on Arc Network.",
  keywords: ["USDC", "payment links", "Web3 payments", "Arc Network", "crypto payments", "stealth payments", "Circle"],
  authors: [{ name: "Conduit" }],
  creator: "Conduit",
  metadataBase: new URL("https://conduit-pay.vercel.app"),
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "Conduit - USDC Payment Links on Arc Network",
    description: "Create a payment link, share it, get paid in USDC from any chain. No sign-up. No KYC. Instant.",
    siteName: "Conduit",
    url: "https://conduit-pay.vercel.app",
    type: "website",
    images: [{
      url: "/conduit-logo-white.png",
      width: 800,
      height: 400,
      alt: "Conduit - USDC Payment Links",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Conduit - USDC Payment Links on Arc Network",
    description: "Create a payment link, share it, get paid in USDC from any chain. No sign-up. No KYC. Instant.",
    images: ["/conduit-logo-white.png"],
    creator: "@conduit_pay",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('conduit-theme')==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <Web3Provider>{children}</Web3Provider>
        <Analytics />
      </body>
    </html>
  );
}
