import type { Metadata } from "next";
import { Web3Provider } from "@/providers/Web3Provider";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conduit — The Payment Channel for Web3",
  description:
    "Create shareable USDC payment links on Arc Network. Pay from any chain. Privacy-protected. One-time use. No sign-ups.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Conduit — The Payment Channel for Web3",
    description: "Create a payment link, share it, get paid in USDC from any chain.",
    url: "https://arcwave-k8k3.vercel.app",
    siteName: "Conduit",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Conduit — The Payment Channel for Web3",
    description: "Create a payment link, share it, get paid in USDC from any chain.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme initialization — prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('conduit-theme');
                  if (theme === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch(e) {}
              })();
            `,
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
