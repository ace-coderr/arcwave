import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ADMIN_WALLET = "0x8557fabdc62f59a1ba7d6a74aaf0942cdcb68f69";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet")?.toLowerCase();

    if (wallet !== ADMIN_WALLET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const payments = await (db as any).x402Payment.findMany({
            orderBy: { settledAt: "desc" },
        });
        return NextResponse.json({ payments });
    } catch {
        return NextResponse.json({ payments: [] });
    }
}