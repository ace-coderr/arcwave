"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { getPaymentUrl } from "@/lib/utils";

interface CreateLinkFormProps {
  onLinkCreated: () => void;
}

export function CreateLinkForm({ onLinkCreated }: CreateLinkFormProps) {
  const { address, isConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [description, setDescription] = useState("");
  const [stealthMode, setStealthMode] = useState(false);
  const [customAmount, setCustomAmount] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) { setError("Connect your wallet first."); return; }
    if (!title.trim()) { setError("Title is required."); return; }

    if (!customAmount) {
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || parsed <= 0) { setError("Enter a valid amount greater than 0."); return; }
    }

    if (customAmount && minAmount) {
      const parsedMin = parseFloat(minAmount);
      if (isNaN(parsedMin) || parsedMin < 0) { setError("Enter a valid minimum amount."); return; }
    }

    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          amount: customAmount ? "0" : parseFloat(amount).toString(),
          minAmount: customAmount && minAmount ? parseFloat(minAmount).toString() : undefined,
          customAmount,
          description: description.trim() || undefined,
          recipientAddress: address,
          stealthMode,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const { link } = await res.json();
      setCreatedLink(getPaymentUrl(link.id));
      setTitle(""); setAmount(""); setMinAmount(""); setDescription("");
      setCustomAmount(false); setStealthMode(false);
      onLinkCreated();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="form-card">
      <div className="form-card-header">
        <div className="form-card-header-icon">
          <svg viewBox="0 0 18 18" fill="none" width="15" height="15">
            <path d="M9 3v12M3 9h12" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div className="form-card-title">New Payment Link</div>
          <div className="form-card-subtitle">Generate a shareable USDC link</div>
        </div>
      </div>

      <div className="form-card-body">
        {createdLink ? (
          <div className="animate-fade-up">
            <div className="success-box">
              <div className="success-box-header">
                <div className="success-check-icon">
                  <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
                    <path d="M2 6l2.5 2.5L10 3.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="success-label">Link created successfully</span>
              </div>
              <div className="success-link-row">
                <div className="success-link-input">{createdLink}</div>
                <button onClick={handleCopy} className={`success-copy-btn${copied ? " copied" : ""}`}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
            <button className="form-another-btn" onClick={() => setCreatedLink(null)}>
              + Create another link
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">Title</label>
              <input type="text" className="input" placeholder="e.g. Freelance Invoice #102" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} required disabled={!isConnected}/>
            </div>

            {/* Custom amount toggle */}
            <div className="stealth-toggle-row" style={{ marginBottom: 12 }}>
              <div className="stealth-toggle-info">
                <div className="stealth-toggle-label">
                  <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Custom Amount
                </div>
                <div className="stealth-toggle-desc">
                  {customAmount
                    ? "Payer enters their own amount — great for tips and donations"
                    : "You set a fixed amount the payer must pay"}
                </div>
              </div>
              <button type="button" onClick={() => { setCustomAmount(!customAmount); setAmount(""); }} disabled={!isConnected} className={`toggle-switch${customAmount ? " on" : ""}`} aria-label="Toggle custom amount">
                <span className="toggle-knob"/>
              </button>
            </div>

            {/* Amount field — fixed or minimum */}
            {!customAmount ? (
              <div className="form-group">
                <label className="form-label">Amount</label>
                <div className="form-input-wrap">
                  <input type="number" className="input mono" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} min="0.000001" step="any" required disabled={!isConnected} style={{ paddingRight: 52 }}/>
                  <span className="form-input-suffix">USDC</span>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">
                  Minimum Amount <span className="form-label-opt">(optional)</span>
                </label>
                <div className="form-input-wrap">
                  <input type="number" className="input mono" placeholder="0.00 — no minimum" value={minAmount} onChange={e => setMinAmount(e.target.value)} min="0" step="any" disabled={!isConnected} style={{ paddingRight: 52 }}/>
                  <span className="form-input-suffix">USDC</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.5 }}>
                  Payer can send any amount above this minimum. Leave blank for no minimum.
                </div>
              </div>
            )}

            {/* Description */}
            <div className="form-group">
              <label className="form-label">
                Description <span className="form-label-optional">(optional)</span>
              </label>
              <input type="text" className="input" placeholder="e.g. Logo design for Acme Corp" value={description} onChange={e => setDescription(e.target.value)} maxLength={200} disabled={!isConnected}/>
            </div>

            {/* Stealth Mode Toggle */}
            <div className="stealth-toggle-row">
              <div className="stealth-toggle-info">
                <div className="stealth-toggle-label">
                  <svg viewBox="0 0 16 16" fill="none" width="13" height="13" style={{ flexShrink: 0 }}>
                    <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Stealth Mode
                </div>
                <div className="stealth-toggle-desc">
                  {stealthMode
                    ? "Payment routed through temp wallet — your address is hidden"
                    : "Payment goes directly to your wallet — address visible on-chain"}
                </div>
              </div>
              <button type="button" onClick={() => setStealthMode(!stealthMode)} disabled={!isConnected} className={`toggle-switch${stealthMode ? " on" : ""}`} aria-label="Toggle stealth mode">
                <span className="toggle-knob"/>
              </button>
            </div>

            {stealthMode && (
              <div className="stealth-info-box animate-fade-up">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{ flexShrink: 0, marginTop: 1 }}>
                  <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="#a78bfa" strokeWidth="1.3"/>
                  <path d="M5 7V5a3 3 0 016 0v2" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <p style={{ fontSize: 11, color: "#a78bfa", lineHeight: 1.5 }}>
                  A fresh temp wallet will receive the payment and auto-forward to your real address. Payer cannot track you on ArcScan.
                </p>
              </div>
            )}

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="form-submit-btn" disabled={isLoading || !isConnected}>
              {isLoading ? (
                <span className="form-submit-spinner">
                  <span className="spinner"/>
                  {stealthMode ? "Generating stealth link..." : "Generating..."}
                </span>
              ) : !isConnected ? "Connect Wallet First"
                : stealthMode ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                    <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                      <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    Generate Private Link
                  </span>
                ) : "Generate Payment Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
