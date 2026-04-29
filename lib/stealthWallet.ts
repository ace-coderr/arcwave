// lib/stealthWallet.ts
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http, formatEther } from "viem";
import { arcTestnet } from "./arcChain";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

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

// ── Forward funds using a server-funded gas approach ─────────────────────────
// Problem: stealth wallet only has the payment amount — no gas.
// Solution: server sends a tiny gas amount to the stealth wallet first,
// then the stealth wallet forwards everything minus gas to recipient.
// REQUIRES: FORWARDER_PRIVATE_KEY env var (a funded server wallet for gas)
export async function forwardFunds(
  encryptedPrivateKey: string,
  recipientAddress: string,
  paymentAmount: string // human-readable amount e.g. "10"
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const forwarderKey = process.env.FORWARDER_PRIVATE_KEY;

    if (!forwarderKey) {
      // Fallback: no forwarder key configured
      // Just record it — manual recovery needed
      return {
        success: false,
        error: "FORWARDER_PRIVATE_KEY not configured. Funds safe in stealth wallet.",
      };
    }

    const privateKey = decryptPrivateKey(encryptedPrivateKey);
    const stealthAccount = privateKeyToAccount(privateKey as `0x${string}`);
    const forwarderAccount = privateKeyToAccount(forwarderKey as `0x${string}`);

    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http("https://rpc.testnet.arc.network"),
    });

    const forwarderClient = createWalletClient({
      account: forwarderAccount,
      chain: arcTestnet,
      transport: http("https://rpc.testnet.arc.network"),
    });

    const stealthClient = createWalletClient({
      account: stealthAccount,
      chain: arcTestnet,
      transport: http("https://rpc.testnet.arc.network"),
    });

    // Step 1: Check stealth wallet balance
    const stealthBalance = await publicClient.getBalance({
      address: stealthAccount.address,
    });

    if (stealthBalance === BigInt(0)) {
      return { success: false, error: "Stealth wallet balance is 0 — payment not yet confirmed." };
    }

    // Step 2: Estimate gas needed for the stealth → recipient transfer
    const gasPrice = await publicClient.getGasPrice();
    const gasLimit = BigInt(21000);
    const gasCost = gasPrice * gasLimit;

    // Step 3: Fund stealth wallet with gas if it doesn't have enough
    // We send 2x gas cost to be safe
    const gasFunding = gasCost * BigInt(2);

    console.log(`[forward] Stealth balance: ${formatEther(stealthBalance)} USDC`);
    console.log(`[forward] Gas cost needed: ${formatEther(gasCost)} USDC`);
    console.log(`[forward] Funding stealth wallet with: ${formatEther(gasFunding)} USDC`);

    // Send gas from forwarder to stealth wallet
    const fundTxHash = await forwarderClient.sendTransaction({
      to: stealthAccount.address,
      value: gasFunding,
    });

    console.log(`[forward] Gas funding tx: ${fundTxHash}`);

    // Wait for funding tx to confirm
    await publicClient.waitForTransactionReceipt({ hash: fundTxHash });
    console.log(`[forward] Gas funding confirmed`);

    // Step 4: Get updated balance after funding
    const newBalance = await publicClient.getBalance({
      address: stealthAccount.address,
    });

    // Step 5: Forward all funds minus gas from stealth → recipient
    const amountToForward = newBalance - gasCost;

    if (amountToForward <= BigInt(0)) {
      return { success: false, error: "Not enough balance to forward after gas." };
    }

    console.log(`[forward] Forwarding ${formatEther(amountToForward)} USDC to ${recipientAddress}`);

    const forwardTxHash = await stealthClient.sendTransaction({
      to: recipientAddress as `0x${string}`,
      value: amountToForward,
    });

    console.log(`[forward] Forward tx: ${forwardTxHash}`);

    // Wait for forward confirmation
    await publicClient.waitForTransactionReceipt({ hash: forwardTxHash });
    console.log(`[forward] Forward confirmed!`);

    return { success: true, txHash: forwardTxHash };
  } catch (err: any) {
    console.error("[forwardFunds] Error:", err);
    return { success: false, error: err.message ?? "Forwarding failed" };
  }
}
