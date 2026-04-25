"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useEffect, useState } from "react";

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
  }, []);

  const short = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <nav className="border-b border-arc-border bg-arc-card/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-arc-blue flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path
                d="M3 17 C6 10, 10 6, 12 12 C14 18, 18 14, 21 7"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="font-bold text-arc-text text-base">
            Arc<span className="text-arc-blue">Wave</span>
          </span>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-arc-border text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-arc-green animate-pulse" />
            <span className="text-arc-muted">ARC TESTNET</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:block text-xs text-arc-muted hover:text-arc-text transition-colors px-3 py-1.5 rounded-lg hover:bg-arc-border/30"
          >
            Faucet →
          </a>

          <a
            href="https://testnet.arcscan.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:block text-xs text-arc-muted hover:text-arc-text transition-colors px-3 py-1.5 rounded-lg hover:bg-arc-border/30"
          >
            Explorer →
          </a>

          {mounted && (
            isConnected ? (
              <button
                onClick={() => disconnect()}
                className="px-4 py-2 bg-arc-card border border-arc-border text-arc-text text-sm rounded-lg hover:border-arc-blue/40 transition-colors font-mono"
              >
                {short}
              </button>
            ) : (
              <button
                onClick={() => connect({ connector: injected() })}
                className="px-4 py-2 bg-arc-blue hover:bg-arc-blue-light text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Connect Wallet
              </button>
            )
          )}
        </div>

      </div>
    </nav>
  );
}