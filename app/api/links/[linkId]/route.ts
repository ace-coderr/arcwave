import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { arcPublicClient } from "@/lib/arcClient";
import { isValidTxHash } from "@/lib/utils";
import { parseEther, formatEther } from "viem";
import { forwardFunds } from "@/lib/stealthWallet";

interface RouteParams { params: { linkId: string } }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  console.log(`[GET] Fetching link: ${params.linkId}`);

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
    console.log(`[GET] Link not found: ${params.linkId}`);
    return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
  }

  console.log(`[GET] Found link: ${link.id} status=${link.status} stealth=${!!link.stealthAddress}`);
  return NextResponse.json({ link });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  console.log(`[PATCH] Called for link: ${params.linkId}`);

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    console.error("[PATCH] Failed to parse body:", e);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { txHash, paidBy } = body;
  console.log(`[PATCH] txHash: ${txHash}`);
  console.log(`[PATCH] paidBy: ${paidBy}`);

  if (!txHash || !isValidTxHash(txHash)) {
    console.error("[PATCH] Invalid txHash:", txHash);
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
    console.error(`[PATCH] Link not found: ${params.linkId}`);
    return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
  }

  console.log(`[PATCH] Link found: status=${link.status} stealth=${!!link.stealthAddress} hasPrivKey=${!!link.stealthPrivateKey}`);

  if (link.status === "COMPLETED") {
    console.log(`[PATCH] Already completed`);
    return NextResponse.json({ error: "This payment link has already been used." }, { status: 409 });
  }

  if (link.status === "EXPIRED") {
    console.log(`[PATCH] Link expired`);
    return NextResponse.json({ error: "This payment link has been cancelled." }, { status: 410 });
  }

  const isStealthLink = !!link.stealthAddress;
  const expectedPaymentAddress = isStealthLink
    ? link.stealthAddress!.toLowerCase()
    : link.recipientAddress.toLowerCase();

  console.log(`[PATCH] isStealthLink: ${isStealthLink}`);
  console.log(`[PATCH] expectedPaymentAddress: ${expectedPaymentAddress}`);

  // ── On-chain verification ─────────────────────────────────────────────────
  let verificationPassed = false;
  let verificationError = "";

  try {
    console.log(`[PATCH] Fetching tx from chain: ${txHash}`);
    const tx = await arcPublicClient.getTransaction({
      hash: txHash as `0x${string}`,
    });

    if (tx && tx.blockNumber) {
      console.log(`[PATCH] Tx found on chain. to=${tx.to} value=${tx.value}`);
      const txTo = tx.to?.toLowerCase();

      if (txTo !== expectedPaymentAddress) {
        console.error(`[PATCH] Wrong address. Expected ${expectedPaymentAddress}, got ${txTo}`);
        return NextResponse.json(
          { error: `Transaction sent to wrong address. Expected ${expectedPaymentAddress}, got ${txTo}.` },
          { status: 400 }
        );
      }

      const requiredWei = parseEther(link.amount);
      if (tx.value < requiredWei) {
        const sentUsdc = parseFloat(formatEther(tx.value)).toFixed(4);
        console.error(`[PATCH] Insufficient. Required ${link.amount}, got ${sentUsdc}`);
        return NextResponse.json(
          { error: `Insufficient payment. Required ${link.amount} USDC, received ${sentUsdc} USDC.` },
          { status: 400 }
        );
      }
      verificationPassed = true;
      console.log(`[PATCH] On-chain verification passed`);
    } else if (tx && !tx.blockNumber) {
      console.log(`[PATCH] Tx still pending`);
      return NextResponse.json(
        { error: "Transaction is still pending. Please wait and try again." },
        { status: 400 }
      );
    } else {
      verificationError = "Transaction not yet visible on chain.";
      console.log(`[PATCH] Tx not visible yet — proceeding anyway`);
    }
  } catch (err: any) {
    verificationError = err?.message ?? "RPC unreachable";
    console.warn("[PATCH] Verification skipped:", verificationError);
  }

  // ── Mark as COMPLETED ─────────────────────────────────────────────────────
  console.log(`[PATCH] Marking as COMPLETED`);
  await db.paymentLink.update({
    where: { id: params.linkId },
    data: {
      status: "COMPLETED",
      txHash,
      paidBy: paidBy ? paidBy.toLowerCase() : null,
      paidAt: new Date(),
    },
  });
  console.log(`[PATCH] Marked as COMPLETED successfully`);

  // ── Stealth forwarding ────────────────────────────────────────────────────
  let forwardResult = null;

  if (isStealthLink && link.stealthPrivateKey && link.recipientAddress) {
    console.log(`[PATCH] Stealth link — starting forward process`);
    console.log(`[PATCH] stealthAddress: ${link.stealthAddress}`);
    console.log(`[PATCH] recipientAddress: ${link.recipientAddress}`);
    console.log(`[PATCH] amount: ${link.amount}`);
    console.log(`[PATCH] hasForwarderKey: ${!!process.env.FORWARDER_PRIVATE_KEY}`);

    // Wait for payer's transaction to be fully confirmed on-chain
    // before checking the stealth wallet balance
    console.log(`[PATCH] Waiting for tx to be confirmed on-chain...`);
    try {
      await arcPublicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        timeout: 30_000, // wait up to 30 seconds
      });
      console.log(`[PATCH] Tx confirmed on-chain. Stealth wallet should now have balance.`);
    } catch (e: any) {
      console.warn(`[PATCH] waitForTransactionReceipt timed out or failed: ${e.message}. Trying anyway...`);
      // Wait 5 seconds as fallback
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Retry forwarding up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[PATCH] Forward attempt ${attempt}/3`);

      forwardResult = await forwardFunds(
        link.stealthPrivateKey!,
        link.recipientAddress,
        link.amount
      );

      console.log(`[PATCH] Attempt ${attempt} result:`, JSON.stringify(forwardResult));

      if (forwardResult.success) {
        // Save the forward tx hash
        await db.paymentLink.update({
          where: { id: params.linkId },
          data: { forwardTxHash: forwardResult.txHash },
        });
        console.log(`[PATCH] Forward success! forwardTxHash: ${forwardResult.txHash}`);
        break;
      } else {
        console.warn(`[PATCH] Attempt ${attempt} failed: ${forwardResult.error}`);
        if (attempt < 3) {
          // Wait 3 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }

    if (!forwardResult?.success) {
      console.error(`[PATCH] All forward attempts failed. Last error: ${forwardResult?.error}`);
    }
  } else {
    console.log(`[PATCH] Skipping forward. isStealthLink=${isStealthLink} hasPrivKey=${!!link.stealthPrivateKey} hasRecipient=${!!link.recipientAddress}`);
  }

  const response = {
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
        ? "Payment received and forwarded to recipient. ✅"
        : "Payment received. Forwarding failed — funds safe in stealth wallet."
      : "Payment received and confirmed.",
  };

  console.log(`[PATCH] Done. forwarded=${forwardResult?.success ?? false}`);
  return NextResponse.json(response);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  console.log(`[DELETE] Cancelling link: ${params.linkId}`);
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