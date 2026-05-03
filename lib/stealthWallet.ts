// lib/stealthWallet.ts
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http, formatEther, parseEther } from "viem";
import { arcTestnet } from "./arcChain";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { FEE_CONFIG, calculateFee } from "./fees";

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

function formatPrivateKey(key: string): `0x${string}` {
  const cleaned = key.trim().replace(/\s/g, "");
  const stripped = cleaned.startsWith("0x") || cleaned.startsWith("0X")
    ? cleaned.slice(2) : cleaned;
  return `0x${stripped}` as `0x${string}`;
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
    if (!forwarderKey) return { success: false, error: "FORWARDER_PRIVATE_KEY not configured." };

    const rawPrivateKey = decryptPrivateKey(encryptedPrivateKey);
    const stealthPrivateKey = formatPrivateKey(rawPrivateKey);
    const stealthAccount = privateKeyToAccount(stealthPrivateKey);

    const forwarderPrivateKey = formatPrivateKey(forwarderKey);
    const forwarderAccount = privateKeyToAccount(forwarderPrivateKey);

    console.log(`[forward] Stealth: ${stealthAccount.address}`);
    console.log(`[forward] Recipient: ${recipientAddress}`);
    console.log(`[forward] Amount: ${paymentAmount} USDC`);

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

    // Check stealth balance
    const stealthBalance = await publicClient.getBalance({ address: stealthAccount.address });
    console.log(`[forward] Stealth balance: ${formatEther(stealthBalance)} USDC`);

    if (stealthBalance === BigInt(0)) {
      return { success: false, error: "Stealth wallet balance is 0 — payment not yet confirmed." };
    }

    // Fund stealth wallet with gas
    const gasPrice = await publicClient.getGasPrice();
    const gasLimit = BigInt(21000);
    const gasFunding = gasPrice * gasLimit * BigInt(5);

    const fundTxHash = await forwarderClient.sendTransaction({
      to: stealthAccount.address,
      value: gasFunding,
    });
    await publicClient.waitForTransactionReceipt({ hash: fundTxHash, timeout: 20_000 });

    // Get updated balance
    const balanceAfterFunding = await publicClient.getBalance({ address: stealthAccount.address });
    const gasCostBuffer = gasPrice * gasLimit * BigInt(3);

    // Calculate fee split
    const { fee, recipientAmount } = calculateFee(paymentAmount);
    const feeWei = parseEther(fee);
    const recipientWei = parseEther(recipientAmount);

    console.log(`[forward] Fee (${FEE_CONFIG.percentage}%): ${fee} USDC → ${FEE_CONFIG.collectorAddress}`);
    console.log(`[forward] Recipient gets: ${recipientAmount} USDC`);

    // Send fee to collector (skip if collector is same as recipient)
    if (
      feeWei > BigInt(0) &&
      FEE_CONFIG.collectorAddress.toLowerCase() !== recipientAddress.toLowerCase()
    ) {
      try {
        const feeTxHash = await stealthClient.sendTransaction({
          to: FEE_CONFIG.collectorAddress as `0x${string}`,
          value: feeWei,
          gas: gasLimit,
          gasPrice,
        });
        await publicClient.waitForTransactionReceipt({ hash: feeTxHash, timeout: 20_000 });
        console.log(`[forward] Fee sent: ${feeTxHash}`);
      } catch (feeErr: any) {
        console.warn(`[forward] Fee transfer failed (continuing): ${feeErr.message}`);
      }
    }

    // Send recipient amount
    const forwardTxHash = await stealthClient.sendTransaction({
      to: recipientAddress as `0x${string}`,
      value: recipientWei,
      gas: gasLimit,
      gasPrice,
    });

    await publicClient.waitForTransactionReceipt({ hash: forwardTxHash, timeout: 20_000 });
    console.log(`[forward] Forwarded to recipient: ${forwardTxHash}`);

    return { success: true, txHash: forwardTxHash };
  } catch (err: any) {
    console.error("[forwardFunds] Error:", err.message);
    return { success: false, error: err.message ?? "Forwarding failed" };
  }
}
