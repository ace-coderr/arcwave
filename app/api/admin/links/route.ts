import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ADMIN_WALLET = "0x8557fabdc62f59a1ba7d6a74aaf0942cdcb68f69";

export async function GET(req: NextRequest) {
  // Verify admin wallet from header
  const wallet = req.headers.get("x-wallet-address")?.toLowerCase();

  // Also allow query param for client-side fetches
  const { searchParams } = new URL(req.url);
  const queryWallet = searchParams.get("wallet")?.toLowerCase();

  // const caller = wallet ?? queryWallet ?? "";

  // if (caller !== ADMIN_WALLET) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    const links = await db.paymentLink.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        amount: true,
        status: true,
        recipientAddress: true,
        stealthAddress: true,
        txHash: true,
        paidBy: true,
        paidAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ links });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
