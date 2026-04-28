"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { formatUSDC, getStatusLabel, getPaymentUrl, formatDate, shortenAddress } from "@/lib/utils";

interface PaymentLink {
  id: string;
  title: string;
  description?: string;
  amount: string;
  recipientAddress: string;
  stealthAddress?: string | null;
  status: string;
  txHash?: string;
  paidBy?: string;
  createdAt: string;
}

type Filter = "ALL" | "ACTIVE" | "COMPLETED" | "EXPIRED";

const STATUS_DOT: Record<string, string> = {
  COMPLETED: "#10b981",
  ACTIVE:    "#f59e0b",
  EXPIRED:   "#ef4444",
};

const STATUS_CLASS: Record<string, string> = {
  COMPLETED: "status-green",
  ACTIVE:    "status-yellow",
  EXPIRED:   "status-red",
};

export function PaymentLinksTable({ refreshTrigger }: { refreshTrigger: number }) {
  const { address, isConnected } = useAccount();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/links?address=${address}`);
      if (res.ok) { const d = await res.json(); setLinks(d.links); }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [address]);

  useEffect(() => { fetchLinks(); }, [fetchLinks, refreshTrigger]);

  const handleCopy = async (id: string) => {
    await navigator.clipboard.writeText(getPaymentUrl(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this payment link? It will no longer be payable.")) return;
    setCancellingId(id);
    try {
      await fetch(`/api/links/${id}`, { method: "DELETE" });
      await fetchLinks();
    } catch (err) { console.error(err); }
    finally { setCancellingId(null); }
  };

  const handleExportCSV = () => {
    if (!links.length) return;
    const header = ["Title", "Amount (USDC)", "Status", "Stealth", "Created", "Tx Hash"];
    const rows = links.map(l => [
      `"${l.title}"`, l.amount, l.status,
      l.stealthAddress ? "Yes" : "No",
      formatDate(l.createdAt), l.txHash ?? "",
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "arcwave-payments.csv";
    a.click();
  };

  const filtered = filter === "ALL" ? links : links.filter(l => l.status === filter);

  if (!isConnected) {
    return (
      <div className="table-card">
        <div className="table-not-connected">
          <div className="table-not-connected-icon">
            <svg viewBox="0 0 22 22" fill="none" width="18" height="18">
              <rect x="2" y="7" width="18" height="13" rx="2" stroke="#4a4f6a" strokeWidth="1.4"/>
              <path d="M15 7V5a4 4 0 00-8 0v2" stroke="#4a4f6a" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="table-not-connected-text">Connect your wallet to view payment links</p>
          <p className="table-not-connected-sub">All your links will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-card">
      {/* Header */}
      <div className="table-header">
        <div className="table-header-left">
          <span className="table-header-title">Payment Links</span>
          {links.length > 0 && <span className="table-count-badge">{links.length}</span>}
        </div>
        <div className="table-header-right">
          {(["ALL", "ACTIVE", "COMPLETED", "EXPIRED"] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`filter-pill${filter === f ? " active" : ""}`}>
              {f}
            </button>
          ))}
          <button className="table-refresh-btn" onClick={fetchLinks} title="Refresh">↻</button>
          <button className="table-export-btn" onClick={handleExportCSV} disabled={!links.length}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        [1, 2, 3].map(i => (
          <div key={i} className="table-skeleton-row">
            <div className="skeleton" style={{ height: 13, width: "55%" }}/>
            <div className="skeleton" style={{ height: 20, width: 70, borderRadius: 20 }}/>
            <div className="skeleton" style={{ height: 13, width: 80 }}/>
            <div className="skeleton" style={{ height: 13, width: 60 }}/>
            <div className="skeleton" style={{ height: 28, width: 120, borderRadius: 7 }}/>
          </div>
        ))
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="table-empty">
          <div className="table-empty-icon">
            <svg viewBox="0 0 18 18" fill="none" width="15" height="15">
              <path d="M9 3v12M3 9h12" stroke="#4a4f6a" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="table-empty-title">
            {filter === "ALL" ? "No payment links yet" : `No ${filter.toLowerCase()} links`}
          </p>
          <p className="table-empty-sub">
            {filter === "ALL" ? "Create your first link using the form" : "Try a different filter"}
          </p>
        </div>
      )}

      {/* Rows */}
      {!isLoading && filtered.length > 0 && (
        <>
          <div className="table-col-headers">
            {["TITLE", "STATUS", "AMOUNT", "CREATED", "ACTIONS"].map(col => (
              <span key={col} className="table-col-header">{col}</span>
            ))}
          </div>

          {filtered.map(link => (
            <div key={link.id} className="table-row animate-fade-up">

              {/* Title + stealth badge */}
              <div className="table-cell-title">
                <div className="table-cell-title-name">
                  <span className="table-cell-status-dot" style={{ background: STATUS_DOT[link.status] ?? "#4a4f6a" }}/>
                  <span className="table-cell-title-text">{link.title}</span>
                  {link.stealthAddress && (
                    <span className="stealth-badge">🔒 stealth</span>
                  )}
                </div>
                {link.description && <p className="table-cell-description">{link.description}</p>}
                {link.txHash && (
                  <a
                    href={`https://testnet.arcscan.app/tx/${link.txHash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="table-cell-txhash"
                  >
                    {shortenAddress(link.txHash)} ↗
                  </a>
                )}
              </div>

              {/* Status */}
              <div>
                <span className={`status-badge ${STATUS_CLASS[link.status] ?? ""}`}>
                  <span className="status-badge-dot"/>
                  {getStatusLabel(link.status)}
                </span>
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
              <div style={{ display: "flex", gap: 6 }}>
                {link.status === "ACTIVE" && (
                  <>
                    <button
                      onClick={() => handleCopy(link.id)}
                      className={`table-copy-btn${copiedId === link.id ? " copied" : ""}`}
                    >
                      {copiedId === link.id ? "✓ Copied" : "Copy"}
                    </button>
                    <button
                      onClick={() => handleCancel(link.id)}
                      disabled={cancellingId === link.id}
                      className="table-cancel-btn"
                    >
                      {cancellingId === link.id ? "..." : "Cancel"}
                    </button>
                  </>
                )}
                {link.status !== "ACTIVE" && (
                  <span style={{ fontSize: 11, color: "#4a4f6a" }}>
                    {link.status === "COMPLETED" ? "Paid ✓" : "Cancelled"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
