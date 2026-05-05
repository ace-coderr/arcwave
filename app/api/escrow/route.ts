import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateStealthWallet } from "@/lib/stealthWallet";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  if (!address) return NextResponse.json({ error: "Address is required." }, { status: 400 });

  const escrows = await db.escrowLink.findMany({
    where: { sellerAddress: address.toLowerCase() },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, description: true, amount: true,
      sellerAddress: true, buyerAddress: true, stealthAddress: true,
      status: true, txHash: true, releaseTxHash: true,
      paidAt: true, releaseDeadline: true, confirmedAt: true,
      disputedAt: true, disputeReason: true, createdAt: true,
    },
  });

  // Auto-release past deadline
  const now = new Date();
  const toRelease = escrows.filter(e => e.status === "HOLDING" && e.releaseDeadline && new Date(e.releaseDeadline) <= now);
  if (toRelease.length > 0) {
    await db.escrowLink.updateMany({
      where: { id: { in: toRelease.map(e => e.id) } },
      data: { status: "CONFIRMED", confirmedAt: now },
    });
    toRelease.forEach(e => { e.status = "CONFIRMED"; });
    for (const e of toRelease) {
      fetch(new URL("/api/escrow/release", req.url).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escrowId: e.id }),
      }).catch(console.error);
    }
  }

  return NextResponse.json({ escrows });
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const { title, description, amount, sellerAddress } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!sellerAddress) return NextResponse.json({ error: "Seller address is required." }, { status: 400 });
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) return NextResponse.json({ error: "Enter a valid amount greater than 0." }, { status: 400 });

  const wallet = generateStealthWallet();
  const escrow = await db.escrowLink.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      amount: parsed.toString(),
      sellerAddress: sellerAddress.toLowerCase(),
      stealthAddress: wallet.address,
      stealthPrivateKey: wallet.encryptedPrivateKey,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ escrow }, { status: 201 });
}
