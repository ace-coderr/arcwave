import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      fontFamily: "Sora, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      textAlign: "center",
    }}>
      {/* Logo */}
      <img
        src="/conduit-logo-white.png"
        alt="Conduit"
        style={{ height: 40, width: "auto", marginBottom: 48, objectFit: "contain" }}
      />

      {/* 404 */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--stroke)",
        borderRadius: "var(--r-xl)",
        padding: "48px 40px",
        maxWidth: 420,
        width: "100%",
        boxShadow: "var(--elev-2)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ height: 2, background: "var(--c)", position: "absolute", top: 0, left: 0, right: 0 }}/>

        {/* Icon */}
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--c-dim)", border: "1.5px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
            <path d="M9.172 14.828L12 12m0 0l2.828-2.828M12 12L9.172 9.172M12 12l2.828 2.828M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="var(--c)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <p style={{ fontSize: 64, fontWeight: 900, color: "var(--ink-1)", lineHeight: 1, letterSpacing: "-.06em", fontFamily: "IBM Plex Mono, monospace", marginBottom: 8 }}>404</p>
        <p style={{ fontSize: 18, fontWeight: 800, color: "var(--ink-1)", marginBottom: 10, letterSpacing: "-.02em" }}>Page not found</p>
        <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.6, marginBottom: 32 }}>
          This page doesn't exist or the link has expired. Check the URL or head back home.
        </p>

        <Link
          href="/"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", background: "var(--c)", borderRadius: "var(--r-md)", fontSize: 14, fontWeight: 800, color: "#000", textDecoration: "none", boxShadow: "0 4px 16px rgba(0,229,160,.35)" }}
        >
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <path d="M10 2H6L2 8l4 6h4l4-6-4-6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
          Back to Conduit
        </Link>
      </div>

      <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 24, fontFamily: "IBM Plex Mono, monospace" }}>
        conduit-pay.vercel.app
      </p>
    </div>
  );
}
