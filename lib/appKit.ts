// lib/appKit.ts
// Circle App Kit setup for Unified Balance cross-chain payments

import { AppKit } from "@circle-fin/app-kit";

// Supported source chains for Unified Balance (testnet)
export const SOURCE_CHAINS = [
  { id: "Base_Sepolia",      name: "Base",      icon: "🔵", color: "#0052ff" },
  { id: "Ethereum_Sepolia",  name: "Ethereum",  icon: "⟠",  color: "#627eea" },
  { id: "Arbitrum_Sepolia",  name: "Arbitrum",  icon: "🔷", color: "#28a0f0" },
  { id: "Polygon_Amoy",      name: "Polygon",   icon: "🟣", color: "#8247e5" },
  { id: "Avalanche_Fuji",    name: "Avalanche", icon: "🔺", color: "#e84142" },
  { id: "OP_Sepolia",        name: "Optimism",  icon: "🔴", color: "#ff0420" },
] as const;

export type SourceChainId = typeof SOURCE_CHAINS[number]["id"];

// Singleton App Kit instance
let _kit: AppKit | null = null;

export function getAppKit(): AppKit {
  if (!_kit) {
    _kit = new AppKit();
  }
  return _kit;
}

// Create viem adapter from browser wallet (MetaMask)
export async function createBrowserAdapter() {
  const { createViemAdapterFromProvider } = await import("@circle-fin/adapter-viem-v2");

  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet found. Please install MetaMask.");
  }

  return createViemAdapterFromProvider({
    provider: window.ethereum as any,
  });
}
