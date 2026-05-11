"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { NavBar } from "@/components/NavBar";
import { formatUSDC, formatDate, shortenAddress } from "@/lib/utils";

interface PaymentTx {
  id: string;
  title: string;
  amount: string;
  status: string;
  txHash?: string;
  paidBy?: string;
  paidAt?: string;
  createdAt: string;
}

interface EscrowTx {
  id: string;
  title: string;
  amount: string;
  status: string;
  txHash?: string;
  releaseTxHash?: string;
  buyerAddress?: string;
  paidAt?: string;
  confirmedAt?: string;
  disputedAt?: string;
  deliveryDays?: number;
  createdAt: string;
  isRefunded: boolean;
}

function TxSkeleton() {
  return (
    <div className="tx-row">
      <div><div className="skeleton" style={{ width: "55%", height: 13, marginBottom: 6, borderRadius: 4 }}/><div className="skeleton" style={{ width: "35%", height: 10, borderRadius: 4 }}/></div>
      <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4 }}/>
      <div className="skeleton" style={{ width: 90, height: 12, borderRadius: 4 }}/>
      <div className="skeleton" style={{ width: 70, height: 12, borderRadius: 4 }}/>
      <div className="skeleton" style={{ width: 100, height: 12, borderRadius: 4 }}/>
    </div>
  );
}

const escrowStatusColor = (s: string) => ({
  HOLDING: "#5b8ff9", CONFIRMED: "#00E5A0", RELEASED: "#00E5A0",
  DISPUTED: "#f03e5f", MEDIATION: "#a78bfa", CANCELLED: "#f03e5f",
}[s] ?? "#666");

const escrowStatusLabel = (s: string, isRefunded: boolean) => {
  if (isRefunded) return "REFUNDED";
  return { HOLDING: "AWAITING", CONFIRMED: "RELEASED", RELEASED: "RELEASED", DISPUTED: "DISPUTED", MEDIATION: "MEDIATION", CANCELLED: "CANCELLED" }[s] ?? s;
};

export default function TransactionsPage() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"payments" | "escrow">("payments");
  const [paymentTxs, setPaymentTxs] = useState<PaymentTx[]>([]);
  const [escrowTxs, setEscrowTxs] = useState<EscrowTx[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!address) return;
    setIsLoading(true);
    Promise.all([
      fetch(`/api/links?address=${address}`).then(r => r.json()),
      fetch(`/api/escrow?address=${address}`).then(r => r.json()),
    ]).then(([linksData, escrowData]) => {
      // Payment txs — only non-escrow completed links
      const payments = (linksData.links ?? []).filter((l: any) => !l.isEscrow && l.status === "COMPLETED");
      setPaymentTxs(payments);

      // Escrow txs — all escrows with any activity (paid)
      const escrows = (escrowData.escrows ?? [])
        .filter((e: any) => e.txHash) // only ones that were paid into
        .map((e: any) => ({
          ...e,
          isRefunded: e.status === "CANCELLED",
        }));
      setEscrowTxs(escrows);
    }).catch(console.error)
      .finally(() => setIsLoading(false));
  }, [address]);

  const totalPayments = paymentTxs.reduce((s, l) => s + parseFloat(l.amount), 0);
  const totalEscrowReleased = escrowTxs.filter(e => ["CONFIRMED", "RELEASED"].includes(e.status)).reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalRefunded = escrowTxs.filter(e => e.isRefunded).reduce((s, e) => s + parseFloat(e.amount), 0);
  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);

  const exportCSV = () => {
    if (tab === "payments") {
      if (!paymentTxs.length) return;
      const rows = [["Title", "Amount (USDC)", "From", "Date", "TX Hash"],
        ...paymentTxs.map(tx => [tx.title, tx.amount, tx.paidBy ?? "", tx.paidAt ? formatDate(tx.paidAt) : "", tx.txHash ?? ""])];
      download(rows, "conduit-payments.csv");
    } else {
      if (!escrowTxs.length) return;
      const rows = [["Title", "Amount (USDC)", "Status", "Buyer", "Date", "TX Hash"],
        ...escrowTxs.map(tx => [tx.title, tx.amount, escrowStatusLabel(tx.status, tx.isRefunded), tx.buyerAddress ?? "", tx.paidAt ? formatDate(tx.paidAt) : "", tx.txHash ?? ""])];
      download(rows, "conduit-escrow.csv");
    }
  };

  const download = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <NavBar/>
      <div className="page-wrap">
        <div className="page-header">
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Your payment and escrow history</p>
        </div>

        {/* Stats */}
        {mounted && isConnected && (
          <div className="tx-stats">
            {[
              { label: "Payments Received", value: fmt(totalPayments), unit: "USDC", color: "var(--c)", sub: `${paymentTxs.length} transactions` },
              { label: "Escrow Released", value: fmt(totalEscrowReleased), unit: "USDC", color: "#5b8ff9", sub: `${escrowTxs.filter(e => ["CONFIRMED","RELEASED"].includes(e.status)).length} completed` },
              { label: "Escrow Refunded", value: fmt(totalRefunded), unit: "USDC", color: "var(--danger)", sub: `${escrowTxs.filter(e => e.isRefunded).length} refunded` },
              { label: "Active Escrows", value: escrowTxs.filter(e => e.status === "HOLDING").length.toString(), unit: "", color: "var(--warning)", sub: "awaiting delivery" },
            ].map(s => (
              <div key={s.label} className="tx-stat">
                <div className="tx-stat-bar" style={{ background: s.color }}/>
                <div className="tx-stat-val">{s.value}{s.unit && <span style={{ fontSize: 13, color: s.color, fontWeight: 700, marginLeft: 4, fontFamily: "IBM Plex Mono, monospace" }}>{s.unit}</span>}</div>
                <div className="tx-stat-label">{s.label}</div>
                <div className="tx-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="table-head">
            <div style={{ display: "flex", gap: 4, background: "var(--bg)", borderRadius: "var(--r-sm)", padding: 3 }}>
              {([["payments", "Payments"], ["escrow", "Escrow"]] as const).map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 18px", borderRadius: 6, border: "none", background: tab === t ? "var(--surface)" : "transparent", color: tab === t ? "var(--ink-1)" : "var(--ink-3)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif", transition: "all .15s" }}>
                  {label}
                  <span style={{ marginLeft: 6, fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: tab === t ? "var(--c)" : "var(--ink-3)" }}>
                    {t === "payments" ? paymentTxs.length : escrowTxs.length}
                  </span>
                </button>
              ))}
            </div>
            <button className="btn-sm" onClick={exportCSV} disabled={(tab === "payments" ? paymentTxs.length : escrowTxs.length) === 0 || isLoading}>
              Export CSV
            </button>
          </div>

          {/* ── PAYMENTS TAB ── */}
          {tab === "payments" && (
            <>
              {paymentTxs.length > 0 && !isLoading && (
                <div className="tx-cols">
                  {["DESCRIPTION", "AMOUNT", "FROM", "DATE", "TX HASH"].map(c => (
                    <span key={c} className="tx-col">{c}</span>
                  ))}
                </div>
              )}
              <div style={{ overflowY: "auto", maxHeight: 520 }}>
                {!mounted || !isConnected ? (
                  <div className="empty"><p className="empty-title">Connect your wallet</p><p className="empty-sub">Connect to view transactions</p></div>
                ) : isLoading ? (
                  <>{[1,2,3,4,5].map(i => <TxSkeleton key={i}/>)}</>
                ) : paymentTxs.length === 0 ? (
                  <div className="empty">
                    <p className="empty-title">No payment transactions yet</p>
                    <p className="empty-sub">Completed payment links will appear here</p>
                  </div>
                ) : paymentTxs.map(tx => (
                  <div key={tx.id} className="tx-row fade-in">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p className="tx-name">{tx.title}</p>
                        <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "var(--c)", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 4, padding: "1px 5px" }}>PAYMENT</span>
                      </div>
                      {tx.paidAt && <p className="tx-date-sm">Paid {formatDate(tx.paidAt)}</p>}
                    </div>
                    <span className="tx-amount">+{formatUSDC(tx.amount)}<span style={{ fontSize: 10, color: "var(--c)", marginLeft: 3, fontWeight: 700 }}>USDC</span></span>
                    <span className="tx-from">{tx.paidBy ? shortenAddress(tx.paidBy) : "—"}</span>
                    <span className="tx-date">{formatDate(tx.createdAt)}</span>
                    {tx.txHash ? (
                      <a href={`https://testnet.arcscan.app/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="tx-link">{tx.txHash.slice(0,6)}...{tx.txHash.slice(-4)} ↗</a>
                    ) : <span className="tx-date">—</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── ESCROW TAB ── */}
          {tab === "escrow" && (
            <>
              {escrowTxs.length > 0 && !isLoading && (
                <div className="tx-cols" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}>
                  {["TITLE", "STATUS", "AMOUNT", "BUYER", "DATE", "LINK"].map(c => (
                    <span key={c} className="tx-col">{c}</span>
                  ))}
                </div>
              )}
              <div style={{ overflowY: "auto", maxHeight: 520 }}>
                {!mounted || !isConnected ? (
                  <div className="empty"><p className="empty-title">Connect your wallet</p><p className="empty-sub">Connect to view escrow history</p></div>
                ) : isLoading ? (
                  <>{[1,2,3,4,5].map(i => <TxSkeleton key={i}/>)}</>
                ) : escrowTxs.length === 0 ? (
                  <div className="empty">
                    <p className="empty-title">No escrow transactions yet</p>
                    <p className="empty-sub">Paid escrow links will appear here</p>
                  </div>
                ) : escrowTxs.map(tx => (
                  <div key={tx.id} className="tx-row fade-in" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}>
                    <div>
                      <p className="tx-name">{tx.title}</p>
                      {tx.deliveryDays && <p className="tx-date-sm">{tx.deliveryDays} day delivery</p>}
                    </div>
                    <div>
                      <span style={{
                        fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700,
                        color: tx.isRefunded ? "var(--danger)" : escrowStatusColor(tx.status),
                        background: tx.isRefunded ? "rgba(240,62,95,.1)" : `${escrowStatusColor(tx.status)}18`,
                        border: `1px solid ${tx.isRefunded ? "rgba(240,62,95,.25)" : `${escrowStatusColor(tx.status)}40`}`,
                        borderRadius: 4, padding: "1px 5px",
                      }}>
                        {escrowStatusLabel(tx.status, tx.isRefunded)}
                      </span>
                    </div>
                    <span className="tx-amount" style={{ color: tx.isRefunded ? "var(--danger)" : undefined }}>
                      {tx.isRefunded ? `-${formatUSDC(tx.amount)}` : `+${formatUSDC(tx.amount)}`}
                      <span style={{ fontSize: 10, color: tx.isRefunded ? "var(--danger)" : "#5b8ff9", marginLeft: 3, fontWeight: 700 }}>USDC</span>
                    </span>
                    <span className="tx-from">{tx.buyerAddress ? shortenAddress(tx.buyerAddress) : "—"}</span>
                    <span className="tx-date">{formatDate(tx.paidAt ?? tx.createdAt)}</span>
                    <a href={`/escrow/${tx.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#5b8ff9", fontWeight: 700, textDecoration: "none" }}>
                      Open ↗
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="app-footer">
        <span>Conduit v0.1.0</span>
        <div className="footer-links">
          <a href="https://x.com/conduit_pay" target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.845L1.255 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://t.me/conduit_community" target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.94-.918c-.64-.203-.654-.64.136-.954l11.49-4.43c.532-.194.998.131.838.856z"/></svg>
          </a>
        </div>
        <span>Built on Arc Network · Powered by Circle</span>
      </footer>
    </div>
  );
}