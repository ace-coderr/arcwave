"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import Link from "next/link";

const ADMIN_WALLET = "0x8557fabdc62f59a1ba7d6a74aaf0942cdcb68f69";
const FEE_COLLECTOR = "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c";
const FEE_PERCENT = 0.5;

interface PlatformLink {
  id: string;
  title: string;
  amount: string;
  status: string;
  recipientAddress: string;
  stealthAddress?: string;
  txHash?: string;
  paidBy?: string;
  paidAt?: string;
  createdAt: string;
}

interface EscrowLink {
  id: string;
  title: string;
  amount: string;
  status: string;
  sellerAddress: string;
  buyerAddress?: string;
  stealthAddress: string;
  txHash?: string;
  releaseTxHash?: string;
  paidAt?: string;
  releaseDeadline?: string;
  confirmedAt?: string;
  disputedAt?: string;
  disputeReason?: string;
  sellerContact?: string;
  createdAt: string;
}

interface DayData {
  date: string;
  label: string;
  amount: number;
  count: number;
}

function StatCard({ label, value, unit, sub, color, icon }: {
  label: string; value: string; unit?: string; sub?: string; color: string; icon: JSX.Element;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-line" style={{ background: color }} />
      <div className="stat-icon-wrap">{icon}</div>
      <div className="stat-value">
        {value}
        {unit && <span style={{ fontSize: 13, color, marginLeft: 4, fontFamily: "IBM Plex Mono, monospace" }}>{unit}</span>}
      </div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const [mounted, setMounted] = useState(false);
  const [links, setLinks] = useState<PlatformLink[]>([]);
  const [escrows, setEscrows] = useState<EscrowLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feeBalance, setFeeBalance] = useState<string | null>(null);
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");
  const [escrowTab, setEscrowTab] = useState<"all" | "disputed" | "holding">("disputed");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveMsg, setResolveMsg] = useState<Record<string, string>>({});

  useEffect(() => { setMounted(true); }, []);

  const isAdmin = address?.toLowerCase() === ADMIN_WALLET;

  const fetchAll = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/links?wallet=${address}`);
      if (!res.ok) return;
      const data = await res.json();
      setLinks(data.links ?? []);
      setEscrows(data.escrows ?? []);
    } catch { }
    finally { setIsLoading(false); }
  }, [address]);

  const fetchFeeBalance = useCallback(async () => {
    try {
      const res = await fetch("https://rpc.testnet.arc.network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [FEE_COLLECTOR, "latest"], id: 1 }),
      });
      const data = await res.json();
      const bal = parseInt(data?.result ?? "0x0", 16) / 1e18;
      setFeeBalance(bal.toFixed(4));
    } catch { setFeeBalance(null); }
  }, []);

  useEffect(() => {
    if (mounted && isConnected && isAdmin) { fetchAll(); fetchFeeBalance(); }
  }, [mounted, isConnected, isAdmin, fetchAll, fetchFeeBalance]);

  // Payment link stats
  const completed = links.filter(l => l.status === "COMPLETED");
  const active = links.filter(l => l.status === "ACTIVE");
  const expired = links.filter(l => l.status === "EXPIRED");
  const totalVolume = completed.reduce((s, l) => s + parseFloat(l.amount), 0);
  const totalFees = totalVolume * (FEE_PERCENT / 100);
  const uniqueUsers = new Set(links.map(l => l.recipientAddress.toLowerCase())).size;
  const uniquePayers = new Set(completed.filter(l => l.paidBy).map(l => l.paidBy!.toLowerCase())).size;
  const stealthCount = links.filter(l => l.stealthAddress).length;
  const completionRate = links.length > 0 ? Math.round((completed.length / links.length) * 100) : 0;
  const avgPayment = completed.length > 0 ? totalVolume / completed.length : 0;

  // Escrow stats
  const disputedEscrows = escrows.filter(e => e.status === "DISPUTED");
  const holdingEscrows = escrows.filter(e => e.status === "HOLDING");
  const releasedEscrows = escrows.filter(e => ["RELEASED", "CONFIRMED"].includes(e.status));
  const totalEscrowVolume = escrows.reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalHeld = holdingEscrows.reduce((s, e) => s + parseFloat(e.amount), 0);

  const filteredEscrows = escrowTab === "disputed" ? disputedEscrows
    : escrowTab === "holding" ? holdingEscrows
      : escrows;

  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  // Chart data
  const chartDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const chartData: DayData[] = (() => {
    const days = [];
    const now = new Date();
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayLinks = completed.filter(l => (l.paidAt ?? l.createdAt)?.startsWith(dateStr));
      days.push({
        date: dateStr,
        label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        amount: dayLinks.reduce((s, l) => s + parseFloat(l.amount), 0),
        count: dayLinks.length,
      });
    }
    return days;
  })();
  const maxAmount = Math.max(...chartData.map(d => d.amount), 1);

  const earnerMap: Record<string, number> = {};
  completed.forEach(l => {
    const addr = l.recipientAddress.toLowerCase();
    earnerMap[addr] = (earnerMap[addr] ?? 0) + parseFloat(l.amount);
  });
  const topEarners = Object.entries(earnerMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const recentTx = [...completed].sort((a, b) => new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime()).slice(0, 10);

  const resolveEscrow = async (escrowId: string, action: "release" | "refund") => {
    setResolvingId(escrowId);
    try {
      const endpoint = action === "release"
        ? "/api/escrow/release"
        : `/api/escrow/refund?wallet=${address}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escrowId }),
      });
      const data = await res.json();
      if (res.ok) {
        setResolveMsg(prev => ({ ...prev, [escrowId]: action === "release" ? "Released to seller" : "Refunded to buyer" }));
        fetchAll();
      } else {
        setResolveMsg(prev => ({ ...prev, [escrowId]: `Error: ${data.error}` }));
      }
    } catch {
      setResolveMsg(prev => ({ ...prev, [escrowId]: "Network error" }));
    } finally {
      setResolvingId(null);
    }
  };

  const escrowStatusColor = (s: string) => ({ ACTIVE: "#f5a623", HOLDING: "#5b8ff9", CONFIRMED: "#00E5A0", RELEASED: "#00E5A0", DISPUTED: "#f03e5f", CANCELLED: "#666" }[s] ?? "#666");

  if (!mounted) return null;

  if (!isConnected) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Sora, sans-serif", padding: 20 }}>
        <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 36, marginBottom: 40 }} />
        <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-xl)", padding: "40px 36px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "var(--elev-2)", position: "relative", overflow: "hidden" }}>
          <div style={{ height: 2, background: "var(--c)", position: "absolute", top: 0, left: 0, right: 0 }} />
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--c-dim)", border: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg viewBox="0 0 24 24" fill="none" width="24" height="24"><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--c)" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--c)" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: "var(--ink-1)", marginBottom: 8 }}>Admin Access</p>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24, lineHeight: 1.6 }}>Connect your admin wallet to access the platform dashboard.</p>
          <button onClick={() => connect({ connector: injected() })} style={{ width: "100%", padding: "13px", background: "var(--c)", border: "none", borderRadius: "var(--r-md)", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif", boxShadow: "0 4px 16px rgba(0,229,160,.35)" }}>
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Sora, sans-serif", padding: 20 }}>
        <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 36, marginBottom: 40 }} />
        <div style={{ background: "var(--surface)", border: "1px solid rgba(240,62,95,.2)", borderRadius: "var(--r-xl)", padding: "40px 36px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "var(--elev-2)", position: "relative", overflow: "hidden" }}>
          <div style={{ height: 2, background: "var(--danger)", position: "absolute", top: 0, left: 0, right: 0 }} />
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(240,62,95,.1)", border: "1px solid rgba(240,62,95,.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg viewBox="0 0 24 24" fill="none" width="24" height="24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: "var(--danger)", marginBottom: 8 }}>Access Denied</p>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 8, lineHeight: 1.6 }}>This wallet is not authorized.</p>
          <p style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", marginBottom: 24 }}>{address?.slice(0, 10)}...{address?.slice(-4)}</p>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: "var(--r-md)", fontSize: 13, fontWeight: 700, color: "var(--ink-2)", textDecoration: "none" }}>
            ← Back to Conduit
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Sora, sans-serif" }}>

      {/* Top bar */}
      <div style={{ height: 56, background: "var(--surface)", borderBottom: "1px solid var(--stroke)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 36, width: "auto" }} />
          <div style={{ width: 1, height: 20, background: "var(--stroke)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(240,62,95,.1)", border: "1px solid rgba(240,62,95,.2)", borderRadius: 20, padding: "3px 12px" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--danger)" }} />
            <span style={{ fontSize: 10, color: "var(--danger)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".08em" }}>ADMIN</span>
          </div>
          {disputedEscrows.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(240,62,95,.1)", border: "1px solid rgba(240,62,95,.3)", borderRadius: 20, padding: "3px 10px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--danger)", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 10, color: "var(--danger)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>{disputedEscrows.length} DISPUTE{disputedEscrows.length > 1 ? "S" : ""}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          <Link href="/" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none", padding: "6px 14px", border: "1px solid var(--stroke)", borderRadius: "var(--r-sm)", fontWeight: 600 }}>← App</Link>
          <button onClick={fetchAll} style={{ fontSize: 12, color: "var(--c)", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontFamily: "Sora, sans-serif" }}>Refresh</button>
        </div>
      </div>

      <div style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--ink-1)", letterSpacing: "-.05em", marginBottom: 4 }}>Platform Dashboard</h1>
          <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Real-time overview of all Conduit activity</p>
        </div>

        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
            <div className="page-spinner" />
          </div>
        ) : (
          <>
            {/* Main stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
              <StatCard label="Total Volume" value={fmt(totalVolume)} unit="USDC" sub={`${completed.length} transactions`} color="var(--c)"
                icon={<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><circle cx="10" cy="10" r="8" stroke="var(--c)" strokeWidth="1.3" /><path d="M10 6v8M7.5 8C7.5 6.9 8.6 6 10 6s2.5.9 2.5 2-1.1 2-2.5 2-2.5.9-2.5 2S8.6 14 10 14s2.5-.9 2.5-2" stroke="var(--c)" strokeWidth="1.2" strokeLinecap="round" /></svg>}
              />
              <StatCard label="Fees Collected" value={feeBalance ?? fmt(totalFees)} unit="USDC" sub={feeBalance ? "live balance" : `calc. ${FEE_PERCENT}%`} color="var(--warning)"
                icon={<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M2 5h16v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" stroke="var(--warning)" strokeWidth="1.3" /><path d="M2 5l8 6 8-6" stroke="var(--warning)" strokeWidth="1.3" strokeLinecap="round" /></svg>}
              />
              <StatCard label="Total Users" value={uniqueUsers.toString()} sub={`${uniquePayers} unique payers`} color="var(--info)"
                icon={<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><circle cx="8" cy="7" r="3" stroke="var(--info)" strokeWidth="1.3" /><path d="M2 17c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="var(--info)" strokeWidth="1.3" strokeLinecap="round" /><path d="M13 11c2.21 0 4 1.79 4 4" stroke="var(--info)" strokeWidth="1.3" strokeLinecap="round" /><circle cx="14" cy="6" r="2" stroke="var(--info)" strokeWidth="1.3" /></svg>}
              />
              <StatCard label="Total Links" value={links.length.toString()} sub={`${completionRate}% completion`} color="var(--c)"
                icon={<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M11 7a3 3 0 010 4.24l-1.5 1.5a3 3 0 01-4.24-4.24l.75-.75" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round" /><path d="M9 13a3 3 0 010-4.24l1.5-1.5a3 3 0 014.24 4.24l-.75.75" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round" /></svg>}
              />
            </div>

            {/* Secondary stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Completed", value: completed.length, color: "var(--c)" },
                { label: "Active", value: active.length, color: "var(--warning)" },
                { label: "Expired", value: expired.length, color: "var(--danger)" },
                { label: "Stealth Links", value: stealthCount, color: "#a78bfa" },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-lg)", padding: "16px 20px", boxShadow: "var(--elev-1)" }}>
                  <p style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "IBM Plex Mono, monospace", marginBottom: 4 }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Avg stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Avg Payment", value: `${fmt(avgPayment)} USDC` },
                { label: "Avg Links per User", value: uniqueUsers > 0 ? (links.length / uniqueUsers).toFixed(1) : "0" },
                { label: "Total Fees (calc.)", value: `${fmt(totalFees)} USDC` },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-lg)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "var(--elev-1)" }}>
                  <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace" }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* ── ESCROW SECTION ── */}
            <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)", letterSpacing: "-.02em" }}>Escrow Overview</h2>
              {disputedEscrows.length > 0 && (
                <span style={{ fontSize: 10, background: "var(--danger)", color: "#fff", borderRadius: 20, padding: "2px 8px", fontWeight: 700, fontFamily: "IBM Plex Mono, monospace" }}>
                  {disputedEscrows.length} DISPUTED
                </span>
              )}
            </div>

            {/* Escrow stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Total Escrow Volume", value: `${fmt(totalEscrowVolume)} USDC`, color: "#5b8ff9" },
                { label: "Currently Held", value: `${fmt(totalHeld)} USDC`, color: "var(--warning)" },
                { label: "Released", value: releasedEscrows.length.toString(), color: "var(--c)" },
                { label: "Disputed", value: disputedEscrows.length.toString(), color: disputedEscrows.length > 0 ? "var(--danger)" : "var(--ink-3)" },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--surface)", border: `1px solid ${s.label === "Disputed" && disputedEscrows.length > 0 ? "rgba(240,62,95,.3)" : "var(--stroke)"}`, borderRadius: "var(--r-lg)", padding: "16px 20px", boxShadow: "var(--elev-1)" }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "IBM Plex Mono, monospace", marginBottom: 4 }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Escrow table */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-head" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div className="card-head-icon">
                    <svg viewBox="0 0 20 20" fill="none" width="16" height="16"><rect x="3" y="8" width="14" height="10" rx="1.5" stroke="var(--c)" strokeWidth="1.3" /><path d="M6 8V6a4 4 0 018 0v2" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round" /></svg>
                  </div>
                  <div>
                    <div className="card-title">Escrow Links</div>
                    <div className="card-subtitle">{escrows.length} total · {disputedEscrows.length} disputed · {holdingEscrows.length} holding</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, background: "var(--bg)", borderRadius: "var(--r-sm)", padding: 3 }}>
                  {(["disputed", "holding", "all"] as const).map(t => (
                    <button key={t} onClick={() => setEscrowTab(t)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: escrowTab === t ? "var(--surface)" : "transparent", color: escrowTab === t ? (t === "disputed" ? "var(--danger)" : "var(--ink-1)") : "var(--ink-3)", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, cursor: "pointer", transition: "all .15s", position: "relative" }}>
                      {t.toUpperCase()}
                      {t === "disputed" && disputedEscrows.length > 0 && (
                        <span style={{ marginLeft: 4, background: "var(--danger)", color: "#fff", borderRadius: "50%", width: 14, height: 14, fontSize: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{disputedEscrows.length}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Col headers */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 12, padding: "10px 24px", background: "var(--raised)", borderBottom: "1px solid var(--stroke)" }}>
                {["TITLE", "STATUS", "AMOUNT", "SELLER", "BUYER", "DATE"].map(c => (
                  <span key={c} style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)", letterSpacing: ".12em", fontWeight: 600 }}>{c}</span>
                ))}
              </div>

              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {filteredEscrows.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                    {escrowTab === "disputed" ? "No disputes" : escrowTab === "holding" ? "No funds currently held" : "No escrow links yet"}
                  </div>
                ) : filteredEscrows.map((e, i) => (
                  <div key={e.id}
                    style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 12, padding: "13px 24px", alignItems: "center", borderBottom: i < filteredEscrows.length - 1 ? "1px solid var(--stroke)" : "none", transition: "background .12s", background: e.status === "DISPUTED" ? "rgba(240,62,95,.03)" : "transparent" }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = e.status === "DISPUTED" ? "rgba(240,62,95,.06)" : "var(--raised)")}
                    onMouseLeave={ev => (ev.currentTarget.style.background = e.status === "DISPUTED" ? "rgba(240,62,95,.03)" : "transparent")}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</p>
                        {e.status === "DISPUTED" && (
                          <span style={{ fontSize: 8, background: "var(--danger)", color: "#fff", borderRadius: 4, padding: "1px 5px", fontWeight: 700, fontFamily: "IBM Plex Mono, monospace", flexShrink: 0 }}>DISPUTE</span>
                        )}
                      </div>
                      {e.status === "DISPUTED" && e.disputeReason && (
                        <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{e.disputeReason}"</p>
                      )}
                      {e.sellerContact && (
                        <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2, fontFamily: "IBM Plex Mono, monospace", display: "flex", alignItems: "center", gap: 4 }}>
                          <svg viewBox="0 0 14 14" fill="none" width="10" height="10"><path d="M2 2.5C2 7.7 6.3 12 11.5 12l.5-2-2-1-1 1C7 9 5 7 4 5l1-1-1-2H2z" stroke="var(--ink-3)" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                          {e.sellerContact}
                        </p>
                      )}
                      {e.txHash && (
                        <a href={`https://testnet.arcscan.app/tx/${e.txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", textDecoration: "none" }}>
                          {e.txHash.slice(0, 8)}...↗
                        </a>
                      )}
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: escrowStatusColor(e.status), background: `${escrowStatusColor(e.status)}15`, border: `1px solid ${escrowStatusColor(e.status)}30`, borderRadius: 20, padding: "2px 8px" }}>
                        {e.status}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "#5b8ff9" }}>{fmt(parseFloat(e.amount))}</span>
                    <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-2)" }}>{e.sellerAddress.slice(0, 6)}...{e.sellerAddress.slice(-4)}</span>
                    <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)" }}>{e.buyerAddress ? `${e.buyerAddress.slice(0, 6)}...${e.buyerAddress.slice(-4)}` : "—"}</span>
                    <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)" }}>{fmtDate(e.createdAt)}</span>

                    {/* Dispute resolution */}
                    {e.status === "DISPUTED" && (
                      <div style={{ gridColumn: "1 / -1", paddingTop: 10, borderTop: "1px solid rgba(240,62,95,.15)", marginTop: 6 }}>
                        {/* Who disputed info */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 10, fontSize: 11, fontFamily: "IBM Plex Mono, monospace", background: "rgba(240,62,95,.05)", border: "1px solid rgba(240,62,95,.15)", borderRadius: "var(--r-sm)", padding: "8px 12px" }}>
                          <span><span style={{ color: "var(--ink-3)" }}>Dispute raised by: </span><span style={{ color: "var(--danger)", fontWeight: 700 }}>{e.buyerAddress ? `${e.buyerAddress.slice(0, 10)}...${e.buyerAddress.slice(-6)}` : "Unknown"}</span></span>
                          <span><span style={{ color: "var(--ink-3)" }}>Seller: </span><span style={{ color: "var(--ink-2)", fontWeight: 700 }}>{e.sellerAddress.slice(0, 10)}...{e.sellerAddress.slice(-6)}</span></span>
                          <span><span style={{ color: "var(--ink-3)" }}>Amount at stake: </span><span style={{ color: "#5b8ff9", fontWeight: 700 }}>{fmt(parseFloat(e.amount))} USDC</span></span>
                          {e.sellerContact && <span><span style={{ color: "var(--ink-3)" }}>Contact: </span><span style={{ color: "var(--ink-1)", fontWeight: 700 }}>{e.sellerContact}</span></span>}
                        </div>
                        {/* Resolve buttons */}
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {resolveMsg[e.id] ? (
                            <span style={{ fontSize: 12, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>{resolveMsg[e.id]}</span>
                          ) : (
                            <>
                              <button onClick={() => resolveEscrow(e.id, "release")} disabled={resolvingId === e.id}
                                style={{ padding: "7px 16px", background: "var(--c)", border: "none", borderRadius: "var(--r-sm)", color: "#000", fontSize: 12, fontWeight: 700, cursor: resolvingId === e.id ? "not-allowed" : "pointer", fontFamily: "Sora, sans-serif", opacity: resolvingId === e.id ? .5 : 1 }}>
                                {resolvingId === e.id ? "Processing..." : "Release to Seller"}
                              </button>
                              <button onClick={() => resolveEscrow(e.id, "refund")} disabled={resolvingId === e.id}
                                style={{ padding: "7px 16px", background: "transparent", border: "1px solid var(--danger)", borderRadius: "var(--r-sm)", color: "var(--danger)", fontSize: 12, fontWeight: 700, cursor: resolvingId === e.id ? "not-allowed" : "pointer", fontFamily: "Sora, sans-serif", opacity: resolvingId === e.id ? .5 : 1 }}>
                                {resolvingId === e.id ? "Processing..." : "Refund Buyer"}
                              </button>
                              <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>Review dispute reason above before resolving</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Volume chart */}
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card-head" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div className="card-head-icon">
                    <svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M2 14l4-4 4 2 4-6 4 2" stroke="var(--c)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div>
                    <div className="card-title">Platform Volume</div>
                    <div className="card-subtitle">Payment links across all users</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, background: "var(--bg)", borderRadius: "var(--r-sm)", padding: 3 }}>
                  {(["7d", "30d", "all"] as const).map(r => (
                    <button key={r} onClick={() => setRange(r)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: range === r ? "var(--surface)" : "transparent", color: range === r ? "var(--ink-1)" : "var(--ink-3)", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, cursor: "pointer", transition: "all .15s" }}>{r}</button>
                  ))}
                </div>
              </div>
              <div className="card-body">
                {completed.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-3)", fontSize: 13 }}>No transactions yet</div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 140, marginBottom: 8 }}>
                      {chartData.map((day, i) => (
                        <div key={day.date} title={`${day.label}: ${fmt(day.amount)} USDC (${day.count} tx)`} style={{ flex: 1, height: `${Math.max((day.amount / maxAmount) * 100, day.amount > 0 ? 3 : 1.5)}%`, background: day.amount > 0 ? (i === chartData.length - 1 ? "var(--c)" : "rgba(0,229,160,.4)") : "var(--raised)", borderRadius: "3px 3px 0 0", minHeight: 2, transition: "height .4s ease" }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      {chartData.filter((_, i) => i % (chartDays <= 7 ? 1 : chartDays <= 30 ? 5 : 10) === 0 || i === chartData.length - 1).map(day => (
                        <span key={day.date} style={{ fontSize: 9, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{day.label}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              <div className="card">
                <div className="card-head">
                  <div className="card-head-icon"><svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M10 2l2.4 4.8 5.6.8-4 3.9.9 5.5L10 14.5l-4.9 2.5.9-5.5L2 7.6l5.6-.8L10 2z" stroke="var(--c)" strokeWidth="1.3" strokeLinejoin="round" /></svg></div>
                  <div><div className="card-title">Top Earners</div><div className="card-subtitle">By total volume</div></div>
                </div>
                <div style={{ padding: "0 0 8px" }}>
                  {topEarners.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>No data yet</div>
                  ) : topEarners.map(([addr, vol], i) => (
                    <div key={addr} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < topEarners.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                      <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", width: 18, flexShrink: 0 }}>#{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 12, color: "var(--ink-2)", fontFamily: "IBM Plex Mono, monospace", overflow: "hidden", textOverflow: "ellipsis" }}>{addr.slice(0, 10)}...{addr.slice(-4)}</span>
                      <span style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "var(--c)", flexShrink: 0 }}>{fmt(vol)} <span style={{ fontSize: 10, color: "var(--ink-3)" }}>USDC</span></span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-head">
                  <div className="card-head-icon"><svg viewBox="0 0 20 20" fill="none" width="16" height="16"><circle cx="10" cy="10" r="8" stroke="var(--c)" strokeWidth="1.3" /></svg></div>
                  <div><div className="card-title">Platform Breakdown</div><div className="card-subtitle">All links by status</div></div>
                </div>
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "Completed", count: completed.length, color: "var(--c)" },
                    { label: "Active", count: active.length, color: "var(--warning)" },
                    { label: "Expired", count: expired.length, color: "var(--danger)" },
                    { label: "Stealth", count: stealthCount, color: "#a78bfa" },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>{s.label}</span>
                        <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: s.color, fontWeight: 700 }}>{s.count}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 4, background: "var(--raised)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: links.length > 0 ? `${(s.count / links.length) * 100}%` : "0%", background: s.color, borderRadius: 4, transition: "width .5s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent transactions */}
            <div className="card">
              <div className="card-head">
                <div className="card-head-icon"><svg viewBox="0 0 20 20" fill="none" width="16" height="16"><circle cx="10" cy="10" r="8" stroke="var(--c)" strokeWidth="1.3" /><path d="M10 6v4l2.5 2.5" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round" /></svg></div>
                <div><div className="card-title">Recent Transactions</div><div className="card-subtitle">Latest 10 across all users</div></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, padding: "10px 24px", background: "var(--raised)", borderBottom: "1px solid var(--stroke)" }}>
                {["TITLE", "AMOUNT", "RECIPIENT", "PAYER", "DATE"].map(c => (
                  <span key={c} style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)", letterSpacing: ".12em", fontWeight: 600 }}>{c}</span>
                ))}
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {recentTx.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No transactions yet</div>
                ) : recentTx.map((tx, i) => (
                  <div key={tx.id}
                    style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, padding: "13px 24px", alignItems: "center", borderBottom: i < recentTx.length - 1 ? "1px solid var(--stroke)" : "none", transition: "background .12s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--raised)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.title}</p>
                      {tx.txHash && (
                        <a href={`https://testnet.arcscan.app/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", textDecoration: "none" }}>
                          {tx.txHash.slice(0, 8)}...↗
                        </a>
                      )}
                    </div>
                    <span style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "var(--c)" }}>{fmt(parseFloat(tx.amount))}</span>
                    <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-2)" }}>{tx.recipientAddress.slice(0, 6)}...{tx.recipientAddress.slice(-4)}</span>
                    <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)" }}>{tx.paidBy ? `${tx.paidBy.slice(0, 6)}...${tx.paidBy.slice(-4)}` : "—"}</span>
                    <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)" }}>{fmtDate(tx.paidAt ?? tx.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}