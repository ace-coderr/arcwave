"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { formatUSDC, formatDate } from "@/lib/utils";

interface PaymentLink {
  id: string;
  title: string;
  description?: string;
  amount: string;
  recipientAddress: string;
  stealthAddress?: string;
  status: string;
  txHash?: string;
  forwardTxHash?: string;
  createdAt: string;
  paidAt?: string;
}

type Filter = "ALL" | "ACTIVE" | "COMPLETED" | "EXPIRED";

function shortenAddr(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

interface Props { refreshTrigger: number; }

export function PaymentLinksTable({ refreshTrigger }: Props) {
  const { address, isConnected } = useAccount();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchLinks = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/links?address=${address}`);
      if (!res.ok) return;
      const data = await res.json();
      setLinks(data.links ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) fetchLinks();
  }, [isConnected, address, fetchLinks, refreshTrigger]);

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/pay/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const cancelLink = async (id: string) => {
    if (!confirm("Cancel this payment link?")) return;
    setCancellingId(id);
    try {
      await fetch(`/api/links/${id}`, { method: "DELETE" });
      await fetchLinks();
    } catch (err) {
      console.error(err);
    } finally {
      setCancellingId(null);
    }
  };

  const exportCSV = () => {
    const completed = links.filter((l) => l.status === "COMPLETED");
    if (!completed.length) return;
    const rows = [
      ["Title", "Amount (USDC)", "Status", "Created", "Paid At", "TX Hash"],
      ...completed.map((l) => [
        l.title,
        l.amount,
        l.status,
        formatDate(l.createdAt),
        l.paidAt ? formatDate(l.paidAt) : "",
        l.txHash ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "conduit-payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = filter === "ALL" ? links : links.filter((l) => l.status === filter);
  const counts = {
    ALL: links.length,
    ACTIVE: links.filter((l) => l.status === "ACTIVE").length,
    COMPLETED: links.filter((l) => l.status === "COMPLETED").length,
    EXPIRED: links.filter((l) => l.status === "EXPIRED").length,
  };

  const statusColor = (s: string) => ({
    COMPLETED: "#00E5A0",
    ACTIVE: "#f5a623",
    EXPIRED: "#f03e5f",
  }[s] ?? "#666");

  const statusClass = (s: string) => ({
    COMPLETED: "status-green",
    ACTIVE: "status-yellow",
    EXPIRED: "status-red",
  }[s] ?? "status-red");

  return (
    <div className="table-card">
      {/* Header */}
      <div className="table-header">
        <div className="table-header-left">
          <span className="table-header-title">Payment Links</span>
          <span className="table-count-badge">{counts[filter]}</span>
        </div>
        <div className="table-header-right">
          {(["ALL", "ACTIVE", "COMPLETED", "EXPIRED"] as Filter[]).map((f) => (
            <button
              key={f}
              className={`filter-pill${filter === f ? " active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
          <button className="table-refresh-btn" onClick={fetchLinks} title="Refresh">↻</button>
          <button
            className="table-export-btn"
            onClick={exportCSV}
            disabled={counts.COMPLETED === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Column headers */}
      {filtered.length > 0 && (
        <div className="table-col-headers">
          {["TITLE", "STATUS", "AMOUNT", "CREATED", "ACTIONS"].map((c) => (
            <span key={c} className="table-col-header">{c}</span>
          ))}
        </div>
      )}

      {/* Scrollable rows container */}
      <div style={{ overflowY: "auto", maxHeight: 480, flex: 1 }}>

        {/* Loading */}
        {(!mounted || isLoading) && (
          <div className="loading-center" style={{ height: 160 }}>
            <div className="page-spinner" />
          </div>
        )}

        {/* Not connected */}
        {mounted && !isConnected && !isLoading && (
          <div className="table-not-connected">
            <div className="table-not-connected-icon">
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="var(--ink-3)" strokeWidth="1.5" />
                <path d="M12 8v4m0 4h.01" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="table-not-connected-text">Wallet not connected</p>
            <p className="table-not-connected-sub">Connect your wallet to view payment links</p>
          </div>
        )}

        {/* Empty */}
        {mounted && isConnected && !isLoading && filtered.length === 0 && (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M10.172 13.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.1-1.1" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="table-empty-title">
              {filter === "ALL" ? "No payment links yet" : `No ${filter.toLowerCase()} links`}
            </p>
            <p className="table-empty-sub">
              {filter === "ALL" ? "Create your first payment link above" : "Try a different filter"}
            </p>
          </div>
        )}

        {/* Skeleton */}
        {mounted && isConnected && isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="table-skeleton-row">
                <div><div className="skeleton" style={{ width: "60%", height: 14, marginBottom: 6 }} /><div className="skeleton" style={{ width: "40%", height: 10 }} /></div>
                <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 20 }} />
                <div className="skeleton" style={{ width: 70, height: 14 }} />
                <div className="skeleton" style={{ width: 80, height: 12 }} />
                <div style={{ display: "flex", gap: 6 }}><div className="skeleton" style={{ width: 60, height: 28, borderRadius: 6 }} /><div className="skeleton" style={{ width: 60, height: 28, borderRadius: 6 }} /></div>
              </div>
            ))}
          </>
        )}

        {/* Rows */}
        {mounted && !isLoading && filtered.map((link) => (
          <div key={link.id} className="table-row">
            {/* Title */}
            <div className="table-cell-title">
              <div className="table-cell-title-name">
                <span className="table-cell-status-dot" style={{ background: statusColor(link.status) }} />
                <span className="table-cell-title-text">{link.title}</span>
                {link.stealthAddress && (
                  <span className="stealth-badge">🔒 stealth</span>
                )}
              </div>
              {link.description && (
                <p className="table-cell-description">{link.description}</p>
              )}
              {link.txHash && (
                <a
                  href={`https://testnet.arcscan.app/tx/${link.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="table-cell-txhash"
                >
                  {shortenAddr(link.txHash)} ↗
                </a>
              )}
            </div>

            {/* Status */}
            <div>
              <span className={`status-badge ${statusClass(link.status)}`}>
                <span className="status-badge-dot" />
                {link.status}
              </span>
              {link.status === "COMPLETED" && (
                <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 3, fontFamily: "IBM Plex Mono, monospace" }}>
                  Paid ✓
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <span className="table-amount">
                {formatUSDC(link.amount)}
                <span className="table-amount-unit">USDC</span>
              </span>
            </div>

            {/* Date */}
            <span className="table-date">{formatDate(link.createdAt)}</span>

            {/* Actions */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                className={`table-copy-btn${copiedId === link.id ? " copied" : ""}`}
                onClick={() => copyLink(link.id)}
                disabled={link.status !== "ACTIVE"}
              >
                {copiedId === link.id ? "Copied!" : "Copy Link"}
              </button>
              {link.status === "ACTIVE" && (
                <button
                  className="table-cancel-btn"
                  onClick={() => cancelLink(link.id)}
                  disabled={cancellingId === link.id}
                >
                  {cancellingId === link.id ? "..." : "Cancel"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}