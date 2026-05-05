import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { arcPublicClient } from "@/lib/arcClient";
import { parseEther, formatEther } from "viem";

interface RouteParams { params: { linkId: string } }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const escrow = await db.escrowLink.findUnique({
    where: { id: params.linkId },
    select: {
      id: true, title: true, description: true, amount: true,
      sellerAddress: true, buyerAddress: true, stealthAddress: true,
      status: true, txHash: true, paidAt: true, releaseDeadline: true,
      confirmedAt: true, disputedAt: true, disputeReason: true, createdAt: true,
    },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });
  return NextResponse.json({ escrow });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const { action, txHash, paidBy, disputeReason } = body;

  const escrow = await db.escrowLink.findUnique({ where: { id: params.linkId } });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });

  // ── PAY: buyer pays into stealth wallet ──────────────────────
  if (action === "pay") {
    if (escrow.status !== "ACTIVE") return NextResponse.json({ error: "Escrow is not active." }, { status: 409 });
    if (!txHash) return NextResponse.json({ error: "Transaction hash is required." }, { status: 400 });

    // Verify on-chain
    try {
      const tx = await arcPublicClient.getTransaction({ hash: txHash as `0x${string}` });
      if (tx && tx.blockNumber) {
        const txTo = tx.to?.toLowerCase();
        if (txTo !== escrow.stealthAddress.toLowerCase()) {
          return NextResponse.json({ error: `Transaction sent to wrong address.` }, { status: 400 });
        }
        const requiredWei = parseEther(escrow.amount);
        if (tx.value < requiredWei) {
          return NextResponse.json({ error: `Insufficient payment. Required ${escrow.amount} USDC.` }, { status: 400 });
        }
      }
    } catch (err: any) {
      console.warn("[escrow pay] verification skipped:", err.message);
    }

    const paidAt = new Date();
    const releaseDeadline = new Date(paidAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.escrowLink.update({
      where: { id: params.linkId },
      data: {
        status: "HOLDING",
        txHash,
        buyerAddress: paidBy ? paidBy.toLowerCase() : null,
        paidAt,
        releaseDeadline,
      },
    });

    return NextResponse.json({ success: true, status: "HOLDING", releaseDeadline });
  }

  // ── CONFIRM: buyer confirms receipt ─────────────────────────
  if (action === "confirm") {
    if (escrow.status !== "HOLDING") return NextResponse.json({ error: "Escrow is not in HOLDING status." }, { status: 409 });

    await db.escrowLink.update({
      where: { id: params.linkId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });

    // Trigger release
    fetch(new URL("/api/escrow/release", req.url).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escrowId: params.linkId }),
    }).catch(console.error);

    return NextResponse.json({ success: true, status: "CONFIRMED" });
  }

  // ── DISPUTE: buyer raises dispute ────────────────────────────
  if (action === "dispute") {
    if (escrow.status !== "HOLDING") return NextResponse.json({ error: "Escrow is not in HOLDING status." }, { status: 409 });

    await db.escrowLink.update({
      where: { id: params.linkId },
      data: {
        status: "DISPUTED",
        disputedAt: new Date(),
        disputeReason: disputeReason?.trim() || "No reason provided",
      },
    });

    return NextResponse.json({ success: true, status: "DISPUTED" });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const escrow = await db.escrowLink.findUnique({ where: { id: params.linkId } });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });
  if (!["ACTIVE"].includes(escrow.status)) {
    return NextResponse.json({ error: "Can only cancel active escrows." }, { status: 409 });
  }
  await db.escrowLink.update({ where: { id: params.linkId }, data: { status: "CANCELLED" } });
  return NextResponse.json({ success: true });
}
