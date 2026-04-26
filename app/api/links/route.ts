import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidAddress } from "@/lib/utils";

// ─── GET: Fetch all links for a wallet address ────────────────────────────────
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !isValidAddress(address)) {
    return NextResponse.json(
      { error: "A valid wallet address is required." },
      { status: 400 }
    );
  }

  const normalizedAddress = address.toLowerCase();

  const links = await db.paymentLink.findMany({
    where: { recipientAddress: normalizedAddress },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ links });
}

// ─── POST: Create a new payment link ─────────────────────────────────────────
// Links no longer expire by time — they expire only after one successful payment
export async function POST(req: NextRequest) {
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { title, amount, description, recipientAddress } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive number." },
      { status: 400 }
    );
  }

  if (!recipientAddress || !isValidAddress(recipientAddress)) {
    return NextResponse.json(
      { error: "A valid recipient wallet address is required." },
      { status: 400 }
    );
  }

  const link = await db.paymentLink.create({
    data: {
      title: title.trim(),
      amount: parseFloat(amount).toString(),
      description: description?.trim() || null,
      recipientAddress: recipientAddress.toLowerCase(),
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ link }, { status: 201 });
}
