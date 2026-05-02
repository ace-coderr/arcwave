"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { NavBar } from "@/components/NavBar";
import { formatUSDC, formatDate, shortenAddress } from "@/lib/utils";

interface PaymentLink {
  id: string;
  title: string;
  amount: string;
  status: string;
  txHash?: string;
  paidBy?: string;
  paidAt?: string;
  createdAt: string;
}

export default function TransactionsPage() {
  const { address, isConnected } = useAccount();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!address) return;
    setIsLoading(true);
    fetch(`/api/links?address=${address}`)
      .then((r) => r.json())
      .then((d) => setLinks(d.links ?? []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [address]);

  const completed = links.filter((l) => l.status === "COMPLETED");
  const totalReceived = completed.reduce((s, l) => s + parseFloat(l.amount), 0).toFixed(2);
  const pending = links.filter((l) => l.status === "ACTIVE").length;

  const txStats = [
    { label: "Total Received", value: `${parseFloat(totalReceived).toLocaleString()} USDC`, color: "#10b981" },
    { label: "Transactions", value: completed.length.toString(), color: "#3b82f6" },
    { label: "Pending Links", value: pending.toString(), color: "#f59e0b" },
  ];

  return (
    <div className="app">
      <NavBar />
      <div className="page-wrap">
        <main className="page-content">

          <div className="page-header">
            <h1 className="page-title">Transactions</h1>
            <p className="page-subtitle">All completed USDC payments received</p>
          </div>

          {/* Stats */}
          {mounted && isConnected && (
            <div className="tx-stats-grid">
              {txStats.map((c) => (
                <div key={c.label} className="tx-stat-card">
                  <div className="tx-stat-top-line" style={{ background: c.color }} />
                  <div className="tx-stat-value">{c.value}</div>
                  <div className="tx-stat-label">{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="tx-table-card">
            <div className="tx-table-header">
              <span className="tx-table-title">Transaction History</span>
              <span className="tx-table-count">{completed.length} records</span>
            </div>

            {/* Column headers */}
            {completed.length > 0 && (
              <div className="tx-col-headers">
                {["DESCRIPTION", "AMOUNT", "FROM", "DATE", "TX HASH"].map((col) => (
                  <span key={col} className="tx-col-header">{col}</span>
                ))}
              </div>
            )}

            {/* Loading */}
            {(!mounted || isLoading) && (
              <div className="loading-center" style={{ height: 160 }}>
                <div className="page-spinner" />
              </div>
            )}

            {/* Not connected */}
            {mounted && !isConnected && !isLoading && (
              <div className="tx-empty">
                <p className="tx-empty-title">Connect your wallet to view transactions</p>
              </div>
            )}

            {/* Empty */}
            {mounted && isConnected && !isLoading && completed.length === 0 && (
              <div className="tx-empty">
                <div className="tx-empty-emoji">💸</div>
                <p className="tx-empty-title">No transactions yet</p>
                <p className="tx-empty-sub">Completed payments will appear here</p>
              </div>
            )}

            {/* Rows */}
            {mounted && !isLoading && completed.map((tx, i) => (
              <div key={tx.id} className="tx-row animate-fade-up">
                <div>
                  <p className="tx-title">{tx.title}</p>
                  {tx.paidAt && <p className="tx-paid-at">Paid {formatDate(tx.paidAt)}</p>}
                </div>
                <span className="tx-amount">
                  +{formatUSDC(tx.amount)}<span className="tx-amount-unit">USDC</span>
                </span>
                <span className="tx-from">
                  {tx.paidBy ? shortenAddress(tx.paidBy) : "—"}
                </span>
                <span className="tx-date">{formatDate(tx.createdAt)}</span>
                {tx.txHash ? (
                  <a
                    href={`https://testnet.arcscan.app/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tx-hash-link"
                  >
                    {shortenAddress(tx.txHash)} ↗
                  </a>
                ) : (
                  <span className="tx-date">—</span>
                )}
              </div>
            ))}
          </div>
        </main>

        <footer className="page-footer">
          <span>ArcWave v0.1.0</span>
          <span>Powered by Arc Network & Circle</span>
        </footer>
      </div>
    </div>
  );
}
