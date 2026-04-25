import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidAddress } from "@/lib/utils";

const EXPIRY_MINUTES = 30;

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address || !isValidAddress(address)) {
    return NextResponse.json({ error: "A valid wallet address is required." }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();
  const now = new Date();

  // Auto-expire any active links past their expiry time
  await db.paymentLink.updateMany({
    where: { recipientAddress: normalizedAddress, status: "ACTIVE", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });

  const links = await db.paymentLink.findMany({
    where: { recipientAddress: normalizedAddress },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ links });
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const { title, amount, description, recipientAddress } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  }
  if (!recipientAddress || !isValidAddress(recipientAddress)) {
    return NextResponse.json({ error: "A valid recipient wallet address is required." }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

  const link = await db.paymentLink.create({
    data: {
      title: title.trim(),
      amount: parseFloat(amount).toString(),
      description: description?.trim() || null,
      recipientAddress: recipientAddress.toLowerCase(),
      status: "ACTIVE",
      expiresAt,
    },
  });

  return NextResponse.json({ link }, { status: 201 });
}
