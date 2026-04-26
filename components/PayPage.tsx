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
import { formatUSDC } from "@/lib/utils";

interface PaymentLink {
  id: string;
  title: string;
  description?: string;
  amount: string;
  recipientAddress: string;
  status: string;
  txHash?: string;
}

// Mask wallet address for privacy — never show full address on pay page
// Shows only first 4 and last 4 chars with heavy masking in between
function maskAddress(address: string): string {
  if (!address || address.length < 10) return "••••••••";
  return `${address.slice(0, 6)}••••••••••••${address.slice(-4)}`;
}

export function PayPage({ link }: { link: PaymentLink }) {
  const [mounted, setMounted] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState("");
  const [paySuccess, setPaySuccess] = useState(link.status === "COMPLETED");
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const isOnArc = chainId === arcTestnet.id;

  const { data: balance } = useBalance({ address, chainId: arcTestnet.id });
  const { sendTransaction, isPending } = useSendTransaction();
  const { isLoading: isWaiting, isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: arcTestnet.id,
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (txConfirmed && txHash && address && !paySuccess) {
      markPaid(txHash, address);
    }
  }, [txConfirmed]);

  const markPaid = async (hash: string, payer: string) => {
    setIsMarkingPaid(true);
    setError("");
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: hash, paidBy: payer }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not record payment.");
        return;
      }
      setPaySuccess(true);
    } catch (e: any) {
      if (txConfirmed) setPaySuccess(true);
      else setError("Network error. Transaction was sent — save your tx hash.");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handlePay = () => {
    setError("");
    sendTransaction(
      {
        to: link.recipientAddress as `0x${string}`,
        value: parseEther(link.amount),
        chainId: arcTestnet.id,
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          if (address) markPaid(hash, address);
        },
        onError: (err: Error) => {
          if (err.message?.includes("rejected") || err.message?.includes("denied")) {
            setError("Transaction was rejected in MetaMask.");
          } else if (err.message?.includes("insufficient")) {
            setError("Insufficient USDC balance.");
          } else {
            setError("Transaction failed. Please try again.");
          }
        },
      }
    );
  };

  const bal = balance ? parseFloat(formatEther(balance.value)) : 0;
  const hasEnough = bal >= parseFloat(link.amount);

  // ── Already used (one-time link completed) ────────────────────────────────
  if (link.status === "COMPLETED" && !paySuccess) {
    return (
      <div className="pay-page">
        <div className="pay-card">
          <div className="pay-card-top-line" style={{ background: "linear-gradient(90deg,#ef4444,#f59e0b)" }} />
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <h2 className="pay-success-title" style={{ color: "#f87171" }}>Link Already Used</h2>
            <p className="pay-success-desc">
              This payment link has already been paid. Each link can only be used once.
            </p>
            <p style={{ fontSize: 12, color: "#4a4f6a", marginTop: 8 }}>
              Ask the creator to generate a new link.
            </p>
          </div>
        </div>
        <p className="pay-powered">Powered by Arc Network & Circle</p>
      </div>
    );
  }

  // ── Cancelled ──────────────────────────────────────────────────────────────
  if (link.status === "EXPIRED") {
    return (
      <div className="pay-page">
        <div className="pay-card">
          <div className="pay-card-top-line" style={{ background: "linear-gradient(90deg,#ef4444,#f59e0b)" }} />
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>❌</div>
            <h2 className="pay-success-title" style={{ color: "#f87171" }}>Link Cancelled</h2>
            <p className="pay-success-desc">
              This payment link has been cancelled by the creator.
            </p>
          </div>
        </div>
        <p className="pay-powered">Powered by Arc Network & Circle</p>
      </div>
    );
  }

  // ── Payment success ────────────────────────────────────────────────────────
  if (paySuccess) {
    return (
      <div className="pay-page">
        <div className="pay-card">
          <div className="pay-card-top-line" style={{ background: "linear-gradient(90deg,#10b981,#3b82f6)" }} />
          <div className="pay-success-icon">
            <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
              <path d="M5 12l4.5 4.5L19 7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="pay-success-title">Payment Complete!</h2>
          <p className="pay-success-desc">
            <strong style={{ color: "#f0f2ff" }}>{formatUSDC(link.amount)} USDC</strong> successfully sent
          </p>
          <p style={{ fontSize: 11, color: "#4a4f6a", textAlign: "center", marginBottom: 12 }}>
            This link is now closed — it can only be used once.
          </p>
          {(txHash || link.txHash) && (
            <a
              href={`https://testnet.arcscan.app/tx/${txHash ?? link.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pay-success-txlink"
            >
              View on ArcScan ↗
            </a>
          )}
        </div>
        <p className="pay-powered">Powered by Arc Network & Circle</p>
      </div>
    );
  }

  return (
    <div className="pay-page">
      {/* Header */}
      <div className="pay-header">
        <div className="pay-header-logo">
          <div className="pay-header-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
              <path d="M3 17 C6 10, 10 6, 12 12 C14 18, 18 14, 21 7"
                stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="pay-header-logo-text">Arc<span>Wave</span></span>
        </div>
        <p className="pay-header-label">PAYMENT REQUEST</p>
      </div>

      <div className="pay-card">
        <div className="pay-card-top-line"/>

        {/* Amount */}
        <div className="pay-amount-section">
          <div>
            <span className="pay-amount-value">{formatUSDC(link.amount)}</span>
            <span className="pay-amount-unit">USDC</span>
          </div>
          <p className="pay-amount-title">{link.title}</p>
          {link.description && <p className="pay-amount-desc">{link.description}</p>}
        </div>

        {/* Details — address is masked for privacy */}
        <div className="pay-details">
          <div className="pay-detail-row">
            <span className="pay-detail-label">Recipient</span>
            {/* Address is masked — payer cannot track the recipient on ArcScan */}
            <span className="pay-detail-value mono" style={{ letterSpacing: "0.05em" }}>
              {maskAddress(link.recipientAddress)}
            </span>
          </div>
          <div className="pay-detail-row">
            <span className="pay-detail-label">Network</span>
            <span className="pay-detail-value">
              <span className="pay-network-dot"/> Arc Testnet
            </span>
          </div>
          <div className="pay-detail-row">
            <span className="pay-detail-label">Token</span>
            <span className="pay-detail-value mono">USDC (native)</span>
          </div>
          <div className="pay-detail-row">
            <span className="pay-detail-label">Link type</span>
            <span className="pay-detail-value" style={{ color: "#f59e0b", fontSize: 11 }}>
              One-time use
            </span>
          </div>
        </div>

        {/* Action area */}
        {!mounted ? null : !isConnected ? (
          <button className="pay-btn-primary" onClick={() => connect({ connector: injected() })}>
            Connect Wallet to Pay
          </button>
        ) : !isOnArc ? (
          <>
            <div className="pay-warning-box">⚠️ Switch to Arc Testnet to continue.</div>
            <button className="pay-btn-warning" onClick={() => switchChain({ chainId: arcTestnet.id })}>
              Switch to Arc Testnet
            </button>
          </>
        ) : isPending || isWaiting || isMarkingPaid ? (
          <div className="pay-confirming">
            <div className="pay-confirming-spinner"/>
            <p className="pay-confirming-text">
              {isPending
                ? "Confirm in MetaMask..."
                : isWaiting
                ? "Waiting for block confirmation..."
                : "Recording payment..."}
            </p>
            {txHash && (
              <a
                href={`https://testnet.arcscan.app/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pay-success-txlink"
                style={{ marginTop: 8 }}
              >
                Track on ArcScan ↗
              </a>
            )}
          </div>
        ) : (
          <>
            <button
              className="pay-btn-primary"
              onClick={handlePay}
              disabled={!hasEnough}
            >
              Pay {formatUSDC(link.amount)} USDC
            </button>
            {balance && (
              <p className={`pay-balance-note${!hasEnough ? " insufficient" : ""}`}>
                Your balance:{" "}
                <span className="pay-balance-amount">{bal.toFixed(4)} USDC</span>
                {!hasEnough && (
                  <>
                    {" — "}
                    <a
                      href="https://faucet.circle.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pay-balance-faucet"
                    >
                      get more from faucet
                    </a>
                  </>
                )}
              </p>
            )}
          </>
        )}

        {error && <div className="pay-error-box">{error}</div>}

        {mounted && isConnected && address && (
          <div className="pay-wallet-footer">
            <span className="pay-wallet-address">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <button className="pay-disconnect-btn" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      <p className="pay-powered">Powered by Arc Network & Circle</p>
    </div>
  );
}
