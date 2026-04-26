import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pay-page">
      <div className="pay-card">
        <div className="pay-card-top-line" />
        <div className="pay-card-content">
          <div className="pay-icon">🔍</div>
          <h1 className="pay-notfound-title">Link Not Found</h1>
          <p className="pay-notfound-text">
            This payment link doesn&apos;t exist or may have been deleted.
          </p>
          <Link href="/" className="pay-back-link">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
