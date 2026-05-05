import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forwardFunds } from "@/lib/stealthWallet";

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }

  const { escrowId } = body;
  if (!escrowId) return NextResponse.json({ error: "escrowId is required." }, { status: 400 });

  const escrow = await db.escrowLink.findUnique({ where: { id: escrowId } });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });
  if (!["CONFIRMED"].includes(escrow.status)) {
    return NextResponse.json({ error: "Escrow must be CONFIRMED before release." }, { status: 400 });
  }
  if (escrow.releaseTxHash) {
    return NextResponse.json({ success: true, alreadyReleased: true, releaseTxHash: escrow.releaseTxHash });
  }

  console.log(`[escrow release] Releasing ${escrow.amount} USDC to ${escrow.sellerAddress}`);

  const result = await forwardFunds(
    escrow.stealthPrivateKey,
    escrow.sellerAddress,
    escrow.amount,
  );

  if (result.success && result.txHash) {
    await db.escrowLink.update({
      where: { id: escrowId },
      data: { status: "RELEASED", releaseTxHash: result.txHash },
    });
    return NextResponse.json({ success: true, releaseTxHash: result.txHash });
  }

  console.error(`[escrow release] Failed: ${result.error}`);
  return NextResponse.json({ success: false, error: result.error }, { status: 500 });
}
