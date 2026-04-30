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

// Ensure private key always has 0x prefix — viem requires it
function formatPrivateKey(key: string): `0x${string}` {
  return (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
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

export async function forwardFunds(
  encryptedPrivateKey: string,
  recipientAddress: string,
  paymentAmount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const forwarderKey = process.env.FORWARDER_PRIVATE_KEY;

    if (!forwarderKey) {
      return {
        success: false,
        error: "FORWARDER_PRIVATE_KEY not configured. Funds safe in stealth wallet.",
      };
    }

    // Decrypt and format stealth private key with 0x prefix
    const rawPrivateKey = decryptPrivateKey(encryptedPrivateKey);
    const stealthPrivateKey = formatPrivateKey(rawPrivateKey);
    const stealthAccount = privateKeyToAccount(stealthPrivateKey);

    // Format forwarder key with 0x prefix
    const forwarderPrivateKey = formatPrivateKey(forwarderKey);
    const forwarderAccount = privateKeyToAccount(forwarderPrivateKey);

    console.log(`[forward] Stealth address: ${stealthAccount.address}`);
    console.log(`[forward] Forwarder address: ${forwarderAccount.address}`);
    console.log(`[forward] Recipient: ${recipientAddress}`);

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

    console.log(`[forward] Stealth balance: ${formatEther(stealthBalance)} USDC`);

    if (stealthBalance === BigInt(0)) {
      return {
        success: false,
        error: "Stealth wallet balance is 0 — payment not yet confirmed.",
      };
    }

    // Step 2: Calculate gas cost
    const gasPrice = await publicClient.getGasPrice();
    const gasLimit = BigInt(21000);
    const gasCost = gasPrice * gasLimit;
    const gasFunding = gasCost * BigInt(3); // send 3x to be safe

    console.log(`[forward] Gas cost: ${formatEther(gasCost)} USDC`);
    console.log(`[forward] Sending gas funding: ${formatEther(gasFunding)} USDC`);

    // Step 3: Fund stealth wallet with gas from forwarder
    const fundTxHash = await forwarderClient.sendTransaction({
      to: stealthAccount.address,
      value: gasFunding,
    });

    console.log(`[forward] Gas funding tx: ${fundTxHash}`);

    // Wait for gas funding to confirm
    await publicClient.waitForTransactionReceipt({ hash: fundTxHash });
    console.log(`[forward] Gas funding confirmed`);

    // Step 4: Get updated balance after gas funding
    const balanceAfterFunding = await publicClient.getBalance({
      address: stealthAccount.address,
    });

    console.log(`[forward] Balance after funding: ${formatEther(balanceAfterFunding)} USDC`);

    // Step 5: Calculate amount to forward (all funds minus one gas cost)
    const amountToForward = balanceAfterFunding - gasCost;

    if (amountToForward <= BigInt(0)) {
      return {
        success: false,
        error: "Not enough balance to forward after gas.",
      };
    }

    console.log(`[forward] Forwarding: ${formatEther(amountToForward)} USDC to ${recipientAddress}`);

    // Step 6: Send all funds from stealth wallet to real recipient
    const forwardTxHash = await stealthClient.sendTransaction({
      to: recipientAddress as `0x${string}`,
      value: amountToForward,
    });

    console.log(`[forward] Forward tx: ${forwardTxHash}`);

    // Wait for forward to confirm
    await publicClient.waitForTransactionReceipt({ hash: forwardTxHash });
    console.log(`[forward] Forward confirmed!`);

    return { success: true, txHash: forwardTxHash };
  } catch (err: any) {
    console.error("[forwardFunds] Error:", err.message);
    return { success: false, error: err.message ?? "Forwarding failed" };
  }
}
