import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, recoverTypedDataAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "@/lib/arcChain";
import { db } from "@/lib/db";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const FACILITATOR_PRIVATE_KEY = process.env.FORWARDER_PRIVATE_KEY as `0x${string}`;

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

const EIP712_DOMAIN = {
    name: "USDC",
    version: "2",
    chainId: arcTestnet.id,
    verifyingContract: USDC_ADDRESS as `0x${string}`,
} as const;

const EIP712_TYPES = {
    TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
    ],
} as const;

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

        console.log("[x402/settle] Decoded:", safeStringify({ from, to, value, validAfter, validBefore, nonce, v }));

        // Build full 65-byte sig: r(32) + s(32) + v(1)
        const vHex = Number(v).toString(16).padStart(2, "0");
        const fullSig = `${r}${s.slice(2)}${vHex}` as `0x${string}`;

        const typedDataMessage = {
            from: from as `0x${string}`,
            to: to as `0x${string}`,
            value: BigInt(value),
            validAfter: BigInt(validAfter),
            validBefore: BigInt(validBefore),
            nonce: nonce as `0x${string}`,
        };

        // Recover address from signature to diagnose the issue
        try {
            const recovered = await recoverTypedDataAddress({
                domain: EIP712_DOMAIN,
                types: EIP712_TYPES,
                primaryType: "TransferWithAuthorization",
                message: typedDataMessage,
                signature: fullSig,
            });
            console.log("[x402/settle] Expected from:", from.toLowerCase());
            console.log("[x402/settle] Recovered addr:", recovered.toLowerCase());
            console.log("[x402/settle] Sig match:", recovered.toLowerCase() === from.toLowerCase());
        } catch (recoverErr: any) {
            console.error("[x402/settle] Recover error:", recoverErr.message);
        }

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

        console.log("[x402/settle] Nonce used:", nonceUsed);

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

        console.log("[x402/settle] TX submitted:", txHash);

        const receipt = await arcPublicClient.waitForTransactionReceipt({
            hash: txHash,
            confirmations: 1,
        });

        if (receipt.status === "reverted") {
            settlementCache.delete(cacheKey);
            return NextResponse.json({ success: false, error: "Transaction reverted on-chain" }, { status: 500 });
        }

        settlementCache.set(cacheKey, { settled: true, txHash, timestamp: Date.now() });

        // Save to DB
        try {
            await db.x402Payment.create({
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
            console.log("[x402/settle] Saved to DB:", txHash);
        } catch (dbErr: any) {
            console.error("[x402/settle] DB save error:", dbErr.message);
        }

        return NextResponse.json({
            success: true,
            txHash,
            networkId: `eip155:${arcTestnet.id}`,
            payer: from,
            amount: value.toString(),
            token: USDC_ADDRESS,
        });

    } catch (err: any) {
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