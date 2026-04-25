"use client";
// components/BalanceCard.tsx
// Shows the connected wallet's USDC balance on Arc Testnet

import { useAccount, useBalance } from "wagmi";
import { arcTestnet } from "@/lib/arcChain";
import { formatEther } from "viem";
import { shortenAddress } from "@/lib/utils";

export function BalanceCard() {
  const { address, isConnected } = useAccount();

  // Fetch native balance (USDC is native on Arc)
  const { data: balance, isLoading } = useBalance({
    address: address,
    chainId: arcTestnet.id,
  });

  if (!isConnected) {
    return (
      <div className="arc-card p-5 space-y-3">
        <p className="text-xs text-arc-muted uppercase tracking-widest font-mono">Available Balance</p>
        <p className="text-3xl font-bold font-mono text-arc-muted">—</p>
        <p className="text-xs text-arc-muted">Connect wallet to view balance</p>
      </div>
    );
  }

  const balanceValue = balance
    ? parseFloat(formatEther(balance.value)).toFixed(4)
    : "0.0000";

  return (
    <div className="arc-card p-5 space-y-1 relative overflow-hidden">
      {/* Subtle blue glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-arc-blue/5 rounded-full blur-2xl pointer-events-none" />

      <p className="text-xs text-arc-muted uppercase tracking-widest font-mono">Available Balance</p>

      <div className="flex items-end gap-2 py-1">
        {isLoading ? (
          <div className="h-9 w-32 bg-arc-border/50 rounded animate-pulse" />
        ) : (
          <>
            <span className="text-4xl font-bold font-mono text-arc-text">
              {parseFloat(balanceValue).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-lg text-arc-blue font-mono mb-0.5">USDC</span>
          </>
        )}
      </div>

      {address && (
        <p className="text-xs text-arc-muted font-mono pt-1">
          {shortenAddress(address)}
        </p>
      )}
    </div>
  );
}
