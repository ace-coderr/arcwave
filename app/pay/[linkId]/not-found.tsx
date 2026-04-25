import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pay-page">
      <div className="pay-card">
        <div className="pay-card-top-line" style={{ background: "linear-gradient(90deg,#ef4444,#f59e0b)" }} />
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>Link Not Found</h1>
          <p style={{ fontSize: 13, color: "#8b90b0", marginBottom: 20 }}>
            This payment link doesn&apos;t exist or may have been deleted.
          </p>
          <Link href="/" style={{ fontSize: 13, color: "#60a5fa", textDecoration: "none" }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
