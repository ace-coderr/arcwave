import { formatEther, parseEther } from "viem";

export function usdcToWei(amount: string): bigint { return parseEther(amount); }
export function weiToUsdc(wei: bigint): string { return formatEther(wei); }

export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatUSDC(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
}

export function getStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case "COMPLETED": return "COMPLETED";
    case "ACTIVE":    return "PENDING";
    case "EXPIRED":   return "EXPIRED";
    default:          return status;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}

export function getPaymentUrl(linkId: string): string {
  if (typeof window !== "undefined") return `${window.location.origin}/pay/${linkId}`;
  return `/pay/${linkId}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}
