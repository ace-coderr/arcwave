import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateStealthWallet } from "@/lib/stealthWallet";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required." }, { status: 400 });
  }

  const links = await db.paymentLink.findMany({
    where: { recipientAddress: address.toLowerCase() },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      amount: true,
      recipientAddress: true,
      stealthAddress: true,
      status: true,
      expiresAt: true,
      txHash: true,
      forwardTxHash: true,
      paidBy: true,
      paidAt: true,
      createdAt: true,
    },
  });

  // Auto-expire links that have passed their expiry date
  const now = new Date();
  const toExpire = links.filter(
    l => l.status === "ACTIVE" && l.expiresAt && new Date(l.expiresAt) <= now
  );

  if (toExpire.length > 0) {
    await db.paymentLink.updateMany({
      where: { id: { in: toExpire.map(l => l.id) } },
      data: { status: "EXPIRED" },
    });
    toExpire.forEach(l => { l.status = "EXPIRED"; });
  }

  // Fetch released escrow links and merge as ESCROW-tagged entries
  const escrows = await db.escrowLink.findMany({
    where: {
      sellerAddress: address.toLowerCase(),
      status: { in: ["RELEASED", "CONFIRMED"] },
    },
    select: {
      id: true,
      title: true,
      amount: true,
      buyerAddress: true,
      releaseTxHash: true,
      confirmedAt: true,
      createdAt: true,
    },
  });

  // Map escrow releases to same shape as links but with isEscrow flag
  const escrowLinks = escrows.map(e => ({
    id: e.id,
    title: e.title,
    description: undefined,
    amount: e.amount,
    recipientAddress: address.toLowerCase(),
    stealthAddress: undefined,
    status: "COMPLETED",
    expiresAt: null,
    txHash: e.releaseTxHash ?? undefined,
    forwardTxHash: undefined,
    paidBy: e.buyerAddress ?? undefined,
    paidAt: e.confirmedAt ?? null,
    createdAt: e.createdAt,
    isEscrow: true,
  }));

  // Merge and sort by date
  const allLinks = [...links.map(l => ({ ...l, isEscrow: false })), ...escrowLinks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ links: allLinks });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { title, amount, description, recipientAddress, stealthMode, expiresAt } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!recipientAddress) {
    return NextResponse.json({ error: "Recipient address is required." }, { status: 400 });
  }

  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) {
    return NextResponse.json({ error: "Enter a valid amount greater than 0." }, { status: 400 });
  }

  if (expiresAt && new Date(expiresAt) <= new Date()) {
    return NextResponse.json({ error: "Expiry date must be in the future." }, { status: 400 });
  }

  let stealthAddress: string | undefined;
  let stealthPrivateKey: string | undefined;

  if (stealthMode) {
    const wallet = generateStealthWallet();
    stealthAddress = wallet.address;
    stealthPrivateKey = wallet.encryptedPrivateKey;
  }

  const link = await db.paymentLink.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      amount: parsed.toString(),
      recipientAddress: recipientAddress.toLowerCase(),
      stealthAddress: stealthAddress ?? null,
      stealthPrivateKey: stealthPrivateKey ?? null,
      status: "ACTIVE",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json({ link }, { status: 201 });
}
