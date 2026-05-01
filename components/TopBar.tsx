"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/links": "Payment Links",
  "/transactions": "Transactions",
  "/analytics": "Analytics",
};

export function TopBar() {
  const [time, setTime] = useState("");
  const [mounted, setMounted] = useState(false);
  const { address } = useAccount();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        <span className="topbar-breadcrumb-parent">Conduit</span>
        <span className="topbar-breadcrumb-sep">/</span>
        <span className="topbar-breadcrumb-current">{LABELS[pathname] ?? "Dashboard"}</span>
      </div>
      <div className="topbar-right">
        <div className="topbar-network-badge">
          <span className="topbar-network-dot pulse-dot"/>
          <span className="topbar-network-label">Arc Testnet</span>
        </div>
        {mounted && <span className="topbar-time">{time}</span>}
        {mounted && address && (
          <div className="topbar-wallet-badge">
            <div className="topbar-wallet-avatar"/>
            <span className="topbar-wallet-address">{address.slice(0,6)}...{address.slice(-4)}</span>
          </div>
        )}
      </div>
    </header>
  );
}
