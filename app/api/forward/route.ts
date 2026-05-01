// app/api/forward/route.ts
// Handles stealth wallet forwarding as a separate fast API call.
// Called by the client AFTER payment is confirmed on-chain.
// Separated from PATCH to avoid Vercel 10-second function timeout.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forwardFunds } from "@/lib/stealthWallet";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const { linkId } = body;
  if (!linkId) {
    return NextResponse.json({ error: "linkId is required." }, { status: 400 });
  }

  console.log(`[FORWARD] Starting forward for link: ${linkId}`);

  const link = await db.paymentLink.findUnique({
    where: { id: linkId },
    select: {
      id: true,
      amount: true,
      recipientAddress: true,
      stealthAddress: true,
      stealthPrivateKey: true,
      forwardTxHash: true,
      status: true,
    },
  });

  if (!link) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  if (link.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Link must be COMPLETED before forwarding." },
      { status: 400 }
    );
  }

  // Already forwarded — return success
  if (link.forwardTxHash) {
    console.log(`[FORWARD] Already forwarded: ${link.forwardTxHash}`);
    return NextResponse.json({
      success: true,
      alreadyForwarded: true,
      forwardTxHash: link.forwardTxHash,
    });
  }

  if (!link.stealthAddress || !link.stealthPrivateKey || !link.recipientAddress) {
    return NextResponse.json(
      { error: "Not a stealth link or missing keys." },
      { status: 400 }
    );
  }

  console.log(`[FORWARD] stealthAddress: ${link.stealthAddress}`);
  console.log(`[FORWARD] recipient: ${link.recipientAddress}`);
  console.log(`[FORWARD] amount: ${link.amount}`);
  console.log(`[FORWARD] hasForwarderKey: ${!!process.env.FORWARDER_PRIVATE_KEY}`);

  const result = await forwardFunds(
    link.stealthPrivateKey,
    link.recipientAddress,
    link.amount
  );

  console.log(`[FORWARD] Result:`, JSON.stringify(result));

  if (result.success && result.txHash) {
    await db.paymentLink.update({
      where: { id: linkId },
      data: { forwardTxHash: result.txHash },
    });
    console.log(`[FORWARD] Saved forwardTxHash: ${result.txHash}`);
    return NextResponse.json({
      success: true,
      forwardTxHash: result.txHash,
      message: "Funds forwarded successfully.",
    });
  }

  console.error(`[FORWARD] Failed: ${result.error}`);
  return NextResponse.json({
    success: false,
    error: result.error,
  }, { status: 500 });
}
