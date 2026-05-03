import type { Metadata } from "next";
import { Web3Provider } from "@/providers/Web3Provider";
import { Analytics } from "@vercel/analytics/react";
// @ts-ignore
import "./globals.css";

export const metadata: Metadata = {
  title: "Conduit — The Payment Channel for Web3",
  description: "Create shareable USDC payment links. Pay from any chain. Privacy-protected. Instant settlement on Arc Network.",
  icons: {
    icon: [{ url: "/conduit-icon.png", type: "image/png" }],
    apple: "/conduit-icon.png",
  },
  openGraph: {
    title: "Conduit — The Payment Channel for Web3",
    description: "Create a payment link, share it, get paid in USDC from any chain.",
    siteName: "Conduit",
    type: "website",
    images: [{ url: "/conduit-logo-black.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(localStorage.getItem('conduit-theme')==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()` }}/>
      </head>
      <body>
        <Web3Provider>{children}</Web3Provider>
        <Analytics />
      </body>
    </html>
  );
}
