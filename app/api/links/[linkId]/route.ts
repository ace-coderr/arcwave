import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { arcPublicClient } from "@/lib/arcClient";
import { isValidTxHash } from "@/lib/utils";
import { parseEther, formatEther } from "viem";

interface RouteParams { params: { linkId: string } }

// ─── GET: Fetch a single payment link ────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const link = await db.paymentLink.findUnique({
    where: { id: params.linkId },
  });

  if (!link) {
    return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
  }

  return NextResponse.json({ link });
}

// ─── PATCH: Mark a payment link as completed (one-time use) ──────────────────
// Once paid, the link is permanently COMPLETED and cannot be paid again.
// This is the one-time use enforcement — no time expiry, just payment expiry.
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { txHash, paidBy } = body;

  if (!txHash || !isValidTxHash(txHash)) {
    return NextResponse.json(
      { error: "A valid transaction hash is required." },
      { status: 400 }
    );
  }

  const link = await db.paymentLink.findUnique({
    where: { id: params.linkId },
  });

  if (!link) {
    return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
  }

  // ONE-TIME USE: already completed — reject any further payment attempts
  if (link.status === "COMPLETED") {
    return NextResponse.json(
      { error: "This payment link has already been used. Each link can only be paid once." },
      { status: 409 }
    );
  }

  // Manually expired — reject
  if (link.status === "EXPIRED") {
    return NextResponse.json(
      { error: "This payment link has been cancelled by the creator." },
      { status: 410 }
    );
  }

  // Try on-chain verification
  let verificationPassed = false;
  let verificationError = "";

  try {
    const tx = await arcPublicClient.getTransaction({
      hash: txHash as `0x${string}`,
    });

    if (tx && tx.blockNumber) {
      const txTo = tx.to?.toLowerCase();
      const expectedTo = link.recipientAddress.toLowerCase();

      if (txTo !== expectedTo) {
        return NextResponse.json(
          { error: `Transaction sent to wrong address.` },
          { status: 400 }
        );
      }

      const requiredWei = parseEther(link.amount);
      if (tx.value < requiredWei) {
        const sentUsdc = parseFloat(formatEther(tx.value)).toFixed(4);
        return NextResponse.json(
          { error: `Insufficient payment. Required ${link.amount} USDC, received ${sentUsdc} USDC.` },
          { status: 400 }
        );
      }
      verificationPassed = true;
    } else if (tx && !tx.blockNumber) {
      return NextResponse.json(
        { error: "Transaction is still pending. Please wait a moment and try again." },
        { status: 400 }
      );
    } else {
      verificationError = "Transaction not yet visible on chain.";
    }
  } catch (err: any) {
    verificationError = err?.message ?? "RPC unreachable";
    console.warn("[PATCH] Verification skipped:", verificationError);
  }

  // Mark as COMPLETED — one-time use enforced
  const updatedLink = await db.paymentLink.update({
    where: { id: params.linkId },
    data: {
      status: "COMPLETED",
      txHash,
      paidBy: paidBy ? paidBy.toLowerCase() : null,
      paidAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    link: updatedLink,
    verified: verificationPassed,
    message: verificationPassed
      ? "Payment verified on-chain. Link is now closed."
      : `Payment recorded. Link is now closed.`,
  });
}

// ─── DELETE: Manually cancel/expire a payment link ────────────────────────────
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const link = await db.paymentLink.findUnique({
    where: { id: params.linkId },
  });

  if (!link) {
    return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
  }

  if (link.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Cannot cancel a completed payment." },
      { status: 409 }
    );
  }

  const updated = await db.paymentLink.update({
    where: { id: params.linkId },
    data: { status: "EXPIRED" },
  });

  return NextResponse.json({ success: true, link: updated });
}
