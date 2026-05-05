import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ADMIN_WALLET = "0x8557fabdc62f59a1ba7d6a74aaf0942cdcb68f69";

export async function GET(req: NextRequest) {
  const wallet = req.headers.get("x-wallet-address")?.toLowerCase();
  const { searchParams } = new URL(req.url);
  const queryWallet = searchParams.get("wallet")?.toLowerCase();
  const caller = wallet ?? queryWallet ?? "";

  if (caller !== ADMIN_WALLET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [links, escrows] = await Promise.all([
      db.paymentLink.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, amount: true, status: true,
          recipientAddress: true, stealthAddress: true,
          txHash: true, paidBy: true, paidAt: true, createdAt: true,
        },
      }),
      db.escrowLink.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, amount: true, status: true,
          sellerAddress: true, buyerAddress: true, stealthAddress: true,
          txHash: true, releaseTxHash: true,
          paidAt: true, releaseDeadline: true, confirmedAt: true,
          disputedAt: true, disputeReason: true, sellerContact: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({ links, escrows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
