import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { arcPublicClient } from "@/lib/arcClient";
import { parseEther } from "viem";

const ADMIN_WALLET = "0x8557fabdc62f59a1ba7d6a74aaf0942cdcb68f69";
interface RouteParams { params: { linkId: string } }

async function checkDisputeDeadline(escrow: any, reqUrl: string) {
  if (escrow.status !== "DISPUTED") return;
  if (!escrow.disputeDeadline) return;
  if (new Date(escrow.disputeDeadline) > new Date()) return;

  const now = new Date();
  if (!escrow.sellerRespondedAt) {
    await db.escrowLink.update({ where: { id: escrow.id }, data: { status: "CANCELLED" } });
    await db.escrowMessage.create({ data: { escrowId: escrow.id, sender: "SYSTEM", message: "Seller did not respond within 48 hours. Funds have been automatically refunded to the buyer." } });
    fetch(new URL(`/api/escrow/refund?wallet=${ADMIN_WALLET}`, reqUrl).toString(), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ escrowId: escrow.id }),
    }).catch(console.error);
  } else if (!escrow.buyerLastMessageAt) {
    await db.escrowLink.update({ where: { id: escrow.id }, data: { status: "CONFIRMED", confirmedAt: now } });
    await db.escrowMessage.create({ data: { escrowId: escrow.id, sender: "SYSTEM", message: "Buyer did not respond within 48 hours. Funds have been automatically released to the seller." } });
    fetch(new URL("/api/escrow/release", reqUrl).toString(), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ escrowId: escrow.id }),
    }).catch(console.error);
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const escrow = await db.escrowLink.findUnique({
    where: { id: params.linkId },
    select: {
      id: true, title: true, description: true, amount: true,
      sellerAddress: true, sellerContact: true, buyerAddress: true, stealthAddress: true,
      status: true, txHash: true, paidAt: true,
      deliveryDays: true, deliveryDeadline: true, releaseDeadline: true,
      confirmedAt: true, disputedAt: true, disputeReason: true,
      disputeDeadline: true, sellerRespondedAt: true, buyerLastMessageAt: true,
      createdAt: true,
    },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });
  await checkDisputeDeadline(escrow, req.url);
  return NextResponse.json({ escrow });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { action, txHash, paidBy, disputeReason } = body;
  const escrow = await db.escrowLink.findUnique({ where: { id: params.linkId } });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });

  // ── PAY ──────────────────────────────────────────────────────
  if (action === "pay") {
    if (escrow.status !== "ACTIVE") return NextResponse.json({ error: "Escrow is not active." }, { status: 409 });
    if (!txHash) return NextResponse.json({ error: "Transaction hash is required." }, { status: 400 });

    try {
      const tx = await arcPublicClient.getTransaction({ hash: txHash as `0x${string}` });
      if (tx && tx.blockNumber) {
        if (tx.to?.toLowerCase() !== escrow.stealthAddress.toLowerCase()) {
          return NextResponse.json({ error: "Transaction sent to wrong address." }, { status: 400 });
        }
        if (tx.value < parseEther(escrow.amount)) {
          return NextResponse.json({ error: `Insufficient payment. Required ${escrow.amount} USDC.` }, { status: 400 });
        }
      }
    } catch (err: any) { console.warn("[escrow pay] verification skipped:", err.message); }

    const paidAt = new Date();
    const days = escrow.deliveryDays ?? 7;
    // Delivery deadline = paidAt + deliveryDays
    const deliveryDeadline = new Date(paidAt.getTime() + days * 24 * 60 * 60 * 1000);
    // Auto-release = deliveryDeadline + 7 days (grace period after delivery)
    const releaseDeadline = new Date(deliveryDeadline.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.escrowLink.update({
      where: { id: params.linkId },
      data: { status: "HOLDING", txHash, buyerAddress: paidBy ? paidBy.toLowerCase() : null, paidAt, deliveryDeadline, releaseDeadline },
    });

    return NextResponse.json({ success: true, status: "HOLDING", deliveryDeadline, releaseDeadline });
  }

  // ── CONFIRM ───────────────────────────────────────────────────
  if (action === "confirm") {
    if (escrow.status !== "HOLDING") return NextResponse.json({ error: "Escrow is not in HOLDING status." }, { status: 409 });
    await db.escrowLink.update({ where: { id: params.linkId }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
    fetch(new URL("/api/escrow/release", req.url).toString(), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ escrowId: params.linkId }),
    }).catch(console.error);
    return NextResponse.json({ success: true, status: "CONFIRMED" });
  }

  // ── DISPUTE ───────────────────────────────────────────────────
  if (action === "dispute") {
    if (escrow.status !== "HOLDING") return NextResponse.json({ error: "Escrow is not in HOLDING status." }, { status: 409 });
    const now = new Date();
    const disputeDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    await db.escrowLink.update({
      where: { id: params.linkId },
      data: { status: "DISPUTED", disputedAt: now, disputeDeadline, disputeReason: disputeReason?.trim() || "No reason provided" },
    });
    await db.escrowMessage.create({
      data: { escrowId: params.linkId, sender: "SYSTEM", message: `Dispute opened by buyer. Reason: "${disputeReason?.trim() || "No reason provided"}". Both parties have 48 hours to submit their side. If the seller does not respond, funds will be automatically refunded to the buyer.` },
    });
    return NextResponse.json({ success: true, status: "DISPUTED", disputeDeadline });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const escrow = await db.escrowLink.findUnique({ where: { id: params.linkId } });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });
  if (escrow.status !== "ACTIVE") return NextResponse.json({ error: "Can only cancel active escrows." }, { status: 409 });
  await db.escrowLink.update({ where: { id: params.linkId }, data: { status: "CANCELLED" } });
  return NextResponse.json({ success: true });
}
