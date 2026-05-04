export function PnlCardImage({
  totalEarned, completed, completionRate, avgPayment, biggestPayment, shortAddr, today
}: {
  totalEarned: number; completed: number; completionRate: number;
  avgPayment: number; biggestPayment: number; shortAddr: string; today: string;
}) {
  const fmt = (n: number) => n.toFixed(2);

  return (
    <div style={{ width: 800, height: 420, background: "#08090e", display: "flex", flexDirection: "column", fontFamily: "monospace", overflow: "hidden", position: "relative" }}>

      {/* ── Large centered icon as background stamp ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://conduit-pay.vercel.app/favicon.png"
        alt=""
        width={340}
        height={340}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0.06,
          objectFit: "contain",
          pointerEvents: "none",
        }}
      />

      {/* Green glow behind icon */}
      <div style={{ position: "absolute", top: "50%", left: "50%", width: 400, height: 400, background: "radial-gradient(ellipse, rgba(0,229,160,0.07) 0%, transparent 70%)", display: "flex", transform: "translate(-50%, -50%)" }} />

      {/* Top bar */}
      <div style={{ width: "100%", height: 3, background: "#00E5A0", display: "flex", flexShrink: 0 }} />

      <div style={{ flex: 1, padding: "28px 44px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>

        {/* Header — logo left, network + date right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://conduit-pay.vercel.app/conduit-logo-white.png"
            alt="Conduit"
            width={120}
            height={36}
            style={{ objectFit: "contain" }}
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,229,160,0.1)", border: "1px solid rgba(0,229,160,0.22)", borderRadius: 20, padding: "4px 12px" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E5A0", display: "flex" }} />
              <span style={{ fontSize: 11, color: "#00E5A0", letterSpacing: "0.08em", fontWeight: 700 }}>ARC TESTNET</span>
            </div>
            <span style={{ fontSize: 10, color: "#424d5e", marginTop: 4 }}>{today}</span>
          </div>
        </div>

        {/* Main earnings */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 12, color: "#8892a4", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8, textTransform: "uppercase" }}>Total Earned</span>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
            <span style={{ fontSize: 72, fontWeight: 900, color: "#00E5A0", lineHeight: 1, letterSpacing: "-0.04em" }}>{fmt(totalEarned)}</span>
            <span style={{ fontSize: 24, color: "#00E5A0", fontWeight: 700, marginBottom: 10 }}>USDC</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
          {[
            { label: "PAYMENTS", value: completed.toString() },
            { label: "COMPLETION", value: `${completionRate}%` },
            { label: "AVG PAYMENT", value: `${fmt(avgPayment)} USDC` },
            { label: "BIGGEST", value: `${fmt(biggestPayment)} USDC` },
          ].map((s, i) => (
            <div key={s.label} style={{ flex: 1, display: "flex", flexDirection: "column", paddingLeft: i === 0 ? 0 : 24, borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)", marginLeft: i === 0 ? 0 : 24 }}>
              <span style={{ fontSize: 9, color: "#424d5e", letterSpacing: "0.14em", fontWeight: 600, marginBottom: 6 }}>{s.label}</span>
              <span style={{ fontSize: 20, color: "#f8fafc", fontWeight: 800, letterSpacing: "-0.02em" }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#424d5e", letterSpacing: "0.06em" }}>{shortAddr}</span>
          <span style={{ fontSize: 11, color: "#424d5e", letterSpacing: "0.04em" }}>conduit-pay.vercel.app</span>
        </div>

      </div>

      {/* Bottom bar */}
      <div style={{ width: "100%", height: 2, background: "#00E5A0", display: "flex", flexShrink: 0, opacity: 0.35 }} />
    </div>
  );
}