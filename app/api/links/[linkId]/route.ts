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
      stealthAddress: true,    // Show stealth address to payer — NOT real address
      status: true,
      txHash: true,
      forwardTxHash: true,
      createdAt: true,
      // recipientAddress — intentionally excluded from client response
      // stealthPrivateKey — never sent to client
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

  // Fetch full link including private key for forwarding
  const link = await db.paymentLink.findUnique({
    where: { id: params.linkId },
  });

  if (!link) {
    return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
  }

  if (link.status === "COMPLETED") {
    return NextResponse.json(
      { error: "This payment link has already been used." },
      { status: 409 }
    );
  }

  if (link.status === "EXPIRED") {
    return NextResponse.json(
      { error: "This payment link has been cancelled." },
      { status: 410 }
    );
  }

  // Determine which address to verify against
  // If stealth address exists, payment should go there
  // If not (old links), fall back to real recipient address
  const expectedPaymentAddress = (link.stealthAddress ?? link.recipientAddress).toLowerCase();

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

  // Mark as COMPLETED first so payer sees success immediately
  await db.paymentLink.update({
    where: { id: params.linkId },
    data: {
      status: "COMPLETED",
      txHash,
      paidBy: paidBy ? paidBy.toLowerCase() : null,
      paidAt: new Date(),
    },
  });

  // ── Auto-forward funds from stealth wallet to real recipient ─────────────
  // This runs after marking complete so the payer doesn't have to wait
  if (link.stealthPrivateKey && link.recipientAddress) {
    console.log(`[PATCH] Initiating stealth forward for link ${params.linkId}`);

    // Forward in background — don't await so payer gets instant response
    forwardFunds(link.stealthPrivateKey, link.recipientAddress)
      .then(async (result) => {
        if (result.success && result.txHash) {
          // Store the forwarding tx hash
          await db.paymentLink.update({
            where: { id: params.linkId },
            data: { forwardTxHash: result.txHash },
          });
          console.log(`[PATCH] Funds forwarded: ${result.txHash}`);
        } else {
          console.error(`[PATCH] Forward failed: ${result.error}`);
        }
      })
      .catch((err) => {
        console.error("[PATCH] Forward error:", err);
      });
  }

  // Return safe fields only
  const safeLink = {
    id: link.id,
    title: link.title,
    amount: link.amount,
    status: "COMPLETED",
    txHash,
  };

  return NextResponse.json({
    success: true,
    link: safeLink,
    verified: verificationPassed,
    message: "Payment received. Funds are being forwarded to recipient.",
  });
}

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
