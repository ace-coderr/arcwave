import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { arcPublicClient } from "@/lib/arcClient";
import { parseEther, formatEther } from "viem";

interface RouteParams { params: { linkId: string } }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const link = await db.paymentLink.findUnique({
    where: { id: params.linkId },
    select: {
      id: true,
      title: true,
      description: true,
      amount: true,
      stealthAddress: true,
      status: true,
      txHash: true,
      forwardTxHash: true,
      createdAt: true,
    },
  });

  if (!link) {
    return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
  }

  return NextResponse.json({ link });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  console.log(`[PATCH] Called for link: ${params.linkId}`);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { txHash, paidBy } = body;

  // Allow any non-empty hash — including unified payment hashes like "0x_unified_..."
  if (!txHash) {
    return NextResponse.json(
      { error: "A transaction hash is required." },
      { status: 400 }
    );
  }

  const link = await db.paymentLink.findUnique({
    where: { id: params.linkId },
    select: {
      id: true,
      title: true,
      amount: true,
      recipientAddress: true,
      stealthAddress: true,
      status: true,
      txHash: true,
    },
  });

  if (!link) {
    return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
  }

  if (link.status === "COMPLETED") {
    return NextResponse.json({ error: "This payment link has already been used." }, { status: 409 });
  }

  if (link.status === "EXPIRED") {
    return NextResponse.json({ error: "This payment link has been cancelled." }, { status: 410 });
  }

  const isStealthLink = !!link.stealthAddress;

  // Only verify on-chain for standard Arc transactions (0x + 64 hex chars)
  // Skip verification for unified balance payments which use cross-chain hashes
  const isStandardHash = /^0x[0-9a-fA-F]{64}$/.test(txHash);
  let verificationPassed = false;

  if (isStandardHash) {
    try {
      const expectedPaymentAddress = isStealthLink
        ? link.stealthAddress!.toLowerCase()
        : link.recipientAddress.toLowerCase();

      const tx = await arcPublicClient.getTransaction({
        hash: txHash as `0x${string}`,
      });

      if (tx && tx.blockNumber) {
        const txTo = tx.to?.toLowerCase();

        if (txTo !== expectedPaymentAddress) {
          return NextResponse.json(
            { error: `Transaction sent to wrong address. Expected ${expectedPaymentAddress}, got ${txTo}.` },
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
          { error: "Transaction is still pending. Please wait and try again." },
          { status: 400 }
        );
      }
    } catch (err: any) {
      console.warn("[PATCH] On-chain verification skipped:", err?.message);
    }
  } else {
    // Unified balance payment — trust the client, skip on-chain check
    console.log(`[PATCH] Unified payment hash detected: ${txHash} — skipping Arc verification`);
    verificationPassed = true;
  }

  // Mark as COMPLETED
  await db.paymentLink.update({
    where: { id: params.linkId },
    data: {
      status: "COMPLETED",
      txHash,
      paidBy: paidBy ? paidBy.toLowerCase() : null,
      paidAt: new Date(),
    },
  });

  console.log(`[PATCH] Marked COMPLETED. isStealthLink=${isStealthLink}`);

  return NextResponse.json({
    success: true,
    link: {
      id: link.id,
      title: link.title,
      amount: link.amount,
      status: "COMPLETED",
      txHash,
      isStealthLink,
    },
    verified: verificationPassed,
    requiresForward: isStealthLink,
    message: isStealthLink
      ? "Payment received. Forwarding in progress..."
      : "Payment received and confirmed.",
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const link = await db.paymentLink.findUnique({ where: { id: params.linkId } });
  if (!link) return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
  if (link.status === "COMPLETED") {
    return NextResponse.json({ error: "Cannot cancel a completed payment." }, { status: 409 });
  }
  const updated = await db.paymentLink.update({
    where: { id: params.linkId },
    data: { status: "EXPIRED" },
  });
  return NextResponse.json({ success: true, link: updated });
}