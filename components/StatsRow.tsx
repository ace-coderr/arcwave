"use client";

import { useAccount, useBalance } from "wagmi";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { arcTestnet } from "@/lib/arcChain";

interface StatsRowProps {
  totalLinks: number;
  completedLinks: number;
  totalEarned: string;
}

const STATS = (bal: string, totalLinks: number, completedLinks: number, totalEarned: string) => [
  {
    label: "Wallet Balance",
    value: bal,
    sub: "Available to spend",
    color: "#3b82f6",
    iconBg: "rgba(59,130,246,0.1)",
    iconBorder: "rgba(59,130,246,0.2)",
    icon: (
      <svg viewBox="0 0 18 18" fill="#3b82f6" width="16" height="16">
        <path d="M2 5a2 2 0 012-2h10a2 2 0 012 2v1H2V5zm0 3h14v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8zm9 2a1 1 0 100 2h1a1 1 0 100-2h-1z" />
      </svg>
    ),
  },
  {
    label: "Payment Links",
    value: totalLinks.toString(),
    sub: `${completedLinks} completed`,
    color: "#8b5cf6",
    iconBg: "rgba(139,92,246,0.1)",
    iconBorder: "rgba(139,92,246,0.2)",
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="#8b5cf6" strokeWidth="1.5" width="16" height="16">
        <path d="M10.5 7.5a3.5 3.5 0 010 4.95l-1.5 1.5a3.5 3.5 0 01-4.95-4.95l.75-.75" strokeLinecap="round" />
        <path d="M7.5 10.5a3.5 3.5 0 010-4.95l1.5-1.5a3.5 3.5 0 014.95 4.95l-.75.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Total Earned",
    value: totalEarned !== "0" ? `${parseFloat(totalEarned).toLocaleString()} USDC` : "—",
    sub: "From completed payments",
    color: "#10b981",
    iconBg: "rgba(16,185,129,0.1)",
    iconBorder: "rgba(16,185,129,0.2)",
    icon: (
      <svg viewBox="0 0 18 18" fill="#10b981" width="16" height="16">
        <path fillRule="evenodd" d="M9 1a8 8 0 100 16A8 8 0 009 1zm.75 4.5v.5h.75a.75.75 0 010 1.5H9.75v.5a.75.75 0 01-1.5 0V7.5H7.5a.75.75 0 010-1.5h.75v-.5a.75.75 0 011.5 0zm-3 5.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: "Network",
    value: "Arc Testnet",
    sub: "Chain ID 5042002",
    color: "#06b6d4",
    iconBg: "rgba(6,182,212,0.1)",
    iconBorder: "rgba(6,182,212,0.2)",
    icon: (
      <svg viewBox="0 0 18 18" fill="#06b6d4" width="16" height="16">
        <path fillRule="evenodd" d="M9 1a8 8 0 100 16A8 8 0 009 1zM4.5 9a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zm4.5-2a2 2 0 100 4 2 2 0 000-4z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export function StatsRow({ totalLinks, completedLinks, totalEarned }: StatsRowProps) {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);

  const { data: balance } = useBalance({ address, chainId: arcTestnet.id });

  useEffect(() => { setMounted(true); }, []);

  const bal = balance
    ? `${parseFloat(formatEther(balance.value)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
    : "0.00 USDC";

  const stats = STATS(bal, totalLinks, completedLinks, totalEarned);

  return (
    <div className="stats-grid">
      {stats.map((s) => (
        <div key={s.label} className="stat-card animate-fade-up">
          <div className="stat-card-top-line" style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }} />
          <div
            className="stat-icon-wrap"
            style={{ background: s.iconBg, border: `1px solid ${s.iconBorder}` }}
          >
            {s.icon}
          </div>
          <div className="stat-value">
            {mounted ? s.value : <span className="skeleton stat-skeleton" />}
          </div>
          <div className="stat-label">{s.label}</div>
          <div className="stat-sub" style={{ color: s.color }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
