import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { arcPublicClient } from "@/lib/arcClient";

const PAYMENT_ADDRESS = "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c";
const PRICE = "1000"; // 0.001 USDC in atomic units (6 decimals)
const NETWORK = "eip155:5042002";
const FACILITATOR = "https://conduit-pay.vercel.app/api/x402";

function buildPaymentRequired() {
    const paymentDetails = {
        scheme: "exact",
        network: NETWORK,
        maxAmountRequired: PRICE,
        resource: "https://conduit-pay.vercel.app/api/arc-stats",
        description: "Live Arc Network and Conduit platform stats",
        mimeType: "application/json",
        payTo: PAYMENT_ADDRESS,
        maxTimeoutSeconds: 300,
        asset: "0x3600000000000000000000000000000000000000",
        extra: { name: "USD Coin", version: "2" },
    };

    const encoded = Buffer.from(JSON.stringify({ accepts: [paymentDetails] })).toString("base64");

    return new NextResponse(
        JSON.stringify({ error: "Payment Required", accepts: [paymentDetails] }),
        {
            status: 402,
            headers: {
                "Content-Type": "application/json",
                "PAYMENT-REQUIRED": encoded,
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
            },
        }
    );
}

async function verifyPayment(paymentHeader: string): Promise<{ valid: boolean; error?: string }> {
    try {
        const res = await fetch(`${FACILITATOR}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                payload: paymentHeader,
                paymentDetails: {
                    scheme: "exact",
                    network: NETWORK,
                    maxAmountRequired: PRICE,
                    payTo: PAYMENT_ADDRESS,
                    asset: "0x3600000000000000000000000000000000000000",
                },
            }),
        });
        const data = await res.json();
        return { valid: data.isValid === true };
    } catch (err: any) {
        return { valid: false, error: err.message };
    }
}

async function settlePayment(paymentHeader: string): Promise<void> {
    try {
        await fetch(`${FACILITATOR}/settle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                payload: paymentHeader,
                paymentDetails: {
                    scheme: "exact",
                    network: NETWORK,
                    maxAmountRequired: PRICE,
                    payTo: PAYMENT_ADDRESS,
                    asset: "0x3600000000000000000000000000000000000000",
                },
            }),
        });
    } catch { }
}

export async function GET(req: NextRequest) {
    // Check for payment signature
    const paymentSignature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("payment-signature");

    if (!paymentSignature) {
        return buildPaymentRequired();
    }

    // Verify payment
    const { valid, error } = await verifyPayment(paymentSignature);
    if (!valid) {
        return buildPaymentRequired();
    }

    // Fetch stats
    const [blockNumber, links, escrows] = await Promise.all([
        arcPublicClient.getBlockNumber(),
        db.paymentLink.findMany({ select: { amount: true, status: true } }),
        db.escrowLink.findMany({ select: { amount: true, status: true } }),
    ]);

    const completedLinks = links.filter(l => l.status === "COMPLETED" || l.status === "PAID");
    const releasedEscrows = escrows.filter(e => ["RELEASED", "CONFIRMED"].includes(e.status));
    const totalLinkVolume = completedLinks.reduce((s, l) => s + parseFloat(l.amount), 0);
    const totalEscrowVolume = releasedEscrows.reduce((s, e) => s + parseFloat(e.amount), 0);

    const responseData = {
        network: {
            name: "Arc Testnet",
            chainId: 5042002,
            blockNumber: blockNumber.toString(),
            rpc: "https://rpc.testnet.arc.network",
            explorer: "https://testnet.arcscan.app",
        },
        conduit: {
            paymentLinks: {
                total: links.length,
                completed: completedLinks.length,
                volume: `${totalLinkVolume.toFixed(2)} USDC`,
            },
            escrows: {
                total: escrows.length,
                released: releasedEscrows.length,
                active: escrows.filter(e => e.status === "HOLDING").length,
                disputed: escrows.filter(e => ["DISPUTED", "MEDIATION"].includes(e.status)).length,
                volume: `${totalEscrowVolume.toFixed(2)} USDC`,
            },
            totalVolume: `${(totalLinkVolume + totalEscrowVolume).toFixed(2)} USDC`,
        },
        facilitator: FACILITATOR,
        timestamp: new Date().toISOString(),
    };

    // Settle payment async (don't block the response)
    settlePayment(paymentSignature);

    return NextResponse.json(responseData, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
        },
    });
}

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, PAYMENT-SIGNATURE",
            "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
        },
    });
}