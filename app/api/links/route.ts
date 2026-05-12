import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateStealthWallet } from "@/lib/stealthWallet";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  if (!address) return NextResponse.json({ error: "Address required." }, { status: 400 });
  const addr = address.toLowerCase();

  const paymentLinks = await db.paymentLink.findMany({
    where: { recipientAddress: addr },
    orderBy: { createdAt: "desc" },
  });

  const releasedEscrows = await db.escrowLink.findMany({
    where: { sellerAddress: addr, status: { in: ["RELEASED", "CONFIRMED"] } },
    orderBy: { createdAt: "desc" },
  });

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

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const { title, amount, description, recipientAddress, stealthMode, expiresAt } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!recipientAddress) return NextResponse.json({ error: "Recipient address is required." }, { status: 400 });
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) return NextResponse.json({ error: "Enter a valid amount greater than 0." }, { status: 400 });

  let stealthAddress: string | null = null;
  let stealthPrivateKey: string | null = null;

  if (stealthMode) {
    const wallet = generateStealthWallet();
    stealthAddress = wallet.address;
    stealthPrivateKey = wallet.encryptedPrivateKey;
  }

  const link = await db.paymentLink.create({
    data: {
      title: title.trim(),
      amount: parsed.toString(),
      description: description?.trim() || null,
      recipientAddress: recipientAddress.toLowerCase(),
      stealthAddress,
      stealthPrivateKey,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ link }, { status: 201 });
}