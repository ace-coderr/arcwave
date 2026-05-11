import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  if (!address) return NextResponse.json({ error: "Address required." }, { status: 400 });

  const addr = address.toLowerCase();

  // Payment links
  const paymentLinks = await db.paymentLink.findMany({
    where: { recipientAddress: addr },
    orderBy: { createdAt: "desc" },
  });

  // Released escrows (seller received)
  const releasedEscrows = await db.escrowLink.findMany({
    where: { sellerAddress: addr, status: { in: ["RELEASED", "CONFIRMED"] } },
    orderBy: { createdAt: "desc" },
  });

  // Cancelled/refunded escrows (buyer got refund — seller didn't receive)
  const refundedEscrows = await db.escrowLink.findMany({
    where: { sellerAddress: addr, status: "CANCELLED", txHash: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  const links = [
    ...paymentLinks.map(l => ({
      id: l.id,
      title: l.title,
      amount: l.amount,
      status: l.status === "PAID" ? "COMPLETED" : l.status,
      txHash: l.txHash ?? undefined,
      forwardTxHash: l.forwardTxHash ?? undefined,
      paidBy: l.paidBy ?? undefined,
      paidAt: l.paidAt?.toISOString() ?? undefined,
      createdAt: l.createdAt.toISOString(),
      isEscrow: false,
      isRefunded: false,
    })),
    ...releasedEscrows.map(e => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      status: "COMPLETED",
      txHash: e.releaseTxHash ?? e.txHash ?? undefined,
      paidBy: e.buyerAddress ?? undefined,
      paidAt: e.confirmedAt?.toISOString() ?? e.paidAt?.toISOString() ?? undefined,
      createdAt: e.createdAt.toISOString(),
      isEscrow: true,
      isRefunded: false,
    })),
    ...refundedEscrows.map(e => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      status: "COMPLETED",
      txHash: e.txHash ?? undefined,
      paidBy: e.buyerAddress ?? undefined,
      paidAt: e.disputedAt?.toISOString() ?? e.paidAt?.toISOString() ?? undefined,
      createdAt: e.createdAt.toISOString(),
      isEscrow: true,
      isRefunded: true,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ links });
}