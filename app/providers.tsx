"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { arcTestnet } from "@/lib/arcChain";

const queryClient = new QueryClient();

export const wagmiConfig = createConfig({
    chains: [arcTestnet],
    transports: {
        [arcTestnet.id]: http("https://rpc.testnet.arc.network"),
    },
});

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
            config={{
                loginMethods: ["email", "google", "apple", "passkey"],
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: "users-without-wallets",
                    },
                    showWalletUIs: true,
                },
                defaultChain: arcTestnet,
                supportedChains: [arcTestnet],
                appearance: {
                    theme: "dark",
                    accentColor: "#00E5A0",
                    showWalletLoginFirst: false,
                },
            }}
        >
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
                    {children}
                </WagmiProvider>
            </QueryClientProvider>
        </PrivyProvider>
    );
}