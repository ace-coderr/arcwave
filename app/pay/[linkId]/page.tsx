import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PayPage } from "@/components/PayPage";
import { calculateFee } from "@/lib/fees";
import type { Metadata } from "next";

interface PageProps { params: { linkId: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const link = await db.paymentLink.findUnique({ where: { id: params.linkId } });
  if (!link) return { title: "Payment Not Found — Conduit" };
  return { title: `Pay ${link.amount} USDC — ${link.title} | Conduit` };
}

export default async function PayPageRoute({ params }: PageProps) {
  const link = await db.paymentLink.findUnique({ where: { id: params.linkId } });
  if (!link) return notFound();

  const feeInfo = calculateFee(link.amount);

  return (
    <PayPage
      link={{
        id: link.id,
        title: link.title,
        description: link.description ?? undefined,
        amount: link.amount,
        stealthAddress: link.stealthAddress ?? null,
        recipientAddress: link.recipientAddress,
        status: link.status,
        txHash: link.txHash ?? undefined,
      }}
      fee={feeInfo}
    />
  );
}
