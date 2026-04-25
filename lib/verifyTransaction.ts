// lib/verifyTransaction.ts
// Server-side utility to verify a payment transaction on Arc Testnet.
// Called from the PATCH /api/links/[linkId] route.

import { arcPublicClient } from "./arcClient";
import { parseEther, formatEther, type Hex } from "viem";

export interface VerifyTransactionResult {
  success: boolean;
  error?: string;
  sentAmount?: string;   // USDC amount sent
  sender?: string;       // Payer's wallet address
  blockNumber?: bigint;
}

export async function verifyTransaction(
  txHash: string,
  expectedRecipient: string,
  requiredAmount: string // Human-readable USDC e.g. "10.50"
): Promise<VerifyTransactionResult> {
  try {
    // Fetch the transaction from Arc blockchain
    const tx = await arcPublicClient.getTransaction({
      hash: txHash as Hex,
    });

    if (!tx) {
      return {
        success: false,
        error: "Transaction not found on Arc Testnet.",
      };
    }

    // Check it was mined
    if (!tx.blockNumber) {
      return {
        success: false,
        error: "Transaction is still pending. Please wait for confirmation.",
      };
    }

    // Check recipient matches (case-insensitive)
    const actualTo = tx.to?.toLowerCase();
    const expectedTo = expectedRecipient.toLowerCase();

    if (actualTo !== expectedTo) {
      return {
        success: false,
        error: `Payment was sent to wrong address.\nExpected: ${expectedTo}\nReceived: ${actualTo}`,
      };
    }

    // Check amount is sufficient
    // On Arc, USDC is native with 18 decimals (like ETH)
    const requiredWei = parseEther(requiredAmount);
    const sentWei = tx.value;

    if (sentWei < requiredWei) {
      const sentUsdc = parseFloat(formatEther(sentWei)).toFixed(6);
      return {
        success: false,
        error: `Insufficient payment. Required ${requiredAmount} USDC, received ${sentUsdc} USDC.`,
      };
    }

    return {
      success: true,
      sentAmount: formatEther(sentWei),
      sender: tx.from.toLowerCase(),
      blockNumber: tx.blockNumber,
    };
  } catch (err: any) {
    // Handle network errors, RPC issues, etc.
    const message = err?.message ?? "Unknown error";

    if (message.includes("not found") || message.includes("could not be found")) {
      return {
        success: false,
        error: "Transaction not found. Check the hash and try again.",
      };
    }

    console.error("[verifyTransaction] Error:", message);
    return {
      success: false,
      error: "Could not verify transaction. The Arc RPC may be temporarily unavailable.",
    };
  }
}
