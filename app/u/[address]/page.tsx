import { db } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

interface Props { params: { address: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const addr = params.address.toLowerCase();
  const count = await db.paymentLink.count({ where: { recipientAddress: addr, status: "COMPLETED" } });
  return {
    title: `${addr.slice(0, 6)}...${addr.slice(-4)} — Conduit Profile`,
    description: `${count} completed payments on Conduit`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const addr = params.address.toLowerCase();

  const links = await db.paymentLink.findMany({
    where: { recipientAddress: addr },
    orderBy: { createdAt: "desc" },
  });

  const completed = links.filter(l => l.status === "COMPLETED");
  const totalEarned = completed.reduce((s, l) => s + parseFloat(l.amount), 0);
  const completionRate = links.length > 0 ? Math.round((completed.length / links.length) * 100) : 0;
  const avgPayment = completed.length > 0 ? totalEarned / completed.length : 0;
  const biggestPayment = completed.length > 0 ? Math.max(...completed.map(l => parseFloat(l.amount))) : 0;

  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);
  const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

  const topLinks = [...completed].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Sora, sans-serif", padding: "40px 20px" }}>

      {/* Header */}
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Branding */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 32, width: "auto" }}/>
          </Link>
          <Link href="/" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none", fontFamily: "IBM Plex Mono, monospace" }}>
            conduit-pay.vercel.app
          </Link>
        </div>

        {/* Profile card */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-xl)", overflow: "hidden", boxShadow: "var(--elev-2)", marginBottom: 20 }}>
          <div style={{ height: 3, background: "var(--c)" }}/>

          {/* Identity */}
          <div style={{ padding: "28px 28px 22px", borderBottom: "1px solid var(--stroke)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--c-dim)", border: "1.5px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                  <circle cx="12" cy="8" r="4" stroke="var(--c)" strokeWidth="1.5"/>
                  <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" stroke="var(--c)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace" }}>
                  {addr.slice(0, 8)}...{addr.slice(-6)}
                </p>
                <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>Conduit Payment Profile</p>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "Total Earned", value: fmt(totalEarned), unit: "USDC", color: "var(--c)" },
                { label: "Payments", value: completed.length.toString(), unit: "", color: "var(--info)" },
                { label: "Completion", value: `${completionRate}%`, unit: "", color: "var(--warning)" },
                { label: "Avg Payment", value: fmt(avgPayment), unit: "USDC", color: "var(--c)" },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--raised)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "IBM Plex Mono, monospace", lineHeight: 1 }}>
                    {s.value}<span style={{ fontSize: 11, marginLeft: 2 }}>{s.unit}</span>
                  </p>
                  <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4, fontWeight: 600 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top payments */}
          {topLinks.length > 0 && (
            <div style={{ padding: "16px 28px 20px" }}>
              <p style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", letterSpacing: ".1em", marginBottom: 12, textTransform: "uppercase" }}>Top Payments</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topLinks.map((l, i) => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", width: 14, flexShrink: 0 }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</p>
                    </div>
                    <span style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "var(--c)", flexShrink: 0 }}>
                      {fmt(parseFloat(l.amount))} USDC
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 14 }}>
            Want to receive USDC payments like this?
          </p>
          <Link
            href="/"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "var(--c)", borderRadius: "var(--r-md)", fontSize: 14, fontWeight: 800, color: "#000", textDecoration: "none", boxShadow: "0 4px 16px rgba(0,229,160,.35)" }}
          >
            Create your Conduit →
          </Link>
          <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 12, fontFamily: "IBM Plex Mono, monospace" }}>
            Free · No sign-up · Any chain
          </p>
        </div>

      </div>
    </div>
  );
}
