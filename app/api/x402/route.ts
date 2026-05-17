import { NextResponse } from "next/server";
import { arcTestnet } from "@/lib/arcChain";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

export async function GET() {
    return NextResponse.json({
        name: "Conduit x402 Facilitator",
        description: "The first public x402 facilitator on Arc Network. Verify and settle USDC micropayments on Arc Testnet.",
        url: "https://conduit-pay.vercel.app",
        version: "2",
        supportedSchemes: ["exact"],
        supportedNetworks: [
            {
                networkId: `eip155:${arcTestnet.id}`,
                name: arcTestnet.name,
                chainId: arcTestnet.id,
                token: "USDC",
                tokenAddress: USDC_ADDRESS,
                decimals: 6,
                rpcUrl: "https://rpc.testnet.arc.network",
                explorer: "https://testnet.arcscan.app",
            },
        ],
        endpoints: {
            verify: "/api/x402/verify",
            settle: "/api/x402/settle",
        },
        contact: "@conduit_pay",
    });
}