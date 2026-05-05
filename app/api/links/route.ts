import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateStealthWallet } from "@/lib/stealthWallet";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required." }, { status: 400 });
  }

  const links = await db.paymentLink.findMany({
    where: { recipientAddress: address.toLowerCase() },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      amount: true,
      recipientAddress: true,
      stealthAddress: true,
      status: true,
      txHash: true,
      forwardTxHash: true,
      paidBy: true,
      paidAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ links });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { title, amount, description, recipientAddress, stealthMode } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!recipientAddress) {
    return NextResponse.json({ error: "Recipient address is required." }, { status: 400 });
  }

  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) {
    return NextResponse.json({ error: "Enter a valid amount greater than 0." }, { status: 400 });
  }

  let stealthAddress: string | undefined;
  let stealthPrivateKey: string | undefined;

  if (stealthMode) {
    const wallet = generateStealthWallet();
    stealthAddress = wallet.address;
    stealthPrivateKey = wallet.encryptedPrivateKey;
  }

  const link = await db.paymentLink.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      amount: parsed.toString(),
      recipientAddress: recipientAddress.toLowerCase(),
      stealthAddress: stealthAddress ?? null,
      stealthPrivateKey: stealthPrivateKey ?? null,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ link }, { status: 201 });
}
