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
// Uses a custom provider wrapper that bumps gas prices to avoid
// "maxFeePerGas below baseFee" errors on testnets
export async function createBrowserAdapter() {
  const { createViemAdapterFromProvider } = await import("@circle-fin/adapter-viem-v2");

  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet found. Please install MetaMask.");
  }

  // Wrap the provider to intercept eth_sendTransaction and bump gas
  const wrappedProvider = {
    request: async (args: { method: string; params?: any[] }) => {
      if (args.method === "eth_sendTransaction" && args.params?.[0]) {
        const tx = { ...args.params[0] };

        // Get current block base fee and set maxFeePerGas 2x above it
        try {
          const block = await (window.ethereum as any).request({
            method: "eth_getBlockByNumber",
            params: ["latest", false],
          });

          if (block?.baseFeePerGas) {
            const baseFee = BigInt(block.baseFeePerGas);
            const safeMax = (baseFee * BigInt(3)).toString(16); // 3x baseFee
            const safePriority = BigInt("1500000000").toString(16); // 1.5 gwei tip

            tx.maxFeePerGas = `0x${safeMax}`;
            tx.maxPriorityFeePerGas = `0x${safePriority}`;

            // Remove legacy gasPrice if present
            delete tx.gasPrice;
          }
        } catch {
          // If we can't get the block, use a safe fallback
          tx.maxFeePerGas = "0x77359400"; // 2 gwei
          tx.maxPriorityFeePerGas = "0x59682F00"; // 1.5 gwei
          delete tx.gasPrice;
        }

        return (window.ethereum as any).request({
          method: "eth_sendTransaction",
          params: [tx],
        });
      }

      // All other methods pass through normally
      return (window.ethereum as any).request(args);
    },
  };

  return createViemAdapterFromProvider({
    provider: wrappedProvider as any,
  });
}