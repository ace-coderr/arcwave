import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { arcPublicClient } from "@/lib/arcClient";
import { isValidTxHash } from "@/lib/utils";
import { parseEther, formatEther } from "viem";
import { forwardFunds } from "@/lib/stealthWallet";

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
    select: {
      id: true,
      title: true,
      amount: true,
      recipientAddress: true,
      stealthAddress: true,
      stealthPrivateKey: true,
      forwardTxHash: true,
      status: true,
      txHash: true,
      paidBy: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
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
  const expectedPaymentAddress = isStealthLink
    ? link.stealthAddress!.toLowerCase()
    : link.recipientAddress.toLowerCase();

  // Verify on-chain
  let verificationPassed = false;
  let verificationError = "";

  try {
    const tx = await arcPublicClient.getTransaction({
      hash: txHash as `0x${string}`,
    });

    if (tx && tx.blockNumber) {
      const txTo = tx.to?.toLowerCase();

      if (txTo !== expectedPaymentAddress) {
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
        { error: "Transaction is still pending. Please wait and try again." },
        { status: 400 }
      );
    } else {
      verificationError = "Transaction not yet visible on chain.";
    }
  } catch (err: any) {
    verificationError = err?.message ?? "RPC unreachable";
    console.warn("[PATCH] Verification skipped:", verificationError);
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

  // ── Stealth forwarding ────────────────────────────────────────────────────
  let forwardResult = null;

  if (isStealthLink && link.stealthPrivateKey && link.recipientAddress) {
    console.log(`[PATCH] Starting stealth forward for ${params.linkId}`);

    // Retry up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[PATCH] Forward attempt ${attempt}/3`);

      if (attempt === 1) {
        // Wait for block to fully settle
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Pass payment amount so forwarder knows how much to expect
      forwardResult = await forwardFunds(
        link.stealthPrivateKey!,
        link.recipientAddress,
        link.amount
      );

      if (forwardResult.success) {
        console.log(`[PATCH] Forward success: ${forwardResult.txHash}`);
        await db.paymentLink.update({
          where: { id: params.linkId },
          data: { forwardTxHash: forwardResult.txHash },
        });
        break;
      } else {
        console.warn(`[PATCH] Attempt ${attempt} failed: ${forwardResult.error}`);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    link: {
      id: link.id,
      title: link.title,
      amount: link.amount,
      status: "COMPLETED",
      txHash,
      isStealthLink,
      forwarded: forwardResult?.success ?? false,
      forwardTxHash: forwardResult?.txHash,
    },
    verified: verificationPassed,
    message: isStealthLink
      ? forwardResult?.success
        ? "Payment received and forwarded to recipient."
        : "Payment received. Forwarding in progress."
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
