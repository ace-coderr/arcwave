import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { PnlCardImage } from "./card";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const address = searchParams.get("address") ?? "";

  if (!address) {
    return new Response("Missing address", { status: 400 });
  }

  let completed = 0;
  let totalEarned = 0;
  let avgPayment = 0;
  let biggestPayment = 0;
  let completionRate = 0;
  let totalLinks = 0;

  try {
    const res = await fetch(`${origin}/api/links?address=${address}`);
    const data = await res.json();
    const links: any[] = data.links ?? [];
    const done = links.filter((l: any) => l.status === "COMPLETED");

    totalLinks = links.length;
    completed = done.length;
    totalEarned = done.reduce((s: number, l: any) => s + parseFloat(l.amount), 0);
    avgPayment = completed > 0 ? totalEarned / completed : 0;
    biggestPayment = completed > 0 ? Math.max(...done.map((l: any) => parseFloat(l.amount))) : 0;
    completionRate = totalLinks > 0 ? Math.round((completed / totalLinks) * 100) : 0;
  } catch {
    // use defaults
  }

  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return new ImageResponse(
    PnlCardImage({ totalEarned, completed, completionRate, avgPayment, biggestPayment, shortAddr, today }),
    { width: 800, height: 420 }
  );
}