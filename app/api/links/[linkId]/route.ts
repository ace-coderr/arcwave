import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { arcPublicClient } from "@/lib/arcClient";
import { isValidTxHash } from "@/lib/utils";
import { parseEther, formatEther } from "viem";

interface RouteParams { params: { linkId: string } }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const link = await db.paymentLink.findUnique({ where: { id: params.linkId } });
  if (!link) return NextResponse.json({ error: "Payment link not found." }, { status: 404 });

  // Auto-expire on read
  if (link.status === "ACTIVE" && new Date() > link.expiresAt) {
    const expired = await db.paymentLink.update({ where: { id: params.linkId }, data: { status: "EXPIRED" } });
    return NextResponse.json({ link: expired });
  }

  return NextResponse.json({ link });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const { txHash, paidBy } = body;

  if (!txHash || !isValidTxHash(txHash)) {
    return NextResponse.json({ error: "A valid transaction hash is required." }, { status: 400 });
  }

  const link = await db.paymentLink.findUnique({ where: { id: params.linkId } });
  if (!link) return NextResponse.json({ error: "Payment link not found." }, { status: 404 });

  // Already completed — return success so UI updates
  if (link.status === "COMPLETED") return NextResponse.json({ success: true, link });

  // Reject if expired
  if (link.status === "EXPIRED" || new Date() > link.expiresAt) {
    if (link.status !== "EXPIRED") {
      await db.paymentLink.update({ where: { id: params.linkId }, data: { status: "EXPIRED" } });
    }
    return NextResponse.json(
      { error: "This payment link has expired. The creator needs to generate a new one." },
      { status: 410 }
    );
  }

  // Try on-chain verification
  let verificationPassed = false;
  let verificationError = "";

  try {
    const tx = await arcPublicClient.getTransaction({ hash: txHash as `0x${string}` });

    if (tx && tx.blockNumber) {
      const txTo = tx.to?.toLowerCase();
      const expectedTo = link.recipientAddress.toLowerCase();

      if (txTo !== expectedTo) {
        return NextResponse.json(
          { error: `Transaction sent to wrong address. Expected ${expectedTo}, got ${txTo}.` },
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
    message: verificationPassed ? "Payment verified on-chain." : `Payment recorded (${verificationError}).`,
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const link = await db.paymentLink.findUnique({ where: { id: params.linkId } });
  if (!link) return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
  if (link.status === "COMPLETED") {
    return NextResponse.json({ error: "Cannot expire a completed payment." }, { status: 409 });
  }
  const updated = await db.paymentLink.update({ where: { id: params.linkId }, data: { status: "EXPIRED" } });
  return NextResponse.json({ success: true, link: updated });
}
