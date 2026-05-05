"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { NavBar } from "@/components/NavBar";
import { formatDate } from "@/lib/utils";

interface EscrowLink {
  id: string;
  title: string;
  description?: string;
  amount: string;
  sellerAddress: string;
  buyerAddress?: string;
  stealthAddress: string;
  status: string;
  txHash?: string;
  releaseTxHash?: string;
  paidAt?: string;
  releaseDeadline?: string;
  confirmedAt?: string;
  disputedAt?: string;
  disputeReason?: string;
  createdAt: string;
}

function Countdown({ deadline }: { deadline: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setText("Auto-releasing..."); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setText(`Auto-release in ${d}d ${h}h`);
      else if (h > 0) setText(`Auto-release in ${h}h ${m}m`);
      else setText(`Auto-release in ${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [deadline]);
  const diff = new Date(deadline).getTime() - Date.now();
  const color = diff < 3600000 ? "var(--danger)" : diff < 86400000 ? "var(--warning)" : "var(--info)";
  return <span style={{ fontSize: 10, color, fontFamily: "IBM Plex Mono, monospace" }}>{text}</span>;
}

const statusColor = (s: string) => ({ ACTIVE: "#f5a623", HOLDING: "#5b8ff9", CONFIRMED: "#00E5A0", RELEASED: "#00E5A0", DISPUTED: "#f03e5f", CANCELLED: "#666" }[s] ?? "#666");
const statusClass = (s: string) => ({ ACTIVE: "status-yellow", HOLDING: "status-blue", CONFIRMED: "status-green", RELEASED: "status-green", DISPUTED: "status-red", CANCELLED: "status-red" }[s] ?? "status-red");

export default function EscrowPage() {
  const { address, isConnected } = useAccount();
  const [escrows, setEscrows] = useState<EscrowLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "HOLDING" | "RELEASED" | "DISPUTED">("ALL");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchEscrows = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/escrow?address=${address}`);
      if (!res.ok) return;
      const data = await res.json();
      setEscrows(data.escrows ?? []);
    } catch {}
    finally { setIsLoading(false); }
  }, [address]);

  useEffect(() => { if (isConnected && address) fetchEscrows(); }, [isConnected, address, fetchEscrows]);

  const createEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { setCreateError("Enter a valid amount."); return; }
    if (!title.trim()) { setCreateError("Title is required."); return; }
    setIsCreating(true); setCreateError("");
    try {
      const res = await fetch("/api/escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), amount: parsed.toString(), description: description.trim() || undefined, sellerAddress: address }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const { escrow } = await res.json();
      const url = `${window.location.origin}/escrow/${escrow.id}`;
      setCreatedLink(url);
      setTitle(""); setAmount(""); setDescription("");
      fetchEscrows();
    } catch (err: any) {
      setCreateError(err.message ?? "Something went wrong.");
    } finally { setIsCreating(false); }
  };

  const cancelEscrow = async (id: string) => {
    if (!confirm("Cancel this escrow link?")) return;
    setCancellingId(id);
    try {
      await fetch(`/api/escrow/${id}`, { method: "DELETE" });
      fetchEscrows();
    } catch {}
    finally { setCancellingId(null); }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/escrow/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = filter === "ALL" ? escrows : escrows.filter(e => e.status === filter);
  const counts = {
    ALL: escrows.length,
    ACTIVE: escrows.filter(e => e.status === "ACTIVE").length,
    HOLDING: escrows.filter(e => e.status === "HOLDING").length,
    RELEASED: escrows.filter(e => ["RELEASED", "CONFIRMED"].includes(e.status)).length,
    DISPUTED: escrows.filter(e => e.status === "DISPUTED").length,
  };

  const totalHeld = escrows.filter(e => e.status === "HOLDING").reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalReleased = escrows.filter(e => ["RELEASED", "CONFIRMED"].includes(e.status)).reduce((s, e) => s + parseFloat(e.amount), 0);
  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);

  return (
    <div className="app">
      <NavBar/>
      <div className="page-wrap">

        <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">Escrow</h1>
            <p className="page-subtitle">Hold funds until buyer confirms receipt</p>
          </div>
          {mounted && isConnected && (
            <button onClick={() => { setShowForm(!showForm); setCreatedLink(null); }} className="form-submit-btn" style={{ width: "auto", padding: "10px 20px" }}>
              {showForm ? "✕ Close" : "+ New Escrow"}
            </button>
          )}
        </div>

        {/* Stats */}
        {mounted && isConnected && escrows.length > 0 && (
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            {[
              { label: "Currently Held", value: fmt(totalHeld), unit: "USDC", sub: `${counts.HOLDING} active escrows`, color: "var(--info)" },
              { label: "Total Released", value: fmt(totalReleased), unit: "USDC", sub: `${counts.RELEASED} completed`, color: "var(--c)" },
              { label: "Disputed", value: counts.DISPUTED.toString(), unit: "", sub: "needs attention", color: counts.DISPUTED > 0 ? "var(--danger)" : "var(--ink-3)" },
              { label: "Total Escrows", value: escrows.length.toString(), unit: "", sub: `${counts.ACTIVE} active`, color: "var(--warning)" },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-card-line" style={{ background: s.color }}/>
                <div className="stat-value">{s.value}{s.unit && <span style={{ fontSize: 13, color: s.color, marginLeft: 4, fontFamily: "IBM Plex Mono, monospace" }}>{s.unit}</span>}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Create form */}
        {showForm && mounted && isConnected && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-head">
              <div className="card-head-icon">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="2" y="6" width="12" height="9" rx="1.5" stroke="var(--c)" strokeWidth="1.3"/><path d="M5 6V4.5a3 3 0 016 0V6" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round"/></svg>
              </div>
              <div><div className="card-title">New Escrow Link</div><div className="card-subtitle">Buyer pays, funds held until confirmed</div></div>
            </div>
            <div className="card-body">
              {createdLink ? (
                <div className="animate-fade-up">
                  <div className="success-box">
                    <div className="success-box-header">
                      <div className="success-check-icon">
                        <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M2 6l2.5 2.5L10 3.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span className="success-label">Escrow link created!</span>
                    </div>
                    <div className="success-link-row">
                      <div className="success-link-input">{createdLink}</div>
                      <button onClick={() => { navigator.clipboard.writeText(createdLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`success-copy-btn${copied ? " copied" : ""}`}>
                        {copied ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 12, lineHeight: 1.6 }}>
                    Share this link with your buyer. They pay → funds are held → you deliver → they confirm → you receive payment.
                  </p>
                  <button className="form-another-btn" onClick={() => { setCreatedLink(null); }}>+ Create another</button>
                </div>
              ) : (
                <form onSubmit={createEscrow}>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input type="text" className="input" placeholder="e.g. iPhone 15 Pro — Lagos delivery" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} required/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount</label>
                    <div className="form-input-wrap">
                      <input type="number" className="input mono" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} min="0.000001" step="any" required style={{ paddingRight: 52 }}/>
                      <span className="form-input-suffix">USDC</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description <span className="form-label-optional">(optional)</span></label>
                    <input type="text" className="input" placeholder="e.g. Item details, delivery terms..." value={description} onChange={e => setDescription(e.target.value)} maxLength={200}/>
                  </div>
                  <div className="stealth-info-box" style={{ marginBottom: 16 }}>
                    <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{ flexShrink: 0, marginTop: 1 }}>
                      <rect x="2" y="6" width="12" height="9" rx="1.5" stroke="var(--c)" strokeWidth="1.3"/>
                      <path d="M5 6V4.5a3 3 0 016 0V6" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    <p style={{ fontSize: 11, color: "var(--c)", lineHeight: 1.5 }}>
                      Funds are held in an escrow wallet for 7 days. Auto-releases to you if buyer doesn't confirm. Buyer can raise a dispute at any time.
                    </p>
                  </div>
                  {createError && <div className="form-error">{createError}</div>}
                  <button type="submit" className="form-submit-btn" disabled={isCreating}>
                    {isCreating ? <span className="form-submit-spinner"><span className="spinner"/>Creating escrow...</span> : "Create Escrow Link"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Not connected */}
        {mounted && !isConnected && (
          <div className="empty" style={{ paddingTop: 80 }}>
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--ink-3)" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <p className="empty-title">Connect your wallet</p>
            <p className="empty-sub">Connect to create and manage escrow links</p>
          </div>
        )}

        {/* Table */}
        {mounted && isConnected && (
          <div className="table-card">
            <div className="table-header">
              <div className="table-header-left">
                <span className="table-header-title">Escrow Links</span>
                <span className="table-count-badge">{counts[filter]}</span>
              </div>
              <div className="table-header-right">
                {(["ALL", "ACTIVE", "HOLDING", "RELEASED", "DISPUTED"] as const).map(f => (
                  <button key={f} className={`filter-pill${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
                    {f}{f === "DISPUTED" && counts.DISPUTED > 0 && <span style={{ marginLeft: 4, background: "var(--danger)", color: "#fff", borderRadius: "50%", width: 14, height: 14, fontSize: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{counts.DISPUTED}</span>}
                  </button>
                ))}
                <button className="table-refresh-btn" onClick={fetchEscrows} title="Refresh">↻</button>
              </div>
            </div>

            {filtered.length > 0 && (
              <div className="table-col-headers">
                {["TITLE", "STATUS", "AMOUNT", "BUYER", "CREATED", "ACTIONS"].map(c => (
                  <span key={c} className="table-col-header">{c}</span>
                ))}
              </div>
            )}

            <div style={{ overflowY: "auto", maxHeight: 520 }}>
              {isLoading && <div className="loading-center" style={{ height: 160 }}><div className="page-spinner"/></div>}

              {!isLoading && filtered.length === 0 && (
                <div className="table-empty">
                  <div className="table-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--ink-3)" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <p className="table-empty-title">{filter === "ALL" ? "No escrow links yet" : `No ${filter.toLowerCase()} escrows`}</p>
                  <p className="table-empty-sub">{filter === "ALL" ? "Create your first escrow link above" : "Try a different filter"}</p>
                </div>
              )}

              {!isLoading && filtered.map(e => (
                <div key={e.id} className="table-row" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}>
                  <div className="table-cell-title">
                    <div className="table-cell-title-name">
                      <span className="table-cell-status-dot" style={{ background: statusColor(e.status) }}/>
                      <span className="table-cell-title-text">{e.title}</span>
                      {e.status === "DISPUTED" && <span style={{ fontSize: 9, background: "rgba(240,62,95,.15)", color: "var(--danger)", border: "1px solid rgba(240,62,95,.3)", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>DISPUTE</span>}
                    </div>
                    {e.description && <p className="table-cell-description">{e.description}</p>}
                    {e.status === "HOLDING" && e.releaseDeadline && <Countdown deadline={e.releaseDeadline}/>}
                    {e.disputeReason && <p style={{ fontSize: 10, color: "var(--danger)", marginTop: 3 }}>"{e.disputeReason}"</p>}
                    {e.releaseTxHash && (
                      <a href={`https://testnet.arcscan.app/tx/${e.releaseTxHash}`} target="_blank" rel="noopener noreferrer" className="table-cell-txhash">
                        released ↗
                      </a>
                    )}
                  </div>

                  <div>
                    <span className={`status-badge ${statusClass(e.status)}`}>
                      <span className="status-badge-dot"/>
                      {e.status}
                    </span>
                  </div>

                  <div>
                    <span className="table-amount">{parseFloat(e.amount) % 1 === 0 ? e.amount : parseFloat(e.amount).toFixed(2)}<span className="table-amount-unit">USDC</span></span>
                  </div>

                  <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>
                    {e.buyerAddress ? `${e.buyerAddress.slice(0, 6)}...${e.buyerAddress.slice(-4)}` : "—"}
                  </span>

                  <span className="table-date">{formatDate(e.createdAt)}</span>

                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {e.status === "ACTIVE" && (
                      <>
                        <button className="table-copy-btn" onClick={() => copyLink(e.id)}>Copy Link</button>
                        <button className="table-cancel-btn" onClick={() => cancelEscrow(e.id)} disabled={cancellingId === e.id}>
                          {cancellingId === e.id ? "..." : "Cancel"}
                        </button>
                      </>
                    )}
                    {e.status === "HOLDING" && <span style={{ fontSize: 11, color: "var(--info)", fontFamily: "IBM Plex Mono, monospace" }}>Awaiting confirmation</span>}
                    {e.status === "CONFIRMED" && <span style={{ fontSize: 11, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace" }}>Releasing...</span>}
                    {e.status === "RELEASED" && <span style={{ fontSize: 11, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace" }}>✓ Released</span>}
                    {e.status === "DISPUTED" && <span style={{ fontSize: 11, color: "var(--danger)", fontFamily: "IBM Plex Mono, monospace" }}>Admin review</span>}
                    {e.status === "CANCELLED" && <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>Cancelled</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      <footer className="app-footer">
        <span>Conduit v0.1.0</span>
        <span>Built on Arc Network · Powered by Circle</span>
      </footer>
    </div>
  );
}
