import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidAddress } from "@/lib/utils";
import { generateStealthWallet } from "@/lib/stealthWallet";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !isValidAddress(address)) {
    return NextResponse.json(
      { error: "A valid wallet address is required." },
      { status: 400 }
    );
  }

  const links = await db.paymentLink.findMany({
    where: { recipientAddress: address.toLowerCase() },
    orderBy: { createdAt: "desc" },
    take: 100,
    // Never return the encrypted private key to the client
    select: {
      id: true,
      title: true,
      description: true,
      amount: true,
      recipientAddress: true,
      stealthAddress: true,
      forwardTxHash: true,
      status: true,
      txHash: true,
      paidBy: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
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

  const { title, amount, description, recipientAddress } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  }
  if (!recipientAddress || !isValidAddress(recipientAddress)) {
    return NextResponse.json({ error: "A valid recipient wallet address is required." }, { status: 400 });
  }

  try {
    // Generate a fresh stealth wallet for this payment link
    // Payer will send to stealthAddress — funds forwarded to recipientAddress
    const { address: stealthAddress, encryptedPrivateKey } = generateStealthWallet();

    const link = await db.paymentLink.create({
      data: {
        title: title.trim(),
        amount: parseFloat(amount).toString(),
        description: description?.trim() || null,
        recipientAddress: recipientAddress.toLowerCase(),
        stealthAddress,
        stealthPrivateKey: encryptedPrivateKey,
        status: "ACTIVE",
      },
      // Return safe fields only — never return the private key
      select: {
        id: true,
        title: true,
        description: true,
        amount: true,
        recipientAddress: true,
        stealthAddress: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (err: any) {
    console.error("DB error:", err);
    return NextResponse.json(
      { error: "Database error: " + err.message },
      { status: 500 }
    );
  }
}
