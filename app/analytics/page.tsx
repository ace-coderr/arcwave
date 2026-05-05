"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { NavBar } from "@/components/NavBar";
import { PnlCard } from "@/components/PnlCard";

interface PaymentLink {
  id: string;
  title: string;
  amount: string;
  status: string;
  txHash?: string;
  paidAt?: string;
  createdAt: string;
  stealthAddress?: string;
  isEscrow?: boolean;
}

interface EscrowLink {
  id: string;
  title: string;
  amount: string;
  status: string;
  paidAt?: string;
  confirmedAt?: string;
  createdAt: string;
  releaseDeadline?: string;
  disputeReason?: string;
}

type Range = "7d" | "30d" | "all";

const MilestoneIcons: Record<string, JSX.Element> = {
  first_payment: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#00E5A0" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  five_payments: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M12 3c3.87 2.93 9 3.1 9 3.1S21 15 12 21C3 15 3 6.1 3 6.1S8.13 5.93 12 3z" stroke="#f5a623" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  ten_payments: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#00E5A0" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  fifty_payments: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  earn_10: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><circle cx="12" cy="12" r="9" stroke="#00E5A0" strokeWidth="1.5"/><path d="M12 7v10M9 9.5C9 8.12 10.34 7 12 7s3 1.12 3 2.5S13.66 12 12 12s-3 1.12-3 2.5S9.34 17 12 17s3-1.12 3-2.5" stroke="#00E5A0" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  earn_100: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="#00E5A0" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  earn_1000: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M12 2l2.4 4.8 5.6.8-4 3.9.9 5.5L12 14.5l-4.9 2.5.9-5.5L4 7.6l5.6-.8L12 2z" stroke="#f5a623" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  stealth_5: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M12 5C7 5 2.73 7.11 1 10.5c1.73 3.39 6 5.5 11 5.5s9.27-2.11 11-5.5C21.27 7.11 17 5 12 5z" stroke="#a78bfa" strokeWidth="1.5"/><circle cx="12" cy="10.5" r="3" stroke="#a78bfa" strokeWidth="1.5"/><path d="M3 20l18-18" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  first_escrow: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#5b8ff9" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#5b8ff9" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  perfect: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M12 3l1.5 4.5H18l-3.75 2.73 1.43 4.4L12 12.1l-3.68 2.53 1.43-4.4L6 7.5h4.5L12 3z" stroke="#5b8ff9" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 21l4-3 4 3" stroke="#5b8ff9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

const MILESTONES = [
  { id: "first_payment", label: "First Payment", desc: "Received your first USDC", req: (c: number) => c >= 1 },
  { id: "five_payments", label: "On a Roll", desc: "5 payments received", req: (c: number) => c >= 5 },
  { id: "ten_payments", label: "Power User", desc: "10 payments received", req: (c: number) => c >= 10 },
  { id: "fifty_payments", label: "Veteran", desc: "50 payments received", req: (c: number) => c >= 50 },
  { id: "earn_10", label: "First 10 USDC", desc: "Earned 10 USDC total", req: (_: number, earned: number) => earned >= 10 },
  { id: "earn_100", label: "Century Club", desc: "Earned 100 USDC total", req: (_: number, earned: number) => earned >= 100 },
  { id: "earn_1000", label: "Grand Club", desc: "Earned 1000 USDC total", req: (_: number, earned: number) => earned >= 1000 },
  { id: "stealth_5", label: "Ghost Mode", desc: "5 stealth payments", req: (_: number, __: number, stealth: number) => stealth >= 5 },
  { id: "first_escrow", label: "Trusted Seller", desc: "First escrow completed", req: (_: number, __: number, ___: number, ____: number, _____: number, escrow: number) => escrow >= 1 },
  { id: "perfect", label: "Perfect Record", desc: "100% completion rate", req: (_: number, __: number, ___: number, rate: number, total: number) => rate === 100 && total >= 3 },
];

export default function AnalyticsPage() {
  const { address, isConnected } = useAccount();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [escrows, setEscrows] = useState<EscrowLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [range, setRange] = useState<Range>("30d");

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const [linksRes, escrowsRes] = await Promise.all([
        fetch(`/api/links?address=${address}`),
        fetch(`/api/escrow?address=${address}`),
      ]);
      if (linksRes.ok) {
        const data = await linksRes.json();
        setLinks(data.links ?? []);
      }
      if (escrowsRes.ok) {
        const data = await escrowsRes.json();
        setEscrows(data.escrows ?? []);
      }
    } catch {}
    finally { setIsLoading(false); }
  }, [address]);

  useEffect(() => { if (isConnected && address) fetchData(); }, [isConnected, address, fetchData]);

  // Payment link stats
  const completed = links.filter(l => l.status === "COMPLETED" && !l.isEscrow);
  const escrowCompleted = links.filter(l => l.status === "COMPLETED" && l.isEscrow);
  const allCompleted = links.filter(l => l.status === "COMPLETED");
  const active = links.filter(l => l.status === "ACTIVE");
  const expired = links.filter(l => l.status === "EXPIRED");

  // Escrow stats
  const releasedEscrows = escrows.filter(e => ["RELEASED", "CONFIRMED"].includes(e.status));
  const holdingEscrows = escrows.filter(e => e.status === "HOLDING");
  const disputedEscrows = escrows.filter(e => e.status === "DISPUTED");
  const totalEscrowEarned = releasedEscrows.reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalHeld = holdingEscrows.reduce((s, e) => s + parseFloat(e.amount), 0);

  const totalEarned = allCompleted.reduce((s, l) => s + parseFloat(l.amount), 0);
  const completionRate = links.length > 0 ? Math.round((allCompleted.length / links.length) * 100) : 0;
  const avgPayment = allCompleted.length > 0 ? totalEarned / allCompleted.length : 0;
  const biggestPayment = allCompleted.length > 0 ? Math.max(...allCompleted.map(l => parseFloat(l.amount))) : 0;
  const stealthCompleted = completed.filter(l => l.stealthAddress).length;
  const stealthPct = links.length > 0 ? Math.round((links.filter(l => l.stealthAddress).length / links.length) * 100) : 0;

  const dayCount = [0, 0, 0, 0, 0, 0, 0];
  allCompleted.forEach(l => { dayCount[new Date(l.paidAt ?? l.createdAt).getDay()]++; });
  const busyDayIdx = dayCount.indexOf(Math.max(...dayCount));
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const busyDay = allCompleted.length > 0 ? DAY_NAMES[busyDayIdx] : "—";

  const avgHours = (() => {
    const withPaid = allCompleted.filter(l => l.paidAt);
    if (!withPaid.length) return null;
    const total = withPaid.reduce((s, l) => s + (new Date(l.paidAt!).getTime() - new Date(l.createdAt).getTime()) / 3600000, 0);
    return total / withPaid.length;
  })();

  const chartDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const chartData = (() => {
    const days = [];
    const now = new Date();
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayLinks = allCompleted.filter(l => (l.paidAt ?? l.createdAt)?.startsWith(dateStr));
      const dayEscrows = releasedEscrows.filter(e => (e.confirmedAt ?? e.paidAt ?? e.createdAt)?.startsWith(dateStr));
      const dayAmount = dayLinks.reduce((s, l) => s + parseFloat(l.amount), 0)
        + dayEscrows.reduce((s, e) => s + parseFloat(e.amount), 0);
      days.push({
        date: dateStr,
        label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        amount: dayAmount,
        count: dayLinks.length + dayEscrows.length,
      });
    }
    return days;
  })();

  const rangeStart = new Date();
  if (range !== "all") rangeStart.setDate(rangeStart.getDate() - chartDays);
  const rangeCompleted = range === "all" ? allCompleted : allCompleted.filter(l => new Date(l.paidAt ?? l.createdAt) >= rangeStart);
  const rangeEarned = rangeCompleted.reduce((s, l) => s + parseFloat(l.amount), 0);
  const maxAmount = Math.max(...chartData.map(d => d.amount), 1);

  const earnedMilestones = MILESTONES.filter(m => m.req(allCompleted.length, totalEarned, stealthCompleted, completionRate, links.length, releasedEscrows.length));
  const lockedMilestones = MILESTONES.filter(m => !m.req(allCompleted.length, totalEarned, stealthCompleted, completionRate, links.length, releasedEscrows.length));

  const streak = (() => {
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      if (allCompleted.some(l => (l.paidAt ?? l.createdAt)?.startsWith(ds))) s++;
      else if (i > 0) break;
    }
    return s;
  })();

  const topLinks = [...allCompleted].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 5);
  const recent = [...allCompleted].sort((a, b) => new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime()).slice(0, 8);

  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" });

  return (
    <div className="app">
      <NavBar/>
      <div className="page-wrap">

        <div className="page-header">
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Your payment performance</p>
        </div>

        {mounted && !isConnected && (
          <div className="empty" style={{ paddingTop: 80 }}>
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <p className="empty-title">Connect your wallet</p>
            <p className="empty-sub">Connect to view your analytics</p>
          </div>
        )}

        {mounted && isConnected && isLoading && <div className="loading-wrap"><div className="page-spinner"/></div>}

        {mounted && isConnected && !isLoading && (
          <>
            {/* Streak banner */}
            {streak > 1 && (
              <div style={{ background: "linear-gradient(135deg, rgba(0,229,160,.12), rgba(0,229,160,.04))", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,229,160,.15)", border: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                    <path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z" stroke="#00E5A0" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M12 12c0 3-2 4-2 6a2 2 0 004 0c0-2-2-3-2-6z" fill="#00E5A0" opacity=".3"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "var(--c)" }}>{streak}-day payment streak!</p>
                  <p style={{ fontSize: 12, color: "var(--ink-3)" }}>You've received payments {streak} days in a row</p>
                </div>
              </div>
            )}

            {/* Main stats */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              {[
                { label: "Total Earned", value: fmt(totalEarned), unit: "USDC", sub: `${allCompleted.length} payments`, color: "var(--c)" },
                { label: "Completion Rate", value: `${completionRate}`, unit: "%", sub: `${links.length} total links`, color: completionRate >= 70 ? "var(--c)" : completionRate >= 40 ? "var(--warning)" : "var(--danger)" },
                { label: "Biggest Payment", value: fmt(biggestPayment), unit: "USDC", sub: "single payment", color: "var(--info)" },
                { label: "Avg Payment", value: fmt(avgPayment), unit: "USDC", sub: "per completed link", color: "var(--warning)" },
              ].map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="stat-card-line" style={{ background: s.color }}/>
                  <div className="stat-value">{s.value}<span style={{ fontSize: 13, color: s.color, marginLeft: 4, fontFamily: "IBM Plex Mono, monospace" }}>{s.unit}</span></div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-sub">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Escrow stats */}
            {(escrows.length > 0) && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><rect x="2" y="6" width="12" height="9" rx="1.5" stroke="#5b8ff9" strokeWidth="1.3"/><path d="M5 6V4.5a3 3 0 016 0V6" stroke="#5b8ff9" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#5b8ff9", letterSpacing: ".06em", fontFamily: "IBM Plex Mono, monospace" }}>ESCROW</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                  {[
                    { label: "Escrow Earned", value: fmt(totalEscrowEarned), unit: "USDC", color: "#5b8ff9" },
                    { label: "Currently Held", value: fmt(totalHeld), unit: "USDC", color: "var(--warning)" },
                    { label: "Completed", value: releasedEscrows.length.toString(), unit: "", color: "var(--c)" },
                    { label: "Disputed", value: disputedEscrows.length.toString(), unit: "", color: disputedEscrows.length > 0 ? "var(--danger)" : "var(--ink-3)" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "var(--surface)", border: `1px solid ${s.label === "Disputed" && disputedEscrows.length > 0 ? "rgba(240,62,95,.3)" : "var(--stroke)"}`, borderRadius: "var(--r-lg)", padding: "14px 18px", boxShadow: "var(--elev-1)" }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "IBM Plex Mono, monospace", marginBottom: 4 }}>
                        {s.value}{s.unit && <span style={{ fontSize: 11, marginLeft: 4 }}>{s.unit}</span>}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Extra stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Most Active Day", value: busyDay, icon: <svg viewBox="0 0 20 20" fill="none" width="20" height="20"><rect x="3" y="4" width="14" height="13" rx="2" stroke="var(--c)" strokeWidth="1.3"/><path d="M7 2v4M13 2v4M3 9h14" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round"/></svg> },
                { label: "Avg Time to Pay", value: avgHours !== null ? (avgHours < 1 ? `${Math.round(avgHours * 60)}m` : `${Math.round(avgHours)}h`) : "—", icon: <svg viewBox="0 0 20 20" fill="none" width="20" height="20"><circle cx="10" cy="11" r="7" stroke="var(--c)" strokeWidth="1.3"/><path d="M10 8v3l2 1.5" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round"/><path d="M7 2h6" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round"/></svg> },
                { label: "Stealth Usage", value: `${stealthPct}%`, icon: <svg viewBox="0 0 20 20" fill="none" width="20" height="20"><rect x="4" y="9" width="12" height="9" rx="2" stroke="var(--c)" strokeWidth="1.3"/><path d="M7 9V7a3 3 0 016 0v2" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round"/></svg> },
              ].map((s) => (
                <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-lg)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "var(--elev-1)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--c-dim)", border: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace" }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, marginTop: 2 }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Volume chart */}
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card-head" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div className="card-head-icon">
                    <svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M2 14l4-4 4 2 4-6 4 2" stroke="var(--c)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <div className="card-title">Volume Chart</div>
                    <div className="card-subtitle">{rangeCompleted.length} payments · {fmt(rangeEarned)} USDC {range !== "all" ? `in last ${chartDays} days` : "all time"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, background: "var(--bg)", borderRadius: "var(--r-sm)", padding: 3 }}>
                  {(["7d", "30d", "all"] as Range[]).map(r => (
                    <button key={r} onClick={() => setRange(r)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: range === r ? "var(--surface)" : "transparent", color: range === r ? "var(--ink-1)" : "var(--ink-3)", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, cursor: "pointer", boxShadow: range === r ? "var(--elev-1)" : "none", transition: "all .15s" }}>{r}</button>
                  ))}
                </div>
              </div>
              <div className="card-body">
                {allCompleted.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-3)", fontSize: 13 }}>No completed payments yet</div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 140, marginBottom: 8 }}>
                      {chartData.map((day, i) => (
                        <div key={day.date} title={`${day.label}: ${fmt(day.amount)} USDC (${day.count} payments)`} style={{ flex: 1, height: `${Math.max((day.amount / maxAmount) * 100, day.amount > 0 ? 3 : 1.5)}%`, background: day.amount > 0 ? (i === chartData.length - 1 ? "var(--c)" : "rgba(0,229,160,.4)") : "var(--raised)", borderRadius: "3px 3px 0 0", transition: "height .4s ease", cursor: day.amount > 0 ? "pointer" : "default", minHeight: 2 }}/>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      {chartData.filter((_, i) => i % (chartDays <= 7 ? 1 : chartDays <= 30 ? 5 : 10) === 0 || i === chartData.length - 1).map(day => (
                        <span key={day.date} style={{ fontSize: 9, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{day.label}</span>
                      ))}
                    </div>
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--stroke)", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 12, height: 3, borderRadius: 2, background: "var(--c)" }}/>
                        <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>Daily volume (incl. escrow)</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Peak: <span style={{ color: "var(--c)", fontWeight: 700, fontFamily: "IBM Plex Mono, monospace" }}>{fmt(maxAmount)} USDC</span></div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Period total: <span style={{ color: "var(--ink-1)", fontWeight: 700, fontFamily: "IBM Plex Mono, monospace" }}>{fmt(rangeEarned)} USDC</span></div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Milestones */}
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card-head">
                <div className="card-head-icon">
                  <svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M10 2l2.4 4.8 5.6.8-4 3.9.9 5.5L10 14.5l-4.9 2.5.9-5.5L2 7.6l5.6-.8L10 2z" stroke="var(--c)" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                </div>
                <div><div className="card-title">Milestones</div><div className="card-subtitle">{earnedMilestones.length} of {MILESTONES.length} unlocked</div></div>
              </div>
              <div className="card-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {earnedMilestones.map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(0,229,160,.07)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)" }}>
                      <div style={{ flexShrink: 0 }}>{MilestoneIcons[m.id]}</div>
                      <div><p style={{ fontSize: 12, fontWeight: 800, color: "var(--c)" }}>{m.label}</p><p style={{ fontSize: 11, color: "var(--ink-3)" }}>{m.desc}</p></div>
                    </div>
                  ))}
                  {lockedMilestones.map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: "var(--r-md)", opacity: 0.4 }}>
                      <div style={{ flexShrink: 0, filter: "grayscale(1)" }}>{MilestoneIcons[m.id]}</div>
                      <div><p style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-2)" }}>{m.label}</p><p style={{ fontSize: 11, color: "var(--ink-3)" }}>{m.desc}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div className="card">
                <div className="card-head">
                  <div className="card-head-icon"><svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M10 2l2.4 4.8 5.6.8-4 3.9.9 5.5L10 14.5l-4.9 2.5.9-5.5L2 7.6l5.6-.8L10 2z" stroke="var(--c)" strokeWidth="1.3" strokeLinejoin="round"/></svg></div>
                  <div><div className="card-title">Top Links</div><div className="card-subtitle">By amount received</div></div>
                </div>
                <div style={{ padding: "0 0 8px" }}>
                  {topLinks.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>No completed payments yet</div>
                  ) : topLinks.map((l, i) => (
                    <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < topLinks.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                      <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", width: 16, flexShrink: 0 }}>#{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</p>
                          {l.isEscrow && <span style={{ fontSize: 8, color: "#5b8ff9", background: "rgba(91,143,249,.12)", border: "1px solid rgba(91,143,249,.25)", borderRadius: 3, padding: "1px 4px", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, flexShrink: 0 }}>ESCROW</span>}
                        </div>
                        <p style={{ fontSize: 11, color: "var(--ink-3)" }}>{fmtDate(l.paidAt ?? l.createdAt)}</p>
                      </div>
                      <span style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: l.isEscrow ? "#5b8ff9" : "var(--c)", flexShrink: 0 }}>{fmt(parseFloat(l.amount))} <span style={{ fontSize: 10, color: "var(--ink-3)" }}>USDC</span></span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div className="card">
                  <div className="card-head">
                    <div className="card-head-icon"><svg viewBox="0 0 20 20" fill="none" width="16" height="16"><circle cx="10" cy="10" r="8" stroke="var(--c)" strokeWidth="1.3"/></svg></div>
                    <div><div className="card-title">Link Breakdown</div><div className="card-subtitle">Status overview</div></div>
                  </div>
                  <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "Completed", count: allCompleted.length, color: "var(--c)" },
                      { label: "Active", count: active.length, color: "var(--warning)" },
                      { label: "Expired", count: expired.length, color: "var(--danger)" },
                      { label: "Escrow Released", count: releasedEscrows.length, color: "#5b8ff9" },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>{s.label}</span>
                          <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: s.color, fontWeight: 700 }}>{s.count}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 4, background: "var(--raised)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: (links.length + escrows.length) > 0 ? `${(s.count / (links.length + escrows.length)) * 100}%` : "0%", background: s.color, borderRadius: 4, transition: "width .5s ease" }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ flex: 1 }}>
                  <div className="card-head">
                    <div className="card-head-icon"><svg viewBox="0 0 20 20" fill="none" width="16" height="16"><circle cx="10" cy="10" r="8" stroke="var(--c)" strokeWidth="1.3"/><path d="M10 6v4l2.5 2.5" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round"/></svg></div>
                    <div><div className="card-title">Recent Payments</div><div className="card-subtitle">Latest completed</div></div>
                  </div>
                  <div style={{ padding: "0 0 8px", maxHeight: 220, overflowY: "auto" }}>
                    {recent.length === 0 ? (
                      <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>No payments yet</div>
                    ) : recent.map((l, i) => (
                      <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: i < recent.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</p>
                            {l.isEscrow && <span style={{ fontSize: 8, color: "#5b8ff9", background: "rgba(91,143,249,.12)", border: "1px solid rgba(91,143,249,.25)", borderRadius: 3, padding: "1px 4px", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, flexShrink: 0 }}>ESCROW</span>}
                          </div>
                          <p style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{fmtDate(l.paidAt ?? l.createdAt)}</p>
                        </div>
                        <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: l.isEscrow ? "#5b8ff9" : "var(--c)", flexShrink: 0, marginLeft: 12 }}>+{fmt(parseFloat(l.amount))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* PnL Card */}
            <PnlCard
              address={address!}
              totalEarned={totalEarned}
              completedCount={allCompleted.length}
              completionRate={completionRate}
              avgPayment={avgPayment}
              biggestPayment={biggestPayment}
            />
          </>
        )}
      </div>

      <footer className="app-footer">
        <span>Conduit v0.1.0</span>
        <span>Built on Arc Network · Powered by Circle</span>
      </footer>
    </div>
  );
}
