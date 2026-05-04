import { db } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props { params: { address: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const addr = params.address.toLowerCase();
  const links = await db.paymentLink.findMany({ where: { recipientAddress: addr } });
  const completed = links.filter(l => l.status === "COMPLETED");
  const totalEarned = completed.reduce((s, l) => s + parseFloat(l.amount), 0);
  const short = `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return {
    title: `${short} — Conduit Payment Profile`,
    description: `${completed.length} payments · ${totalEarned.toFixed(2)} USDC earned on Conduit`,
    openGraph: {
      title: `${short} on Conduit`,
      description: `${completed.length} payments · ${totalEarned.toFixed(2)} USDC earned`,
      images: [`https://conduit-pay.vercel.app/api/og?address=${params.address}`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${short} on Conduit`,
      description: `${completed.length} payments · ${totalEarned.toFixed(2)} USDC earned`,
      images: [`https://conduit-pay.vercel.app/api/og?address=${params.address}`],
    },
  };
}

export default async function ProfilePage({ params }: Props) {
  const addr = params.address.toLowerCase();

  const links = await db.paymentLink.findMany({
    where: { recipientAddress: addr },
    orderBy: { createdAt: "desc" },
  });

  if (links.length === 0) return notFound();

  const completed = links.filter(l => l.status === "COMPLETED");
  const active = links.filter(l => l.status === "ACTIVE");
  const totalEarned = completed.reduce((s, l) => s + parseFloat(l.amount), 0);
  const completionRate = links.length > 0 ? Math.round((completed.length / links.length) * 100) : 0;
  const avgPayment = completed.length > 0 ? totalEarned / completed.length : 0;
  const biggestPayment = completed.length > 0 ? Math.max(...completed.map(l => parseFloat(l.amount))) : 0;

  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);
  const topLinks = [...completed].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Sora, sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Branding */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 36, width: "auto" }}/>
          </Link>
          <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>
            conduit-pay.vercel.app
          </span>
        </div>

        {/* Profile card */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-xl)", overflow: "hidden", boxShadow: "var(--elev-2)", marginBottom: 16 }}>
          <div style={{ height: 3, background: "var(--c)" }}/>

          {/* Identity */}
          <div style={{ padding: "28px 28px 24px", borderBottom: "1px solid var(--stroke)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--c-dim)", border: "1.5px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                  <circle cx="12" cy="8" r="4" stroke="var(--c)" strokeWidth="1.5"/>
                  <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" stroke="var(--c)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace", marginBottom: 4 }}>
                  {addr.slice(0, 8)}...{addr.slice(-6)}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 20, padding: "3px 10px" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--c)" }}/>
                    <span style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>ARC TESTNET</span>
                  </div>
                  {active.length > 0 && (
                    <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>
                      {active.length} active link{active.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { label: "Total Earned", value: fmt(totalEarned), unit: "USDC", color: "var(--c)" },
                { label: "Payments", value: completed.length.toString(), unit: "", color: "var(--info)" },
                { label: "Completion", value: `${completionRate}%`, unit: "", color: "var(--warning)" },
                { label: "Biggest", value: fmt(biggestPayment), unit: "USDC", color: "var(--c)" },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--raised)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
                  <p style={{ fontSize: 17, fontWeight: 800, color: s.color, fontFamily: "IBM Plex Mono, monospace", lineHeight: 1, marginBottom: 4 }}>
                    {s.value}<span style={{ fontSize: 10, marginLeft: 2, color: s.color }}>{s.unit}</span>
                  </p>
                  <p style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 600 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top payments */}
          {topLinks.length > 0 && (
            <div style={{ padding: "18px 28px 22px" }}>
              <p style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", letterSpacing: ".1em", marginBottom: 14, textTransform: "uppercase" }}>Top Payments</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {topLinks.map((l, i) => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--raised)", borderRadius: "var(--r-md)" }}>
                    <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", width: 18, flexShrink: 0, fontWeight: 700 }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", padding: "3px 10px", flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", fontWeight: 800, color: "var(--c)" }}>{fmt(parseFloat(l.amount))}</span>
                      <span style={{ fontSize: 9, color: "var(--c)", fontWeight: 700 }}>USDC</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Avg payment stat */}
        {completed.length > 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-lg)", padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>Avg payment</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace" }}>{fmt(avgPayment)} <span style={{ color: "var(--c)", fontSize: 11 }}>USDC</span></span>
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>
            Want to receive USDC payments like this?
          </p>
          <Link
            href="/"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", background: "var(--c)", borderRadius: "var(--r-md)", fontSize: 14, fontWeight: 800, color: "#000", textDecoration: "none", boxShadow: "0 4px 16px rgba(0,229,160,.35)" }}
          >
            Create your Conduit
            <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 10, fontFamily: "IBM Plex Mono, monospace" }}>
            Free · No sign-up · Any chain
          </p>
        </div>

      </div>
    </div>
  );
}
