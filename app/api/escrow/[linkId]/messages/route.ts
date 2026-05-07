import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ADMIN_WALLET = "0x8557fabdc62f59a1ba7d6a74aaf0942cdcb68f69";

interface RouteParams { params: { linkId: string } }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const messages = await db.escrowMessage.findMany({
    where: { escrowId: params.linkId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const { message, senderAddress } = body;
  if (!message?.trim()) return NextResponse.json({ error: "Message is required." }, { status: 400 });
  if (!senderAddress) return NextResponse.json({ error: "Sender address is required." }, { status: 400 });

  const escrow = await db.escrowLink.findUnique({ where: { id: params.linkId } });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });
  if (!["DISPUTED", "MEDIATION"].includes(escrow.status)) {
    return NextResponse.json({ error: "Can only message on disputed escrows." }, { status: 400 });
  }

  const addr = senderAddress.toLowerCase();
  const isAdmin = addr === ADMIN_WALLET.toLowerCase();
  const isBuyer = addr === escrow.buyerAddress?.toLowerCase();
  const isSeller = addr === escrow.sellerAddress?.toLowerCase();

  if (!isAdmin && !isBuyer && !isSeller) {
    return NextResponse.json({ error: "Not a party to this escrow." }, { status: 403 });
  }

  const sender = isAdmin ? "ADMIN" : isBuyer ? "BUYER" : "SELLER";

  // Create message
  const msg = await db.escrowMessage.create({
    data: {
      escrowId: params.linkId,
      sender,
      senderAddress: addr,
      message: message.trim(),
    },
  });

  // Track response timestamps + check if both sides have responded
  const now = new Date();
  const updateData: any = {};

  if (sender === "SELLER" && !escrow.sellerRespondedAt) {
    updateData.sellerRespondedAt = now;
  }
  if (sender === "BUYER") {
    updateData.buyerLastMessageAt = now;
  }

  // If both have responded and status is still DISPUTED → escalate to MEDIATION
  const sellerHasResponded = escrow.sellerRespondedAt || sender === "SELLER";
  const buyerHasResponded = escrow.buyerLastMessageAt || (sender === "BUYER" && escrow.disputedAt);

  if (sellerHasResponded && buyerHasResponded && escrow.status === "DISPUTED") {
    updateData.status = "MEDIATION";
    // Add system message
    await db.escrowMessage.create({
      data: {
        escrowId: params.linkId,
        sender: "SYSTEM",
        message: "Both parties have submitted their side. This dispute has been escalated to admin for review. A decision will be made within 24 hours.",
      },
    });
  }

  if (Object.keys(updateData).length > 0) {
    await db.escrowLink.update({ where: { id: params.linkId }, data: updateData });
  }

  return NextResponse.json({ message: msg }, { status: 201 });
}
