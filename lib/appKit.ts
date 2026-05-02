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

  // Wrap provider to fix gas pricing on testnets
  // Rule: maxFeePerGas = baseFee * multiplier + maxPriorityFeePerGas
  //       maxFeePerGas must ALWAYS be >= maxPriorityFeePerGas
  const wrappedProvider = {
    request: async (args: { method: string; params?: any[] }) => {
      if (args.method === "eth_sendTransaction" && args.params?.[0]) {
        const tx = { ...args.params[0] };

        try {
          const block = await (window.ethereum as any).request({
            method: "eth_getBlockByNumber",
            params: ["latest", false],
          });

          if (block?.baseFeePerGas) {
            const baseFee = BigInt(block.baseFeePerGas);
            const priority = BigInt("1500000000"); // 1.5 gwei tip
            // maxFee = (baseFee * 3) + priority — always > priority
            const maxFee = baseFee * BigInt(3) + priority;

            tx.maxFeePerGas = `0x${maxFee.toString(16)}`;
            tx.maxPriorityFeePerGas = `0x${priority.toString(16)}`;
            delete tx.gasPrice;
          } else {
            // No EIP-1559 support — use legacy gas price
            const priority = BigInt("1500000000");
            const maxFee = BigInt("3000000000") + priority; // 3 gwei + tip
            tx.maxFeePerGas = `0x${maxFee.toString(16)}`;
            tx.maxPriorityFeePerGas = `0x${priority.toString(16)}`;
            delete tx.gasPrice;
          }
        } catch {
          // Fallback — safe values where maxFee > priority
          const priority = BigInt("1500000000");
          const maxFee = BigInt("5000000000") + priority; // 5 gwei + tip
          tx.maxFeePerGas = `0x${maxFee.toString(16)}`;
          tx.maxPriorityFeePerGas = `0x${priority.toString(16)}`;
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