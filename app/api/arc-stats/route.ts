import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { x402Server, PAYMENT_ADDRESS } from "@/lib/x402";
import { db } from "@/lib/db";
import { arcPublicClient } from "@/lib/arcClient";

const handler = async (_: NextRequest) => {
    const [blockNumber, links, escrows] = await Promise.all([
        arcPublicClient.getBlockNumber(),
        db.paymentLink.findMany({ select: { amount: true, status: true } }),
        db.escrowLink.findMany({ select: { amount: true, status: true } }),
    ]);

    const completedLinks = links.filter(l => l.status === "COMPLETED" || l.status === "PAID");
    const releasedEscrows = escrows.filter(e => ["RELEASED", "CONFIRMED"].includes(e.status));

    const totalLinkVolume = completedLinks.reduce((s, l) => s + parseFloat(l.amount), 0);
    const totalEscrowVolume = releasedEscrows.reduce((s, e) => s + parseFloat(e.amount), 0);

    return NextResponse.json({
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
        facilitator: "https://conduit-pay.vercel.app/api/x402",
        timestamp: new Date().toISOString(),
    });
};

export const GET = withX402(
    handler,
    {
        accepts: [{
            scheme: "exact",
            price: "$0.001",
            network: "eip155:5042002",
            payTo: PAYMENT_ADDRESS,
        }],
        description: "Live Arc Network and Conduit platform stats — block number, payment volume, escrow activity",
        mimeType: "application/json",
    },
    x402Server,
);