// app/api/recover/route.ts
// Emergency route to manually forward funds stuck in stealth wallets.
// Only works for COMPLETED links that have stealthPrivateKey but no forwardTxHash.
// Call this with: POST /api/recover { secret: "your_stealth_secret" }

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forwardFunds } from "@/lib/stealthWallet";

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Simple auth — require the STEALTH_SECRET to prevent abuse
  if (body.secret !== process.env.STEALTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all completed stealth links that haven't been forwarded yet
  const stuckLinks = await db.paymentLink.findMany({
    where: {
      status: "COMPLETED",
      stealthPrivateKey: { not: null },
      forwardTxHash: null, // not yet forwarded
    },
  });

  console.log(`[RECOVER] Found ${stuckLinks.length} stuck stealth links`);

  const results = [];

  for (const link of stuckLinks) {
    console.log(`[RECOVER] Processing link ${link.id} — stealth: ${link.stealthAddress}`);

    if (!link.stealthPrivateKey || !link.recipientAddress) {
      results.push({ id: link.id, success: false, error: "Missing keys" });
      continue;
    }

    const result = await forwardFunds(link.stealthPrivateKey, link.recipientAddress);

    if (result.success && result.txHash) {
      await db.paymentLink.update({
        where: { id: link.id },
        data: { forwardTxHash: result.txHash },
      });
      console.log(`[RECOVER] Forwarded ${link.id}: ${result.txHash}`);
    }

    results.push({
      id: link.id,
      title: link.title,
      amount: link.amount,
      stealthAddress: link.stealthAddress,
      success: result.success,
      forwardTxHash: result.txHash,
      error: result.error,
    });

    // Small delay between forwards
    await new Promise(r => setTimeout(r, 1000));
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
