import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    if (!address) return NextResponse.json({ error: "Address required." }, { status: 400 });

    const escrows = await db.escrowLink.findMany({
        where: {
            buyerAddress: address.toLowerCase(),
            status: { in: ["HOLDING", "DISPUTED", "MEDIATION"] },
        },
        orderBy: { paidAt: "desc" },
        select: { id: true, title: true, amount: true, paidAt: true, status: true },
    });

    return NextResponse.json({ escrows });
}