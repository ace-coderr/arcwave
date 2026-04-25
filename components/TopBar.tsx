"use client";

import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const PAGE_LABELS: Record<string, string> = {
  "/":             "Dashboard",
  "/links":        "Payment Links",
  "/transactions": "Transactions",
  "/analytics":    "Analytics",
};

export function TopBar() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");
  const { address, isConnected } = useAccount();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const update = () =>
      setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const currentPage = PAGE_LABELS[pathname] ?? "Dashboard";

  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        <span className="topbar-breadcrumb-parent">ArcWave</span>
        <span className="topbar-breadcrumb-sep">›</span>
        <span className="topbar-breadcrumb-current">{currentPage}</span>
      </div>

      <div className="topbar-right">
        <div className="topbar-network-badge">
          <span className="topbar-network-dot pulse-dot" />
          <span className="topbar-network-label">Arc Testnet</span>
        </div>

        {mounted && (
          <span className="topbar-time">{time}</span>
        )}

        {mounted && isConnected && address && (
          <div className="topbar-wallet-badge">
            <div className="topbar-wallet-avatar" />
            <span className="topbar-wallet-address">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
