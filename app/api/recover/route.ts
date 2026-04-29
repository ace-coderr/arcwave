// app/api/recover/route.ts
// Secure recovery route - only callable server-side with RECOVER_TOKEN
// NOT exposed to frontend — call via Vercel Functions log or curl only

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forwardFunds } from "@/lib/stealthWallet";

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Use a separate RECOVER_TOKEN — not STEALTH_SECRET
  // This way even if someone sees the recovery call, they can't decrypt private keys
  const recoverToken = process.env.RECOVER_TOKEN;
  if (!recoverToken || body.token !== recoverToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all completed stealth links not yet forwarded
  const stuckLinks = await db.paymentLink.findMany({
    where: {
      status: "COMPLETED",
      stealthPrivateKey: { not: null },
      forwardTxHash: null,
    },
  });

  console.log(`[RECOVER] Found ${stuckLinks.length} stuck stealth links`);

  const results = [];

  for (const link of stuckLinks) {
    if (!link.stealthPrivateKey || !link.recipientAddress) {
      results.push({ id: link.id, success: false, error: "Missing keys" });
      continue;
    }

    const result = await forwardFunds(
      link.stealthPrivateKey,
      link.recipientAddress,
      link.amount
    );

    if (result.success && result.txHash) {
      await db.paymentLink.update({
        where: { id: link.id },
        data: { forwardTxHash: result.txHash },
      });
    }

    results.push({
      id: link.id,
      title: link.title,
      amount: link.amount,
      success: result.success,
      forwardTxHash: result.txHash,
      error: result.error,
    });

    await new Promise(r => setTimeout(r, 1000));
  }

  return NextResponse.json({ processed: results.length, results });
}
