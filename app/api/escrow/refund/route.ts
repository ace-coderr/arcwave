import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forwardFunds } from "@/lib/stealthWallet";

const ADMIN_WALLET = "0x8557fabdc62f59a1ba7d6a74aaf0942cdcb68f69";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  if (wallet !== ADMIN_WALLET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const { escrowId } = body;
  if (!escrowId) return NextResponse.json({ error: "escrowId is required." }, { status: 400 });

  const escrow = await db.escrowLink.findUnique({ where: { id: escrowId } });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });
  if (escrow.status !== "DISPUTED") {
    return NextResponse.json({ error: "Can only refund disputed escrows." }, { status: 400 });
  }
  if (!escrow.buyerAddress) {
    return NextResponse.json({ error: "No buyer address found." }, { status: 400 });
  }
  if (escrow.releaseTxHash) {
    return NextResponse.json({ success: true, alreadyResolved: true });
  }

  console.log(`[escrow refund] Refunding ${escrow.amount} USDC to buyer ${escrow.buyerAddress}`);

  const result = await forwardFunds(
    escrow.stealthPrivateKey,
    escrow.buyerAddress,
    escrow.amount,
  );

  if (result.success && result.txHash) {
    await db.escrowLink.update({
      where: { id: escrowId },
      data: { status: "CANCELLED", releaseTxHash: result.txHash },
    });
    return NextResponse.json({ success: true, refundTxHash: result.txHash });
  }

  console.error(`[escrow refund] Failed: ${result.error}`);
  return NextResponse.json({ success: false, error: result.error }, { status: 500 });
}
