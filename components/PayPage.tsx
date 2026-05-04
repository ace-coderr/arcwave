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
import { SOURCE_CHAINS, type SourceChainId, getAppKit, createBrowserAdapter } from "@/lib/appKit";

const FEE_COLLECTOR = "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c";
const FEE_PERCENT = 0.5;

function calcFee(amount: string) {
  const total = parseFloat(amount);
  const fee = Math.max((total * FEE_PERCENT) / 100, 0.001);
  return {
    fee: fee.toFixed(4),
    recipientAmount: amount,
    totalPays: (total + fee).toFixed(4),
  };
}

interface PaymentLink {
  id: string;
  title: string;
  description?: string;
  amount: string;
  stealthAddress?: string | null;
  recipientAddress?: string;
  status: string;
  txHash?: string;
}

interface FeeInfo {
  fee: string;
  recipientAmount: string;
  feePercent: string;
}

function maskAddress(address: string): string {
  if (!address || address.length < 10) return "••••••••";
  return `${address.slice(0, 6)}••••••••••••${address.slice(-4)}`;
}

// ── SVG Icons ──────────────────────────────────────────────────
const IconLock = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width={size} height={size}>
    <rect x="3" y="7" width="10" height="8" rx="1.5" stroke={color} strokeWidth="1.3"/>
    <path d="M5 7V5a3 3 0 016 0v2" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const IconBolt = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width={size} height={size}>
    <path d="M9 2L4 9h4l-1 5 5-7H8l1-5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
);

const IconGlobe = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width={size} height={size}>
    <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.3"/>
    <path d="M2 8h12M8 2c-2 2-2 8 0 12M8 2c2 2 2 8 0 12" stroke={color} strokeWidth="1.3"/>
  </svg>
);

const IconWarning = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width={size} height={size}>
    <path d="M8 2L1.5 13.5h13L8 2z" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M8 6v3M8 11v.5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const IconX = ({ size = 36, color = "var(--danger)" }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 36 36" fill="none" width={size} height={size}>
    <circle cx="18" cy="18" r="16" stroke={color} strokeWidth="1.5"/>
    <path d="M12 12l12 12M24 12L12 24" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

function Logo() {
  return (
    <div className="pay-logo">
      <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 32, width: "auto", objectFit: "contain" }} />
    </div>
  );
}

type PayMode = "arc" | "unified";
type UnifiedStep = "idle" | "depositing" | "spending" | "recording" | "done" | "failed";
type ArcStep = "idle" | "sending_payment" | "sending_fee" | "recording" | "done" | "failed";

export function PayPage({ link, fee }: { link: PaymentLink; fee?: FeeInfo }) {
  const [mounted, setMounted] = useState(false);
  const [payMode, setPayMode] = useState<PayMode>("arc");
  const [selectedChain, setSelectedChain] = useState<SourceChainId>("Base_Sepolia");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [feeTxHash, setFeeTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState("");
  const [paySuccess, setPaySuccess] = useState(link.status === "COMPLETED");
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [arcStep, setArcStep] = useState<ArcStep>("idle");
  const [unifiedStep, setUnifiedStep] = useState<UnifiedStep>("idle");
  const [unifiedTxHash, setUnifiedTxHash] = useState("");
  const [unifiedError, setUnifiedError] = useState("");

  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const isOnArc = chainId === arcTestnet.id;

  const isStealthLink = !!link.stealthAddress;
  const paymentTarget = (link.stealthAddress || link.recipientAddress) as `0x${string}` | undefined;
  const displayAddress = link.stealthAddress
    ? maskAddress(link.stealthAddress)
    : link.recipientAddress ? maskAddress(link.recipientAddress) : "••••••••••••••••••";

  const { fee: feeAmount, totalPays } = calcFee(link.amount);
  const { data: balance } = useBalance({ address, chainId: arcTestnet.id });

  const { sendTransaction: sendPayment, isPending: isPaymentPending } = useSendTransaction();
  const { isLoading: isPaymentWaiting, isSuccess: paymentConfirmed } = useWaitForTransactionReceipt({ hash: txHash, chainId: arcTestnet.id });
  const { sendTransaction: sendFee, isPending: isFeePending } = useSendTransaction();
  const { isLoading: isFeeWaiting, isSuccess: feeConfirmed } = useWaitForTransactionReceipt({ hash: feeTxHash, chainId: arcTestnet.id });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (paymentConfirmed && txHash && arcStep === "sending_payment") {
      setArcStep("sending_fee");
      sendFee(
        { to: FEE_COLLECTOR as `0x${string}`, value: parseEther(feeAmount), chainId: arcTestnet.id },
        {
          onSuccess: (hash) => { setFeeTxHash(hash); },
          onError: (err: Error) => { console.warn("[fee] Fee tx failed:", err.message); if (address && txHash) recordPayment(txHash, address); },
        }
      );
    }
  }, [paymentConfirmed]);

  useEffect(() => {
    if (feeConfirmed && feeTxHash && arcStep === "sending_fee") {
      setArcStep("recording");
      if (address && txHash) recordPayment(txHash, address);
    }
  }, [feeConfirmed]);

  const recordPayment = async (hash: string, payer: string, type: "arc" | "unified" = "arc") => {
    setIsMarkingPaid(true);
    setError("");
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: hash, paidBy: payer, paymentType: type }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not record payment."); return; }
      setPaySuccess(true);
      setArcStep("done");
      if (data.requiresForward) {
        fetch("/api/forward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkId: link.id }) }).catch(console.error);
      }
    } catch {
      if (paymentConfirmed) { setPaySuccess(true); setArcStep("done"); }
      else setError("Network error. Transaction was sent — save tx hash: " + hash);
    } finally { setIsMarkingPaid(false); }
  };

  const handleArcPay = () => {
    if (!paymentTarget) { setError("Payment target not available."); return; }
    setError("");
    setArcStep("sending_payment");
    sendPayment(
      { to: paymentTarget, value: parseEther(link.amount), chainId: arcTestnet.id },
      {
        onSuccess: (hash) => { setTxHash(hash); },
        onError: (err: Error) => {
          setArcStep("idle");
          if (err.message?.includes("rejected") || err.message?.includes("denied")) setError("Transaction rejected.");
          else if (err.message?.includes("insufficient")) setError("Insufficient USDC balance.");
          else setError("Transaction failed. Please try again.");
        },
      }
    );
  };

  const extractHash = (result: any): string => {
    if (!result) return "";
    return result.txHash ?? result.transactionHash ?? result.hash ?? result.receipt?.transactionHash ?? result.receipt?.txHash ?? "";
  };

  const CHAIN_IDS: Record<string, number> = {
    "Base_Sepolia": 84532, "Ethereum_Sepolia": 11155111,
    "Arbitrum_Sepolia": 421614, "Polygon_Amoy": 80002,
    "Avalanche_Fuji": 43113, "OP_Sepolia": 11155420,
  };

  const handleUnifiedPay = async () => {
    setUnifiedError("");
    setUnifiedStep("depositing");
    try {
      const targetChainId = CHAIN_IDS[selectedChain];
      if (targetChainId && window.ethereum) {
        try {
          await (window.ethereum as any).request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${targetChainId.toString(16)}` }] });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) throw new Error(`Please add ${chainInfo?.name} to MetaMask first.`);
          throw switchErr;
        }
      }
      const kit = getAppKit();
      const adapter = await createBrowserAdapter();
      const recipientAddr = link.recipientAddress || link.stealthAddress;
      if (!recipientAddr) throw new Error("Recipient address not available.");
      const depositResult = await kit.unifiedBalance.deposit({ from: { adapter, chain: selectedChain as any }, amount: link.amount, token: "USDC" });
      setUnifiedTxHash(extractHash(depositResult));
      setUnifiedStep("spending");
      const spendResult = await kit.unifiedBalance.spend({ from: { adapter }, amount: link.amount, to: { adapter, chain: "Arc_Testnet", recipientAddress: recipientAddr } });
      setUnifiedStep("recording");
      const finalHash = extractHash(spendResult) || extractHash(depositResult) || `0x_unified_${Date.now()}`;
      if (address) await recordPayment(finalHash, address, "unified");
      setUnifiedStep("done");
    } catch (err: any) {
      setUnifiedError(err.message ?? "Cross-chain payment failed.");
      setUnifiedStep("failed");
    }
  };

  const bal = balance ? parseFloat(formatEther(balance.value)) : 0;
  const hasEnough = bal >= parseFloat(totalPays);
  const chainInfo = SOURCE_CHAINS.find(c => c.id === selectedChain);
  const isArcBusy = ["sending_payment", "sending_fee", "recording"].includes(arcStep) || isPaymentPending || isPaymentWaiting || isFeePending || isFeeWaiting || isMarkingPaid;

  const arcStatusText = () => {
    if (isPaymentPending) return "Confirm payment in MetaMask...";
    if (isPaymentWaiting) return "Confirming payment...";
    if (arcStep === "sending_fee" && isFeePending) return "Confirm fee in MetaMask...";
    if (arcStep === "sending_fee" && isFeeWaiting) return "Confirming fee...";
    if (isMarkingPaid) return "Recording payment...";
    return "Processing...";
  };

  if (link.status === "COMPLETED" && !paySuccess) {
    return (
      <div className="pay-page">
        <Logo /><p className="pay-tagline">PAYMENT REQUEST</p>
        <div className="pay-card"><div className="pay-card-bar" />
          <div className="pay-actions" style={{ textAlign: "center", padding: "36px 28px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(240,62,95,.1)", border: "1.5px solid rgba(240,62,95,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconLock size={22} color="var(--danger)" />
              </div>
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "var(--danger)", marginBottom: 8 }}>Link Already Used</p>
            <p style={{ fontSize: 13, color: "var(--ink-2)" }}>Each link can only be paid once.</p>
          </div>
        </div>
        <p className="pay-powered">Powered by Arc Network & Circle</p>
      </div>
    );
  }

  if (link.status === "EXPIRED") {
    return (
      <div className="pay-page">
        <Logo /><p className="pay-tagline">PAYMENT REQUEST</p>
        <div className="pay-card"><div className="pay-card-bar" />
          <div className="pay-actions" style={{ textAlign: "center", padding: "36px 28px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <IconX size={52} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "var(--danger)", marginBottom: 8 }}>Link Cancelled</p>
            <p style={{ fontSize: 13, color: "var(--ink-2)" }}>This link has been cancelled.</p>
          </div>
        </div>
        <p className="pay-powered">Powered by Arc Network & Circle</p>
      </div>
    );
  }

  if (paySuccess) {
    return (
      <div className="pay-page">
        <Logo /><p className="pay-tagline">PAYMENT REQUEST</p>
        <div className="pay-card"><div className="pay-card-bar" />
          <div className="pay-actions" style={{ textAlign: "center" }}>
            <div className="pay-success-icon">
              <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                <path d="M5 12l4.5 4.5L19 7" stroke="var(--c)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="pay-success-title">Payment Complete!</p>
            <p className="pay-success-desc">
              <strong style={{ color: "var(--ink-1)" }}>{formatUSDC(link.amount)} USDC</strong> successfully sent
              {payMode === "unified" && chainInfo && <span style={{ color: "var(--ink-3)" }}> via {chainInfo.name}</span>}
            </p>
            <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 14 }}>This link is now closed — one-time use only.</p>
            {(txHash || unifiedTxHash || link.txHash) && (
              <a href={`https://testnet.arcscan.app/tx/${txHash ?? unifiedTxHash ?? link.txHash}`} target="_blank" rel="noopener noreferrer" className="pay-tx-link">View on ArcScan ↗</a>
            )}
          </div>
        </div>
        <p className="pay-powered">Powered by Arc Network & Circle</p>
      </div>
    );
  }

  return (
    <div className="pay-page">
      <Logo />
      <p className="pay-tagline">PAYMENT REQUEST</p>
      <div className="pay-card">
        <div className="pay-card-bar" />

        <div className="pay-amount-zone">
          <div>
            <span className="pay-amount">{formatUSDC(link.amount)}</span>
            <span className="pay-currency">USDC</span>
          </div>
          <p className="pay-link-title">{link.title}</p>
          {link.description && <p className="pay-link-desc">{link.description}</p>}
        </div>

        <div className="pay-details">
          <div className="pay-detail">
            <span className="pay-detail-k">Pay to</span>
            <span className="pay-detail-v">{displayAddress}</span>
          </div>
          <div className="pay-detail">
            <span className="pay-detail-k">Network</span>
            <span className="pay-detail-v"><span className="pay-net-dot pulse-dot" />Arc Testnet</span>
          </div>
          <div className="pay-detail">
            <span className="pay-detail-k">Token</span>
            <span className="pay-detail-v">USDC (native)</span>
          </div>
          <div className="pay-detail">
            <span className="pay-detail-k">Privacy</span>
            <span className="pay-detail-v" style={{ fontSize: 11 }}>
              {isStealthLink
                ? <span style={{ color: "var(--c)", display: "flex", alignItems: "center", gap: 5 }}><IconLock size={11} color="var(--c)" /> Stealth mode</span>
                : <span style={{ color: "var(--ink-3)" }}>Standard</span>}
            </span>
          </div>
          <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px dashed var(--stroke)" }}>
            <div className="pay-detail">
              <span className="pay-detail-k">Recipient gets</span>
              <span className="pay-detail-v" style={{ color: "var(--c)" }}>{link.amount} USDC</span>
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

        {mounted && isConnected && (
          <div className="pay-tabs">
            <button className={`pay-tab${payMode === "arc" ? " on" : ""}`} onClick={() => setPayMode("arc")}>
              <IconBolt size={13} color="currentColor" /> Arc Wallet
            </button>
            <button className={`pay-tab${payMode === "unified" ? " on" : ""}`} onClick={() => setPayMode("unified")}>
              <IconGlobe size={13} color="currentColor" /> Any Chain
            </button>
          </div>
        )}

        {payMode === "arc" && (
          <div className="pay-actions">
            <div style={{ background: "rgba(0,229,160,.05)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", padding: "9px 13px", marginBottom: 16, display: "flex", alignItems: "center", gap: 7 }}>
              <IconBolt size={12} color="var(--c)" />
              <p style={{ fontSize: 11, color: "var(--ink-3)" }}>Direct payment on Arc Network — 2 quick confirmations</p>
            </div>
            {!mounted ? null : !isConnected ? (
              <button className="pay-connect-btn" onClick={() => connect({ connector: injected() })}>Connect Wallet to Pay</button>
            ) : !isOnArc ? (
              <>
                <div className="pay-warn-box" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <IconWarning size={13} color="var(--warning)" /> Switch to Arc Testnet to continue.
                </div>
                <button className="pay-switch-btn" onClick={() => switchChain({ chainId: arcTestnet.id })}>Switch to Arc Testnet</button>
              </>
            ) : isArcBusy ? (
              <div className="pay-spin-zone">
                <div className="pay-spinner" />
                <p className="pay-spin-text">{arcStatusText()}</p>
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
                {txHash && <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="pay-tx-link" style={{ marginTop: 8 }}>Track payment ↗</a>}
              </div>
            ) : (
              <>
                <button className="pay-connect-btn" onClick={handleArcPay} disabled={!hasEnough || !paymentTarget} style={(!hasEnough || !paymentTarget) ? { opacity: .3, cursor: "not-allowed" } : {}}>
                  Pay {totalPays} USDC
                </button>
                <p style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "center", marginTop: 8, fontFamily: "IBM Plex Mono, monospace" }}>
                  2 confirmations — {link.amount} USDC payment + {feeAmount} USDC fee
                </p>
                {balance && (
                  <p className={`pay-bal${!hasEnough ? " low" : ""}`}>
                    Balance: <span style={{ color: "var(--ink-2)" }}>{bal.toFixed(4)} USDC</span>
                    {!hasEnough && <> — <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="pay-bal-link">get USDC</a></>}
                  </p>
                )}
              </>
            )}
            {error && <div className="pay-err-box">{error}</div>}
          </div>
        )}

        {payMode === "unified" && (
          <div className="pay-actions">
            <div style={{ background: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.2)", borderRadius: "var(--r-sm)", padding: "10px 13px", marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <IconGlobe size={13} color="#a78bfa" /> Pay from any chain
              </p>
              <p style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>Use USDC from Base, Ethereum, Arbitrum or other chains. Powered by Circle Unified Balance.</p>
            </div>
            <p style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", letterSpacing: ".1em", marginBottom: 9 }}>SELECT SOURCE CHAIN</p>
            <div className="chain-grid" style={{ marginBottom: 16 }}>
              {SOURCE_CHAINS.map((chain) => (
                <button key={chain.id} onClick={() => setSelectedChain(chain.id)} className={`chain-btn${selectedChain === chain.id ? " on" : ""}`}>
                  <span style={{ fontSize: 18 }}>{chain.icon}</span>
                  <span className="chain-name">{chain.name}</span>
                </button>
              ))}
            </div>
            {!mounted ? null : !isConnected ? (
              <button className="pay-connect-btn" onClick={() => connect({ connector: injected() })}>Connect Wallet to Pay</button>
            ) : unifiedStep === "depositing" ? (
              <div className="pay-spin-zone"><div className="pay-spinner" />
                <p className="pay-spin-text">Step 1/2 — Depositing from {chainInfo?.name}...</p>
                <p style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 6 }}>Confirm in MetaMask</p>
              </div>
            ) : unifiedStep === "spending" ? (
              <div className="pay-spin-zone"><div className="pay-spinner" /><p className="pay-spin-text">Step 2/2 — Routing to Arc Network...</p></div>
            ) : unifiedStep === "recording" ? (
              <div className="pay-spin-zone"><div className="pay-spinner" /><p className="pay-spin-text">Recording payment...</p></div>
            ) : (
              <>
                <button className="pay-connect-btn" onClick={handleUnifiedPay} style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
                  Pay {formatUSDC(link.amount)} USDC from {chainInfo?.name}
                </button>
                <p style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 8 }}>2 MetaMask confirmations required</p>
              </>
            )}
            {unifiedStep === "failed" && unifiedError && <div className="pay-err-box" style={{ marginTop: 12 }}>{unifiedError}</div>}
          </div>
        )}

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
