import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, keccak256, encodeAbiParameters, parseAbiParameters, recoverAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "@/lib/arcChain";
import { db } from "@/lib/db";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const DOMAIN_SEPARATOR = "0x361191522483d32a83e70ae7183b4b9629442c13a78bc9921d6f707911c8c6b0" as `0x${string}`;
const TRANSFER_TYPEHASH = "0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267" as `0x${string}`;
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

const settlementCache = new Map<string, { settled: boolean; txHash?: string; timestamp: number }>();
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of settlementCache.entries()) {
        if (now - val.timestamp > 120_000) settlementCache.delete(key);
    }
}, 300_000);

function buildDigest(
    from: string, to: string, value: string,
    validAfter: string, validBefore: string, nonce: string
): `0x${string}` {
    const structHash = keccak256(encodeAbiParameters(
        parseAbiParameters("bytes32, address, address, uint256, uint256, uint256, bytes32"),
        [
            TRANSFER_TYPEHASH,
            from as `0x${string}`,
            to as `0x${string}`,
            BigInt(value),
            BigInt(validAfter),
            BigInt(validBefore),
            nonce as `0x${string}`,
        ]
    ));

    // keccak256("\x19\x01" || DOMAIN_SEPARATOR || structHash)
    const packed = `0x1901${DOMAIN_SEPARATOR.slice(2)}${structHash.slice(2)}` as `0x${string}`;
    return keccak256(packed);
}

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

        // Compute digest and recover signer — return in response for diagnosis
        let diagInfo: any = {};
        try {
            const digest = buildDigest(from, to, value, validAfter, validBefore, nonce);
            const fullSig = `${r}${s.slice(2)}${Number(v).toString(16).padStart(2, "0")}` as `0x${string}`;
            const recovered = await recoverAddress({ hash: digest, signature: fullSig });
            diagInfo = {
                digest,
                expectedFrom: from.toLowerCase(),
                recoveredAddr: recovered.toLowerCase(),
                sigMatch: recovered.toLowerCase() === from.toLowerCase(),
            };
        } catch (diagErr: any) {
            diagInfo = { diagError: diagErr.message };
        }

        console.log("[x402/settle] Diag:", JSON.stringify(diagInfo));

        // If signature doesn't recover to from, return early with diagnosis
        if (diagInfo.sigMatch === false) {
            return NextResponse.json({
                success: false,
                error: "Signature mismatch",
                diag: diagInfo,
            }, { status: 400 });
        }

        // Duplicate settlement protection
        const cacheKey = `${from}-${nonce}`;
        const cached = settlementCache.get(cacheKey);
        if (cached?.settled) {
            return NextResponse.json({ success: true, txHash: cached.txHash, duplicate: true });
        }

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

        const receipt = await arcPublicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

        if (receipt.status === "reverted") {
            settlementCache.delete(cacheKey);
            return NextResponse.json({ success: false, error: "Transaction reverted on-chain" }, { status: 500 });
        }

        settlementCache.set(cacheKey, { settled: true, txHash, timestamp: Date.now() });

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
        console.error("[x402/settle] Error:", safeStringify(err));
        return NextResponse.json({
            success: false,
            error: err.message ?? "Settlement failed",
            details: typeof err.cause === "bigint" ? err.cause.toString() : String(err.cause ?? ""),
        }, { status: 500 });
    }
}