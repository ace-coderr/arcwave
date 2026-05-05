import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EscrowPayPage } from "@/components/EscrowPayPage";
import type { Metadata } from "next";

interface PageProps { params: { linkId: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const escrow = await db.escrowLink.findUnique({ where: { id: params.linkId } });
  if (!escrow) return { title: "Escrow Not Found — Conduit" };
  return { title: `Escrow: ${escrow.amount} USDC — ${escrow.title} | Conduit` };
}

export default async function EscrowBuyerPage({ params }: PageProps) {
  const escrow = await db.escrowLink.findUnique({ where: { id: params.linkId } });
  if (!escrow) return notFound();

  // Auto-release if past deadline
  if (escrow.status === "HOLDING" && escrow.releaseDeadline && new Date(escrow.releaseDeadline) <= new Date()) {
    await db.escrowLink.update({
      where: { id: escrow.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    escrow.status = "CONFIRMED";
    // Trigger release
    fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/api/escrow/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escrowId: escrow.id }),
    }).catch(console.error);
  }

  return (
    <EscrowPayPage
      escrow={{
        id: escrow.id,
        title: escrow.title,
        description: escrow.description ?? undefined,
        amount: escrow.amount,
        sellerAddress: escrow.sellerAddress,
        stealthAddress: escrow.stealthAddress,
        status: escrow.status,
        txHash: escrow.txHash ?? undefined,
        paidAt: escrow.paidAt?.toISOString() ?? undefined,
        releaseDeadline: escrow.releaseDeadline?.toISOString() ?? undefined,
        confirmedAt: escrow.confirmedAt?.toISOString() ?? undefined,
        disputedAt: escrow.disputedAt?.toISOString() ?? undefined,
      }}
    />
  );
}
