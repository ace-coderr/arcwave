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

function maskAddress(address: string): string {
  if (!address || address.length < 10) return "••••••••";
  return `${address.slice(0, 6)}••••••••••••${address.slice(-4)}`;
}

// Shared logo component — uses real logo file
function Logo() {
  return (
    <div className="pay-logo">
      <img
        src="/conduit-logo-white.png"
        alt="Conduit"
        style={{ height: 28, width: "auto", objectFit: "contain" }}
      />
    </div>
  );
}

type PayMode = "arc" | "unified";
type UnifiedStep = "idle" | "depositing" | "spending" | "recording" | "done" | "failed";

export function PayPage({ link }: { link: PaymentLink }) {
  const [mounted, setMounted] = useState(false);
  const [payMode, setPayMode] = useState<PayMode>("arc");
  const [selectedChain, setSelectedChain] = useState<SourceChainId>("Base_Sepolia");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState("");
  const [paySuccess, setPaySuccess] = useState(link.status === "COMPLETED");
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

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
    : link.recipientAddress
    ? maskAddress(link.recipientAddress)
    : "••••••••••••••••••";

  const { data: balance } = useBalance({ address, chainId: arcTestnet.id });
  const { sendTransaction, isPending } = useSendTransaction();
  const { isLoading: isWaiting, isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: arcTestnet.id,
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (txConfirmed && txHash && address && !paySuccess) {
      markPaid(txHash, address, "arc");
    }
  }, [txConfirmed]);

  const markPaid = async (hash: string, payer: string, type: "arc" | "unified" = "arc") => {
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
      if (data.requiresForward) {
        fetch("/api/forward", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkId: link.id }),
        }).catch(console.error);
      }
    } catch (e: any) {
      if (txConfirmed) setPaySuccess(true);
      else setError("Network error. Transaction was sent — save tx hash: " + hash);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const extractHash = (result: any): string => {
    if (!result) return "";
    return result.txHash ?? result.transactionHash ?? result.hash
      ?? result.receipt?.transactionHash ?? result.receipt?.txHash ?? "";
  };

  const handleArcPay = () => {
    if (!paymentTarget) { setError("Payment target not available. Please refresh."); return; }
    setError("");
    sendTransaction(
      { to: paymentTarget, value: parseEther(link.amount), chainId: arcTestnet.id },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          if (address) markPaid(hash, address, "arc");
        },
        onError: (err: Error) => {
          if (err.message?.includes("rejected") || err.message?.includes("denied")) {
            setError("Transaction rejected in MetaMask.");
          } else if (err.message?.includes("insufficient")) {
            setError("Insufficient USDC balance.");
          } else {
            setError("Transaction failed. Please try again.");
          }
        },
      }
    );
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
          await (window.ethereum as any).request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) throw new Error(`Please add ${chainInfo?.name} network to MetaMask first.`);
          throw switchErr;
        }
      }
      const kit = getAppKit();
      const adapter = await createBrowserAdapter();
      const recipientAddr = link.recipientAddress || link.stealthAddress;
      if (!recipientAddr) throw new Error("Recipient address not available.");

      const depositResult = await kit.unifiedBalance.deposit({
        from: { adapter, chain: selectedChain as any },
        amount: link.amount, token: "USDC",
      });
      setUnifiedTxHash(extractHash(depositResult));
      setUnifiedStep("spending");

      const spendResult = await kit.unifiedBalance.spend({
        from: { adapter }, amount: link.amount,
        to: { adapter, chain: "Arc_Testnet", recipientAddress: recipientAddr },
      });
      setUnifiedStep("recording");

      const finalHash = extractHash(spendResult) || extractHash(depositResult) || `0x_unified_${Date.now()}`;
      if (address) await markPaid(finalHash, address, "unified");
      setUnifiedStep("done");
    } catch (err: any) {
      setUnifiedError(err.message ?? "Cross-chain payment failed.");
      setUnifiedStep("failed");
    }
  };

  const bal = balance ? parseFloat(formatEther(balance.value)) : 0;
  const hasEnough = bal >= parseFloat(link.amount);
  const chainInfo = SOURCE_CHAINS.find(c => c.id === selectedChain);

  if (link.status === "COMPLETED" && !paySuccess) {
    return (
      <div className="pay-page">
        <Logo/><p className="pay-tagline">PAYMENT REQUEST</p>
        <div className="pay-card"><div className="pay-card-bar"/>
          <div className="pay-actions" style={{ textAlign: "center", padding: "36px 28px" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
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
        <Logo/><p className="pay-tagline">PAYMENT REQUEST</p>
        <div className="pay-card"><div className="pay-card-bar"/>
          <div className="pay-actions" style={{ textAlign: "center", padding: "36px 28px" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>❌</div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "var(--danger)", marginBottom: 8 }}>Link Cancelled</p>
            <p style={{ fontSize: 13, color: "var(--ink-2)" }}>This link has been cancelled by the creator.</p>
          </div>
        </div>
        <p className="pay-powered">Powered by Arc Network & Circle</p>
      </div>
    );
  }

  if (paySuccess) {
    return (
      <div className="pay-page">
        <Logo/><p className="pay-tagline">PAYMENT REQUEST</p>
        <div className="pay-card"><div className="pay-card-bar"/>
          <div className="pay-actions" style={{ textAlign: "center" }}>
            <div className="pay-success-icon">
              <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                <path d="M5 12l4.5 4.5L19 7" stroke="var(--c)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="pay-success-title">Payment Complete!</p>
            <p className="pay-success-desc">
              <strong style={{ color: "var(--ink-1)" }}>{formatUSDC(link.amount)} USDC</strong> successfully sent
              {payMode === "unified" && chainInfo && <span style={{ color: "var(--ink-3)" }}> via {chainInfo.name}</span>}
            </p>
            <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 14 }}>This link is now closed — one-time use only.</p>
            {(txHash || unifiedTxHash || link.txHash) && (
              <a href={`https://testnet.arcscan.app/tx/${txHash ?? unifiedTxHash ?? link.txHash}`} target="_blank" rel="noopener noreferrer" className="pay-tx-link">
                View on ArcScan ↗
              </a>
            )}
          </div>
        </div>
        <p className="pay-powered">Powered by Arc Network & Circle</p>
      </div>
    );
  }

  return (
    <div className="pay-page">
      <Logo/>
      <p className="pay-tagline">PAYMENT REQUEST</p>

      <div className="pay-card">
        <div className="pay-card-bar"/>

        <div className="pay-amount-zone">
          <div>
            <span className="pay-amount">{formatUSDC(link.amount)}</span>
            <span className="pay-currency">USDC</span>
          </div>
          <p className="pay-link-title">{link.title}</p>
          {link.description && <p className="pay-link-desc">{link.description}</p>}
        </div>

        <div className="pay-details">
          <div className="pay-detail"><span className="pay-detail-k">Pay to</span><span className="pay-detail-v">{displayAddress}</span></div>
          <div className="pay-detail"><span className="pay-detail-k">Network</span><span className="pay-detail-v"><span className="pay-net-dot pulse-dot"/>Arc Testnet</span></div>
          <div className="pay-detail"><span className="pay-detail-k">Token</span><span className="pay-detail-v">USDC (native)</span></div>
          <div className="pay-detail">
            <span className="pay-detail-k">Privacy</span>
            <span className="pay-detail-v" style={{ fontSize: 11 }}>
              {isStealthLink ? <span style={{ color: "var(--c)" }}>🔒 Stealth mode</span> : <span style={{ color: "var(--ink-3)" }}>Standard</span>}
            </span>
          </div>
        </div>

        {mounted && isConnected && (
          <div className="pay-tabs">
            <button className={`pay-tab${payMode === "arc" ? " on" : ""}`} onClick={() => setPayMode("arc")}>⚡ Arc Wallet</button>
            <button className={`pay-tab${payMode === "unified" ? " on" : ""}`} onClick={() => setPayMode("unified")}>🌐 Any Chain</button>
          </div>
        )}

        {payMode === "arc" && (
          <div className="pay-actions">
            <div style={{ background: "rgba(0,229,160,.05)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", padding: "9px 13px", marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "var(--ink-3)" }}>⚡ Direct payment on Arc Network — instant, lowest fees</p>
            </div>
            {!mounted ? null : !isConnected ? (
              <button className="pay-connect-btn" onClick={() => connect({ connector: injected() })}>Connect Wallet to Pay</button>
            ) : !isOnArc ? (
              <>
                <div className="pay-warn-box">⚠️ Switch to Arc Testnet to continue.</div>
                <button className="pay-switch-btn" onClick={() => switchChain({ chainId: arcTestnet.id })}>Switch to Arc Testnet</button>
              </>
            ) : isPending || isWaiting || isMarkingPaid ? (
              <div className="pay-spin-zone">
                <div className="pay-spinner"/>
                <p className="pay-spin-text">{isPending ? "Confirm in MetaMask..." : isWaiting ? "Waiting for confirmation..." : "Recording payment..."}</p>
                {txHash && <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="pay-tx-link" style={{ marginTop: 8 }}>Track on ArcScan ↗</a>}
              </div>
            ) : (
              <>
                <button className="pay-connect-btn" onClick={handleArcPay} disabled={!hasEnough || !paymentTarget} style={(!hasEnough || !paymentTarget) ? { opacity: .3, cursor: "not-allowed" } : {}}>
                  Pay {formatUSDC(link.amount)} USDC
                </button>
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
              <p style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700, marginBottom: 4 }}>🌐 Pay from any chain</p>
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
              <div className="pay-spin-zone"><div className="pay-spinner"/>
                <p className="pay-spin-text">Step 1/2 — Depositing from {chainInfo?.name}...</p>
                <p style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 6 }}>Confirm in MetaMask on {chainInfo?.name}</p>
              </div>
            ) : unifiedStep === "spending" ? (
              <div className="pay-spin-zone"><div className="pay-spinner"/>
                <p className="pay-spin-text">Step 2/2 — Routing to Arc Network...</p>
                <p style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 6 }}>Confirm spend in MetaMask</p>
              </div>
            ) : unifiedStep === "recording" ? (
              <div className="pay-spin-zone"><div className="pay-spinner"/><p className="pay-spin-text">Recording payment...</p></div>
            ) : (
              <>
                <button className="pay-connect-btn" onClick={handleUnifiedPay} style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
                  Pay {formatUSDC(link.amount)} USDC from {chainInfo?.name}
                </button>
                <p style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 8 }}>2 MetaMask confirmations required</p>
              </>
            )}
            {unifiedStep === "failed" && unifiedError && (
              <div className="pay-err-box" style={{ marginTop: 12 }}>{unifiedError}</div>
            )}
          </div>
        )}

        {mounted && isConnected && address && (
          <div className="pay-wallet-row">
            <span className="pay-wallet-addr">{address.slice(0,6)}...{address.slice(-4)}</span>
            <button className="pay-disc-btn" onClick={() => disconnect()}>Disconnect</button>
          </div>
        )}
      </div>
      <p className="pay-powered">Powered by Arc Network & Circle</p>
    </div>
  );
}
