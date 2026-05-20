import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "@/lib/arcChain";
import { db } from "@/lib/db";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const FACILITATOR_PRIVATE_KEY = process.env.FORWARDER_PRIVATE_KEY as `0x${string}`;

// BigInt-safe JSON serializer
const safeStringify = (obj: any) =>
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);

const arcPublicClient = createPublicClient({
    chain: arcTestnet,
    transport: http("https://rpc.testnet.arc.network"),
});

const EIP3009_ABI = [
    {
        name: "transferWithAuthorization",
        type: "function",
        inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
            { name: "v", type: "uint8" },
            { name: "r", type: "bytes32" },
            { name: "s", type: "bytes32" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        name: "authorizationState",
        type: "function",
        inputs: [
            { name: "authorizer", type: "address" },
            { name: "nonce", type: "bytes32" },
        ],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
    },
] as const;

// In-memory settlement cache
const settlementCache = new Map<string, { settled: boolean; txHash?: string; timestamp: number }>();
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of settlementCache.entries()) {
        if (now - val.timestamp > 120_000) settlementCache.delete(key);
    }
}, 300_000);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { payload, paymentDetails } = body;

        if (!payload || !paymentDetails) {
            return NextResponse.json({ success: false, error: "Missing payload or paymentDetails" }, { status: 400 });
        }

        let paymentData: any;
        try {
            paymentData = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
        } catch {
            return NextResponse.json({ success: false, error: "Invalid payment payload encoding" }, { status: 400 });
        }

        const { from, to, value, validAfter, validBefore, nonce, v, r, s } = paymentData;

        // Duplicate settlement protection
        const cacheKey = `${from}-${nonce}`;
        const cached = settlementCache.get(cacheKey);
        if (cached?.settled) {
            return NextResponse.json({ success: true, txHash: cached.txHash, duplicate: true });
        }

        // Check nonce not already used on-chain
        const nonceUsed = await arcPublicClient.readContract({
            address: USDC_ADDRESS as `0x${string}`,
            abi: EIP3009_ABI,
            functionName: "authorizationState",
            args: [from as `0x${string}`, nonce as `0x${string}`],
        });

        if (nonceUsed) {
            settlementCache.set(cacheKey, { settled: true, timestamp: Date.now() });
            return NextResponse.json({ success: false, error: "Nonce already used on-chain" }, { status: 400 });
        }

        settlementCache.set(cacheKey, { settled: false, timestamp: Date.now() });

        const account = privateKeyToAccount(FACILITATOR_PRIVATE_KEY);
        const walletClient = createWalletClient({
            account,
            chain: arcTestnet,
            transport: http("https://rpc.testnet.arc.network"),
        });

        const txHash = await walletClient.writeContract({
            address: USDC_ADDRESS as `0x${string}`,
            abi: EIP3009_ABI,
            functionName: "transferWithAuthorization",
            args: [
                from as `0x${string}`,
                to as `0x${string}`,
                BigInt(value),
                BigInt(validAfter),
                BigInt(validBefore),
                nonce as `0x${string}`,
                Number(v),
                r as `0x${string}`,
                s as `0x${string}`,
            ],
        });

        const receipt = await arcPublicClient.waitForTransactionReceipt({
            hash: txHash,
            confirmations: 1,
        });

        if (receipt.status === "reverted") {
            settlementCache.delete(cacheKey);
            return NextResponse.json({ success: false, error: "Transaction reverted on-chain" }, { status: 500 });
        }

        settlementCache.set(cacheKey, { settled: true, txHash, timestamp: Date.now() });

        // Save to DB for dashboard tracking
        try {
            await (db as any).x402Payment.create({
                data: {
                    txHash,
                    payer: from.toLowerCase(),
                    payTo: to.toLowerCase(),
                    amount: (parseInt(value) / 1_000_000).toFixed(6),
                    network: `eip155:${arcTestnet.id}`,
                    resource: paymentDetails.resource ?? "unknown",
                    nonce: nonce as string,
                    settledAt: new Date(),
                },
            });
        } catch { }

        return NextResponse.json({
            success: true,
            txHash,
            networkId: `eip155:${arcTestnet.id}`,
            payer: from,
            amount: value.toString(),
            token: USDC_ADDRESS,
        });

    } catch (err: any) {
        // BigInt-safe error logging
        console.error("[x402/settle] Full error:", safeStringify(err));
        console.error("[x402/settle] Message:", err.message);
        console.error("[x402/settle] Cause:", typeof err.cause === "bigint" ? err.cause.toString() : String(err.cause ?? ""));
        return NextResponse.json({
            success: false,
            error: err.message ?? "Settlement failed",
            details: typeof err.cause === "bigint" ? err.cause.toString() : String(err.cause ?? ""),
        }, { status: 500 });
    }
}