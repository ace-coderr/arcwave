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
  isEscrow?: boolean;
}

function TxSkeleton() {
  return (
    <div className="tx-row">
      <div>
        <div className="skeleton" style={{ width: "55%", height: 13, marginBottom: 6, borderRadius: 4 }}/>
        <div className="skeleton" style={{ width: "35%", height: 10, borderRadius: 4 }}/>
      </div>
      <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4 }}/>
      <div className="skeleton" style={{ width: 90, height: 12, borderRadius: 4 }}/>
      <div className="skeleton" style={{ width: 70, height: 12, borderRadius: 4 }}/>
      <div className="skeleton" style={{ width: 100, height: 12, borderRadius: 4 }}/>
    </div>
  );
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
      .then(r => r.json())
      .then(d => setLinks(d.links ?? []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [address]);

  const completed = links.filter(l => l.status === "COMPLETED");
  const totalReceived = completed.reduce((s, l) => s + parseFloat(l.amount), 0).toFixed(2);
  const pending = links.filter(l => l.status === "ACTIVE").length;
  const escrowCount = completed.filter(l => l.isEscrow).length;

  const exportCSV = () => {
    if (!completed.length) return;
    const rows = [
      ["Title", "Type", "Amount (USDC)", "From", "Date", "TX Hash"],
      ...completed.map(tx => [
        tx.title,
        tx.isEscrow ? "Escrow" : "Payment",
        tx.amount,
        tx.paidBy ?? "",
        tx.paidAt ? formatDate(tx.paidAt) : "",
        tx.txHash ?? "",
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "conduit-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <NavBar/>

      <div className="page-wrap">
        <div className="page-header">
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">All completed USDC payments received</p>
        </div>

        {/* Stats */}
        {mounted && isConnected && (
          <div className="tx-stats">
            <div className="tx-stat">
              <div className="tx-stat-bar" style={{ background: "var(--c)" }}/>
              {isLoading ? (
                <div className="skeleton" style={{ width: 120, height: 28, borderRadius: 6, marginBottom: 8 }}/>
              ) : (
                <div className="tx-stat-val">
                  {parseFloat(totalReceived).toLocaleString()}
                  <span style={{ fontSize: 14, color: "var(--c)", fontWeight: 700, marginLeft: 6 }}>USDC</span>
                </div>
              )}
              <div className="tx-stat-label">Total Received</div>
            </div>

            <div className="tx-stat">
              <div className="tx-stat-bar" style={{ background: "var(--info)" }}/>
              {isLoading ? (
                <div className="skeleton" style={{ width: 60, height: 28, borderRadius: 6, marginBottom: 8 }}/>
              ) : (
                <div className="tx-stat-val">{completed.length}</div>
              )}
              <div className="tx-stat-label">Transactions</div>
            </div>

            <div className="tx-stat">
              <div className="tx-stat-bar" style={{ background: "var(--warning)" }}/>
              {isLoading ? (
                <div className="skeleton" style={{ width: 60, height: 28, borderRadius: 6, marginBottom: 8 }}/>
              ) : (
                <div className="tx-stat-val">{pending}</div>
              )}
              <div className="tx-stat-label">Active Links</div>
            </div>

            {escrowCount > 0 && (
              <div className="tx-stat">
                <div className="tx-stat-bar" style={{ background: "#5b8ff9" }}/>
                <div className="tx-stat-val">{escrowCount}</div>
                <div className="tx-stat-label">Escrow Releases</div>
              </div>
            )}
          </div>
        )}

        {/* Table card */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="table-head">
            <div className="table-head-left">
              <span className="table-title">Transaction History</span>
              {!isLoading && <span className="count-tag">{completed.length} records</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-sm" onClick={exportCSV} disabled={completed.length === 0 || isLoading}>
                Export CSV
              </button>
            </div>
          </div>

          {/* Col headers */}
          {(completed.length > 0 || isLoading) && (
            <div className="tx-cols">
              {["DESCRIPTION", "AMOUNT", "FROM", "DATE", "TX HASH"].map(c => (
                <span key={c} className="tx-col">{c}</span>
              ))}
            </div>
          )}

          {/* Scrollable rows */}
          <div style={{ overflowY: "auto", maxHeight: 520 }}>

            {mounted && !isConnected && (
              <div className="empty">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="var(--ink-3)" strokeWidth="1.5"/>
                    <path d="M12 8v4m0 4h.01" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="empty-title">Connect your wallet</p>
                <p className="empty-sub">Connect to view your transaction history</p>
              </div>
            )}

            {mounted && isConnected && isLoading && (
              <>{[1, 2, 3, 4, 5].map(i => <TxSkeleton key={i}/>)}</>
            )}

            {mounted && isConnected && !isLoading && completed.length === 0 && (
              <div className="empty">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                    <path d="M12 2v10m0 0l-3-3m3 3l3-3M3 17l1.5 3h15L21 17" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="empty-title">No transactions yet</p>
                <p className="empty-sub">Completed payments will appear here</p>
              </div>
            )}

            {mounted && !isLoading && completed.map(tx => (
              <div key={tx.id} className="tx-row fade-in">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p className="tx-name">{tx.title}</p>
                    {tx.isEscrow && (
                      <span style={{
                        fontSize: 9,
                        fontFamily: "IBM Plex Mono, monospace",
                        fontWeight: 700,
                        color: "#5b8ff9",
                        background: "rgba(91,143,249,.12)",
                        border: "1px solid rgba(91,143,249,.25)",
                        borderRadius: 4,
                        padding: "1px 5px",
                        letterSpacing: ".06em",
                        flexShrink: 0,
                      }}>ESCROW</span>
                    )}
                  </div>
                  {tx.paidAt && <p className="tx-date-sm">
                    {tx.isEscrow ? "Released" : "Paid"} {formatDate(tx.paidAt)}
                  </p>}
                </div>

                <span className="tx-amount">
                  +{formatUSDC(tx.amount)}
                  <span style={{ fontSize: 10, color: tx.isEscrow ? "#5b8ff9" : "var(--c)", marginLeft: 3, fontWeight: 700 }}>USDC</span>
                </span>

                <span className="tx-from">
                  {tx.paidBy ? shortenAddress(tx.paidBy) : "—"}
                </span>

                <span className="tx-date">{formatDate(tx.createdAt)}</span>

                {tx.txHash ? (
                  <a href={`https://testnet.arcscan.app/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="tx-link">
                    {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)} ↗
                  </a>
                ) : (
                  <span className="tx-date">—</span>
                )}
              </div>
            ))}
          </div>
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
