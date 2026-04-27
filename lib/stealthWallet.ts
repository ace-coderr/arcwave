// lib/stealthWallet.ts
// Generates fresh temporary wallets for each payment link.
// The payer sends to the stealth address — funds are then
// auto-forwarded to the real recipient, hiding their identity.

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { arcTestnet } from "./arcChain";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// ── Encryption helpers ────────────────────────────────────────────────────────
// We encrypt the private key before storing it in the database.
// The encryption key is derived from STEALTH_SECRET env variable.

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const secret = process.env.STEALTH_SECRET;
  if (!secret) throw new Error("STEALTH_SECRET environment variable is not set.");
  return scryptSync(secret, "arcwave-salt", 32);
}

export function encryptPrivateKey(privateKey: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // Store as: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptPrivateKey(encryptedData: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ── Generate a fresh stealth wallet ──────────────────────────────────────────
export function generateStealthWallet(): {
  address: string;
  encryptedPrivateKey: string;
} {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  return {
    address: account.address.toLowerCase(),
    encryptedPrivateKey: encryptPrivateKey(privateKey),
  };
}

// ── Forward funds from stealth wallet to real recipient ───────────────────────
// Called after a payment is confirmed on-chain.
// Sends all USDC minus gas from the stealth wallet to the real recipient.
export async function forwardFunds(
  encryptedPrivateKey: string,
  recipientAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const privateKey = decryptPrivateKey(encryptedPrivateKey);
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http("https://rpc.testnet.arc.network"),
    });

    const walletClient = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http("https://rpc.testnet.arc.network"),
    });

    // Check balance of stealth wallet
    const balance = await publicClient.getBalance({ address: account.address });

    if (balance === 0n) {
      return { success: false, error: "Stealth wallet has no balance to forward." };
    }

    // Reserve gas for the forwarding transaction
    // On Arc, USDC is native — gas is paid in USDC
    // Estimate: ~21000 gas * 22 Gwei = ~0.000462 USDC
    const gasPrice = await publicClient.getGasPrice();
    const gasLimit = 21000n;
    const gasCost = gasPrice * gasLimit;

    // Make sure there's enough to cover gas
    if (balance <= gasCost) {
      return { success: false, error: "Insufficient balance to cover gas for forwarding." };
    }

    const amountToForward = balance - gasCost;

    console.log(`[forwardFunds] Forwarding ${formatEther(amountToForward)} USDC from ${account.address} to ${recipientAddress}`);

    // Send all remaining USDC to the real recipient
    const txHash = await walletClient.sendTransaction({
      to: recipientAddress as `0x${string}`,
      value: amountToForward,
    });

    console.log(`[forwardFunds] Forwarding tx: ${txHash}`);

    return { success: true, txHash };
  } catch (err: any) {
    console.error("[forwardFunds] Error:", err);
    return { success: false, error: err.message ?? "Forwarding failed" };
  }
}
