"use client";

import { useState, useEffect } from "react";
import {
  useAccount, useConnect, useDisconnect,
  useSendTransaction, useWaitForTransactionReceipt,
  useBalance, useSwitchChain,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { parseEther, formatEther } from "viem";
import { arcTestnet } from "@/lib/arcChain";

const FEE_COLLECTOR = "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c";
const FEE_PERCENT = 0.5;

function calcFee(amount: string) {
  const total = parseFloat(amount);
  const fee = Math.max((total * FEE_PERCENT) / 100, 0.001);
  return { fee: fee.toFixed(4), totalPays: (total + fee).toFixed(4) };
}

interface EscrowData {
  id: string;
  title: string;
  description?: string;
  amount: string;
  sellerAddress: string;
  stealthAddress: string;
  sellerContact?: string;
  status: string;
  txHash?: string;
  paidAt?: string;
  releaseDeadline?: string;
  confirmedAt?: string;
  disputedAt?: string;
}

function Logo() {
  return (
    <div className="pay-logo">
      <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 80, width: "auto", objectFit: "contain" }} />
    </div>
  );
}

function Countdown({ deadline }: { deadline: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setText("Deadline passed"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      setText(d > 0 ? `${d}d ${h}h remaining` : `${h}h remaining`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [deadline]);
  return <span style={{ color: "var(--warning)", fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>{text}</span>;
}

type PayStep = "idle" | "sending_payment" | "sending_fee" | "recording" | "done" | "failed";

export function EscrowPayPage({ escrow }: { escrow: EscrowData }) {
  const [mounted, setMounted] = useState(false);
  const [payStep, setPayStep] = useState<PayStep>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [feeTxHash, setFeeTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [localStatus, setLocalStatus] = useState(escrow.status);
  const [localDeadline, setLocalDeadline] = useState(escrow.releaseDeadline);

  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const isOnArc = chainId === arcTestnet.id;

  const { fee: feeAmount, totalPays } = calcFee(escrow.amount);
  const { data: balance } = useBalance({ address, chainId: arcTestnet.id });
  const bal = balance ? parseFloat(formatEther(balance.value)) : 0;
  const hasEnough = bal >= parseFloat(totalPays);

  const { sendTransaction: sendPayment, isPending: isPaymentPending } = useSendTransaction();
  const { isLoading: isPaymentWaiting, isSuccess: paymentConfirmed } = useWaitForTransactionReceipt({ hash: txHash, chainId: arcTestnet.id });
  const { sendTransaction: sendFee, isPending: isFeePending } = useSendTransaction();
  const { isLoading: isFeeWaiting, isSuccess: feeConfirmed } = useWaitForTransactionReceipt({ hash: feeTxHash, chainId: arcTestnet.id });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (paymentConfirmed && txHash && payStep === "sending_payment") {
      setPayStep("sending_fee");
      sendFee(
        { to: FEE_COLLECTOR as `0x${string}`, value: parseEther(feeAmount), chainId: arcTestnet.id },
        {
          onSuccess: (hash) => { setFeeTxHash(hash); },
          onError: (err: Error) => { setPayStep("idle"); setError("Fee transaction failed. Please try again."); },
        }
      );
    }
  }, [paymentConfirmed]);

  useEffect(() => {
    if (feeConfirmed && feeTxHash && payStep === "sending_fee") {
      setPayStep("recording");
      recordPayment();
    }
  }, [feeConfirmed]);

  const recordPayment = async () => {
    try {
      const res = await fetch(`/api/escrow/${escrow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay", txHash, paidBy: address }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to record payment."); setPayStep("failed"); return; }
      setLocalStatus("HOLDING");
      setLocalDeadline(data.releaseDeadline);
      setPayStep("done");
    } catch {
      setError("Network error. Payment was sent — contact support with tx hash.");
      setPayStep("failed");
    }
  };

  const handlePay = () => {
    setError("");
    setPayStep("sending_payment");
    sendPayment(
      { to: escrow.stealthAddress as `0x${string}`, value: parseEther(escrow.amount), chainId: arcTestnet.id },
      {
        onSuccess: (hash) => { setTxHash(hash); },
        onError: (err: Error) => {
          setPayStep("idle");
          if (err.message?.includes("rejected") || err.message?.includes("denied")) setError("Transaction rejected.");
          else setError("Transaction failed. Please try again.");
        },
      }
    );
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/escrow/${escrow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      if (res.ok) setLocalStatus("CONFIRMED");
      else { const d = await res.json(); setError(d.error ?? "Failed."); }
    } catch { setError("Network error."); }
    finally { setConfirming(false); }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) { setError("Please describe the issue."); return; }
    setDisputing(true);
    try {
      const res = await fetch(`/api/escrow/${escrow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispute", disputeReason }),
      });
      if (res.ok) { setLocalStatus("DISPUTED"); setShowDisputeForm(false); }
      else { const d = await res.json(); setError(d.error ?? "Failed."); }
    } catch { setError("Network error."); }
    finally { setDisputing(false); }
  };

  const statusMsg = () => {
    if (isPaymentPending) return "Confirm payment in MetaMask...";
    if (isPaymentWaiting) return "Confirming payment...";
    if (payStep === "sending_fee" && isFeePending) return "Confirm fee in MetaMask...";
    if (payStep === "sending_fee" && isFeeWaiting) return "Confirming fee...";
    if (payStep === "recording") return "Recording payment...";
    return "Processing...";
  };

  const isBusy = ["sending_payment", "sending_fee", "recording"].includes(payStep) || isPaymentPending || isPaymentWaiting || isFeePending || isFeeWaiting;
  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);

  // Cancelled
  if (localStatus === "CANCELLED") return (
    <div className="pay-page"><Logo /><p className="pay-tagline">ESCROW</p>
      <div className="pay-card"><div className="pay-card-bar" />
        <div className="pay-actions" style={{ textAlign: "center", padding: "36px 28px" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(240,62,95,.1)", border: "1.5px solid rgba(240,62,95,.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg viewBox="0 0 24 24" fill="none" width="24" height="24"><circle cx="12" cy="12" r="10" stroke="var(--danger)" strokeWidth="1.5" /><path d="M8 8l8 8M16 8l-8 8" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: "var(--danger)", marginBottom: 8 }}>Escrow Cancelled</p>
          <p style={{ fontSize: 13, color: "var(--ink-2)" }}>This escrow has been cancelled by the seller.</p>
          <a href="/"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              marginTop: 20, padding: "11px 22px",
              background: "var(--raised)", border: "1px solid var(--stroke)",
              borderRadius: "var(--r-md)", fontSize: 13, fontWeight: 700,
              color: "var(--ink-2)", textDecoration: "none",
              transition: "border-color .15s",
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Conduit
          </a>
        </div>
      </div>
      <p className="pay-powered">Powered by Arc Network & Circle</p>
    </div>
  );

  // Confirmed / Released
  if (["CONFIRMED", "RELEASED"].includes(localStatus) && payStep !== "done") return (
    <div className="pay-page"><Logo /><p className="pay-tagline">ESCROW</p>
      <div className="pay-card"><div className="pay-card-bar" />
        <div className="pay-actions" style={{ textAlign: "center" }}>
          <div className="pay-success-icon"><svg viewBox="0 0 24 24" fill="none" width="28" height="28"><path d="M5 12l4.5 4.5L19 7" stroke="var(--c)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          <p className="pay-success-title">Receipt Confirmed!</p>
          <p className="pay-success-desc">Funds have been released to the seller.</p>
          <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 14 }}>Transaction complete.</p>
          <a
            href="/"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", background: "var(--c)", borderRadius: "var(--r-md)", fontSize: 13, fontWeight: 700, color: "#000", textDecoration: "none", boxShadow: "0 4px 14px rgba(0,229,160,.3)", marginTop: 8 }}
          >
            Go to Dashboard →
          </a>
        </div>
      </div>
      <p className="pay-powered">Powered by Arc Network & Circle</p>
    </div>
  );

  // Disputed
  if (localStatus === "DISPUTED") return (
    <div className="pay-page"><Logo /><p className="pay-tagline">ESCROW</p>
      <div className="pay-card"><div className="pay-card-bar" />
        <div className="pay-actions" style={{ textAlign: "center", padding: "36px 28px" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(240,62,95,.1)", border: "1.5px solid rgba(240,62,95,.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg viewBox="0 0 24 24" fill="none" width="24" height="24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: "var(--danger)", marginBottom: 8 }}>Dispute Raised</p>
          <p style={{ fontSize: 13, color: "var(--ink-2)" }}>Your dispute has been submitted. Admin will review and resolve within 24 hours.</p>
          <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 12, fontFamily: "IBM Plex Mono, monospace" }}>Funds are frozen pending resolution.</p>
          <a href="/"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              marginTop: 20, padding: "11px 22px",
              background: "var(--raised)", border: "1px solid var(--stroke)",
              borderRadius: "var(--r-md)", fontSize: 13, fontWeight: 700,
              color: "var(--ink-2)", textDecoration: "none",
              transition: "border-color .15s",
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Conduit
          </a>
          <a
            href="/"
            style={{ display: "inline-block", marginTop: 16, fontSize: 13, color: "var(--ink-3)", textDecoration: "none", fontWeight: 600 }}
          >
            ← Back to Conduit
          </a>
        </div>
      </div>
      <p className="pay-powered">Powered by Arc Network & Circle</p>
    </div>
  );

  // Success after payment
  if (payStep === "done" || localStatus === "HOLDING") return (
    <div className="pay-page"><Logo /><p className="pay-tagline">ESCROW</p>
      <div className="pay-card"><div className="pay-card-bar" />
        <div className="pay-actions" style={{ textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(91,143,249,.15)", border: "2px solid rgba(91,143,249,.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28"><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--info)" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--info)" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </div>
          <p style={{ fontSize: 20, fontWeight: 800, color: "var(--ink-1)", marginBottom: 8 }}>Funds Held in Escrow</p>
          <p style={{ fontSize: 14, color: "#5b8ff9", fontWeight: 700, fontFamily: "IBM Plex Mono, monospace", marginBottom: 4 }}>{escrow.amount} USDC</p>
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 16, lineHeight: 1.6 }}>
            Payment is secured. Once you receive your order, confirm receipt to release funds to the seller.
          </p>

          {/* Seller contact */}
          {escrow.sellerContact && (
            <div style={{ background: "rgba(91,143,249,.08)", border: "1px solid rgba(91,143,249,.2)", borderRadius: "var(--r-sm)", padding: "12px 14px", marginBottom: 16, textAlign: "left" }}>
              <p style={{ fontSize: 10, color: "#5b8ff9", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, marginBottom: 6, letterSpacing: ".08em" }}>CONTACT SELLER FOR DELIVERY</p>
              <p style={{ fontSize: 13, color: "var(--ink-1)", fontWeight: 700 }}>{escrow.sellerContact}</p>
              <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>Reach out to arrange delivery of your order.</p>
            </div>
          )}

          {/* Save link notice */}
          <div style={{ background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: "var(--r-sm)", padding: "10px 14px", marginBottom: 16, textAlign: "left", display: "flex", gap: 8 }}>
            <svg viewBox="0 0 16 16" fill="none" width="13" height="13" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="8" cy="8" r="6" stroke="var(--ink-3)" strokeWidth="1.2" />
              <path d="M8 5v3l2 1.5" stroke="var(--ink-3)" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <div>
              <p style={{ fontSize: 11, color: "var(--ink-2)", fontWeight: 600, marginBottom: 3 }}>You can close this page</p>
              <p style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>Bookmark this URL or save it. Come back anytime to confirm receipt or raise a dispute.</p>
            </div>
          </div>

          {localDeadline && <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 16 }}><Countdown deadline={localDeadline} /></p>}

          {/* Confirm receipt button */}
          {!showDisputeForm && (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              style={{ width: "100%", padding: "14px", background: "var(--c)", border: "none", borderRadius: "var(--r-md)", color: "#000", fontSize: 14, fontWeight: 800, cursor: confirming ? "not-allowed" : "pointer", fontFamily: "Sora, sans-serif", marginBottom: 10, boxShadow: "0 4px 16px rgba(0,229,160,.35)", opacity: confirming ? .5 : 1 }}
            >
              {confirming ? "Releasing funds..." : "I received my order — Release funds"}
            </button>
          )}

          {/* Dispute button */}
          {!showDisputeForm ? (
            <button
              onClick={() => setShowDisputeForm(true)}
              style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid rgba(240,62,95,.3)", borderRadius: "var(--r-md)", color: "var(--danger)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}
            >
              Raise a dispute
            </button>
          ) : (
            <div style={{ textAlign: "left", marginTop: 8 }}>
              <p style={{ fontSize: 12, color: "var(--danger)", fontWeight: 700, marginBottom: 8 }}>Describe the issue:</p>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder="e.g. Item not delivered, wrong item received..."
                style={{ width: "100%", padding: "10px 12px", background: "var(--raised)", border: "1px solid rgba(240,62,95,.3)", borderRadius: "var(--r-sm)", color: "var(--ink-1)", fontSize: 12, fontFamily: "Sora, sans-serif", resize: "vertical", minHeight: 80, boxSizing: "border-box", outline: "none" }}
              />
              {error && <div className="pay-err-box" style={{ marginTop: 8 }}>{error}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => { setShowDisputeForm(false); setError(""); }} style={{ flex: 1, padding: "10px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: "var(--r-sm)", color: "var(--ink-2)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>Cancel</button>
                <button onClick={handleDispute} disabled={disputing} style={{ flex: 2, padding: "10px", background: "var(--danger)", border: "none", borderRadius: "var(--r-sm)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: disputing ? "not-allowed" : "pointer", fontFamily: "Sora, sans-serif", opacity: disputing ? .5 : 1 }}>
                  {disputing ? "Submitting..." : "Submit Dispute"}
                </button>
              </div>
            </div>
          )}

          {txHash && (
            <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="pay-tx-link" style={{ display: "block", marginTop: 16 }}>View payment on ArcScan ↗</a>
          )}
        </div>
      </div>
      <p className="pay-powered">Powered by Arc Network & Circle</p>
    </div>
  );

  // Main pay page
  return (
    <div className="pay-page">
      <Logo />
      <p className="pay-tagline">ESCROW PAYMENT</p>
      <div className="pay-card">
        <div className="pay-card-bar" />

        {/* Escrow badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderBottom: "1px solid var(--stroke)" }}>
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
            <rect x="2" y="6" width="12" height="9" rx="1.5" stroke="#5b8ff9" strokeWidth="1.3" />
            <path d="M5 6V4.5a3 3 0 016 0V6" stroke="#5b8ff9" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 10, color: "#5b8ff9", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".1em" }}>PROTECTED BY CONDUIT ESCROW</span>
        </div>

        <div className="pay-amount-zone">
          <div>
            <span className="pay-amount">{fmt(parseFloat(escrow.amount))}</span>
            <span className="pay-currency">USDC</span>
          </div>
          <p className="pay-link-title">{escrow.title}</p>
          {escrow.description && <p className="pay-link-desc">{escrow.description}</p>}
        </div>

        <div className="pay-details">
          <div className="pay-detail">
            <span className="pay-detail-k">Seller</span>
            <span className="pay-detail-v" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>
              {escrow.sellerAddress.slice(0, 6)}...{escrow.sellerAddress.slice(-4)}
            </span>
          </div>
          <div className="pay-detail">
            <span className="pay-detail-k">Held in</span>
            <span className="pay-detail-v" style={{ color: "#5b8ff9", fontSize: 11 }}>Escrow wallet</span>
          </div>
          <div className="pay-detail">
            <span className="pay-detail-k">Auto-release</span>
            <span className="pay-detail-v" style={{ fontSize: 11, color: "var(--ink-3)" }}>7 days after payment</span>
          </div>
          {escrow.sellerContact && (
            <div className="pay-detail">
              <span className="pay-detail-k">Seller contact</span>
              <span className="pay-detail-v" style={{ fontSize: 11, color: "#5b8ff9", fontWeight: 600 }}>{escrow.sellerContact}</span>
            </div>
          )}
          <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px dashed var(--stroke)" }}>
            <div className="pay-detail">
              <span className="pay-detail-k">Escrow amount</span>
              <span className="pay-detail-v" style={{ color: "#5b8ff9" }}>{escrow.amount} USDC</span>
            </div>
            <div className="pay-detail" style={{ marginTop: 6 }}>
              <span className="pay-detail-k" style={{ color: "var(--ink-3)" }}>Service fee ({FEE_PERCENT}%)</span>
              <span className="pay-detail-v" style={{ color: "var(--ink-3)", fontSize: 11 }}>+{feeAmount} USDC</span>
            </div>
            <div className="pay-detail" style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--stroke)" }}>
              <span className="pay-detail-k" style={{ fontWeight: 700, color: "var(--ink-1)" }}>Total you pay</span>
              <span className="pay-detail-v" style={{ fontWeight: 800, color: "var(--ink-1)" }}>{totalPays} USDC</span>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div style={{ background: "rgba(91,143,249,.06)", border: "1px solid rgba(91,143,249,.2)", borderRadius: "var(--r-sm)", padding: "12px 14px", margin: "0 0 16px" }}>
          <p style={{ fontSize: 11, color: "#5b8ff9", fontWeight: 700, marginBottom: 8 }}>How Escrow Works</p>
          {["Your payment is held securely — not sent to seller yet", "Seller delivers your order", "You confirm receipt to release funds", "If there's a problem, raise a dispute within 7 days"].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: i < 3 ? 6 : 0 }}>
              <span style={{ fontSize: 10, color: "#5b8ff9", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
              <span style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>

        <div className="pay-actions">
          {!mounted ? null : !isConnected ? (
            <button className="pay-connect-btn" onClick={() => connect({ connector: injected() })}>Connect Wallet to Pay</button>
          ) : !isOnArc ? (
            <>
              <div className="pay-warn-box" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><path d="M8 2L1.5 13.5h13L8 2z" stroke="var(--warning)" strokeWidth="1.3" strokeLinejoin="round" /><path d="M8 6v3M8 11v.5" stroke="var(--warning)" strokeWidth="1.3" strokeLinecap="round" /></svg>
                Switch to Arc Testnet to continue.
              </div>
              <button className="pay-switch-btn" onClick={() => switchChain({ chainId: arcTestnet.id })}>Switch to Arc Testnet</button>
            </>
          ) : isBusy ? (
            <div className="pay-spin-zone">
              <div className="pay-spinner" />
              <p className="pay-spin-text">{statusMsg()}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: txHash ? "var(--c)" : "var(--stroke2)" }} />
                  <span style={{ fontSize: 10, color: txHash ? "var(--c)" : "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>Payment</span>
                </div>
                <div style={{ width: 20, height: 1, background: "var(--stroke2)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: feeTxHash ? "var(--c)" : "var(--stroke2)" }} />
                  <span style={{ fontSize: 10, color: feeTxHash ? "var(--c)" : "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>Fee</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <button className="pay-connect-btn" onClick={handlePay} disabled={!hasEnough} style={{ background: "linear-gradient(135deg, #3b5bdb, #5b8ff9)", ...(!hasEnough ? { opacity: .3, cursor: "not-allowed" } : {}) }}>
                Pay {totalPays} USDC into Escrow
              </button>
              <p style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "center", marginTop: 8, fontFamily: "IBM Plex Mono, monospace" }}>
                2 confirmations — {escrow.amount} USDC escrow + {feeAmount} USDC fee
              </p>
              {balance && (
                <p className={`pay-bal${!hasEnough ? " low" : ""}`}>
                  Balance: <span style={{ color: "var(--ink-2)" }}>{bal.toFixed(4)} USDC</span>
                  {!hasEnough && <> — <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="pay-bal-link">get USDC</a></>}
                </p>
              )}
              {error && <div className="pay-err-box" style={{ marginTop: 10 }}>{error}</div>}
            </>
          )}
        </div>

        {mounted && isConnected && address && (
          <div className="pay-wallet-row">
            <span className="pay-wallet-addr">{address.slice(0, 6)}...{address.slice(-4)}</span>
            <button className="pay-disc-btn" onClick={() => disconnect()}>Disconnect</button>
          </div>
        )}
      </div>
      <p className="pay-powered">Powered by Arc Network & Circle</p>
    </div>
  );
}
