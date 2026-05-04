"use client";

import { useState } from "react";

interface PnlCardProps {
  address: string;
  totalEarned: number;
  completedCount: number;
  completionRate: number;
  avgPayment: number;
  biggestPayment: number;
}

export function PnlCard({
  address,
  totalEarned,
  completedCount,
  completionRate,
  avgPayment,
  biggestPayment,
}: PnlCardProps) {
  const [downloading, setDownloading] = useState(false);

  const fmt = (n: number) => n.toFixed(2);
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const downloadCard = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/og?address=${address}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conduit-pnl-${address.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ marginTop: 18 }}>
      {/* Preview card */}
      <div style={{
        background: "#08090e",
        borderRadius: "var(--r-xl)",
        overflow: "hidden",
        border: "1px solid rgba(0,229,160,.15)",
        boxShadow: "0 0 40px rgba(0,229,160,.08)",
        position: "relative",
        marginBottom: 14,
      }}>
        {/* Top bar */}
        <div style={{ height: 3, background: "var(--c)" }}/>

        <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 11, color: "#424d5e", letterSpacing: ".15em", fontFamily: "IBM Plex Mono, monospace", marginBottom: 2 }}>CONDUIT</p>
              <p style={{ fontSize: 10, color: "#424d5e", letterSpacing: ".12em", fontFamily: "IBM Plex Mono, monospace" }}>PAYMENT EARNINGS</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,229,160,.1)", border: "1px solid rgba(0,229,160,.22)", borderRadius: 20, padding: "3px 10px" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--c)" }}/>
                <span style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".08em" }}>ARC TESTNET</span>
              </div>
              <span style={{ fontSize: 9, color: "#424d5e", fontFamily: "IBM Plex Mono, monospace" }}>{today}</span>
            </div>
          </div>

          {/* Main number */}
          <div>
            <p style={{ fontSize: 11, color: "#8892a4", letterSpacing: ".06em", fontFamily: "IBM Plex Mono, monospace", marginBottom: 6 }}>TOTAL EARNED</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: "var(--c)", lineHeight: 1, letterSpacing: "-.04em", fontFamily: "IBM Plex Mono, monospace" }}>
                {fmt(totalEarned)}
              </span>
              <span style={{ fontSize: 18, color: "var(--c)", fontWeight: 700, marginBottom: 6, fontFamily: "IBM Plex Mono, monospace" }}>USDC</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.06)" }}>
            {[
              { label: "PAYMENTS", value: completedCount.toString() },
              { label: "COMPLETION", value: `${completionRate}%` },
              { label: "AVG PAYMENT", value: `${fmt(avgPayment)} USDC` },
              { label: "BIGGEST", value: `${fmt(biggestPayment)} USDC` },
            ].map((s, i) => (
              <div key={s.label} style={{ paddingLeft: i === 0 ? 0 : 20, borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,.06)", marginLeft: i === 0 ? 0 : 20 }}>
                <p style={{ fontSize: 8, color: "#424d5e", letterSpacing: ".14em", fontFamily: "IBM Plex Mono, monospace", marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: 16, color: "#f8fafc", fontWeight: 800, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "-.02em" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#424d5e", fontFamily: "IBM Plex Mono, monospace" }}>{shortAddr}</span>
            <span style={{ fontSize: 9, color: "#424d5e", fontFamily: "IBM Plex Mono, monospace" }}>conduit-pay.vercel.app</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ height: 2, background: "linear-gradient(90deg, transparent, var(--c), transparent)" }}/>
      </div>

      {/* Download button */}
      <button
        onClick={downloadCard}
        disabled={downloading}
        style={{
          width: "100%",
          padding: "13px",
          background: downloading ? "var(--raised)" : "var(--c)",
          border: "none",
          borderRadius: "var(--r-md)",
          color: downloading ? "var(--ink-2)" : "#000",
          fontSize: 14,
          fontWeight: 700,
          cursor: downloading ? "not-allowed" : "pointer",
          fontFamily: "Sora, sans-serif",
          transition: "all .15s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: downloading ? "none" : "0 4px 16px rgba(0,229,160,.35)",
        }}
      >
        {downloading ? (
          <>
            <div style={{ width: 14, height: 14, border: "2px solid var(--ink-3)", borderTopColor: "var(--ink-1)", borderRadius: "50%", animation: "spin .7s linear infinite" }}/>
            Generating...
          </>
        ) : (
          <>
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path d="M8 2v8M5 7l3 3 3-3M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Download PnL Card
          </>
        )}
      </button>
      <p style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 8 }}>
        PNG · 800×420px · Ready to share on X
      </p>
    </div>
  );
}
