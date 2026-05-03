"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { NavBar } from "@/components/NavBar";
import { StatsRow } from "@/components/StatsRow";
import { CreateLinkForm } from "@/components/CreateLinkForm";
import { PaymentLinksTable } from "@/components/PaymentLinksTable";

export default function HomePage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({ totalLinks: 0, completedLinks: 0, totalEarned: "0" });
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  useEffect(() => { setMounted(true); }, []);

  const fetchStats = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/links?address=${address}`);
      if (!res.ok) return;
      const { links = [] } = await res.json();
      const done = links.filter((l: any) => l.status === "COMPLETED");
      const total = done.reduce((s: number, l: any) => s + parseFloat(l.amount || "0"), 0).toFixed(2);
      setStats({ totalLinks: links.length, completedLinks: done.length, totalEarned: total });
    } catch {}
  }, [address]);

  useEffect(() => {
    if (isConnected && address) fetchStats();
  }, [isConnected, address, fetchStats, refreshTrigger]);

  return (
    <div className="app">
      <NavBar />

      <div className="app-body">

        {/* Loading */}
        {!mounted && (
          <div className="loading-wrap">
            <div className="page-spinner" />
          </div>
        )}

        {/* ── Landing (not connected) ────────────────────────── */}
        {mounted && !isConnected && (
          <>
            <div className="landing fade-in">
              <div className="landing-inner">

                {/* Left: hero text */}
                <div>
                  <div className="hero-eyebrow">
                    <span className="hero-eyebrow-dot pulse-dot" />
                    <span className="hero-eyebrow-text">LIVE ON ARC TESTNET</span>
                  </div>

                  <h1 className="hero-title">
                    Send USDC.<br />
                    <em>No friction.</em><br />
                    Any chain.
                  </h1>

                  <p className="hero-desc">
                    Conduit turns your wallet into a payment page.
                    Create a link, share it, and receive USDC from anyone -
                    no accounts, no KYC, no waiting.
                  </p>

                  <div className="hero-cta">
                    <button
                      className="btn-hero"
                      onClick={() => connect({ connector: injected() })}
                    >
                      Get Started — It's Free
                    </button>
                    <a
                      href="https://faucet.circle.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-hero-ghost"
                    >
                      Get Testnet USDC →
                    </a>
                  </div>

                  <div className="trust-row">
                    {[
                      "One-time use",
                      "Stealth privacy",
                      "Multi-chain",
                      "No KYC",
                    ].map((t) => (
                      <div key={t} className="trust-item">
                        <span className="trust-icon">✓</span>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: demo pay card */}
                <div className="hero-card fade-up" style={{ animationDelay: ".1s" }}>
                  <div className="hero-card-bar" />
                  <div className="hero-card-head">
                    <div className="hero-card-label">PAYMENT REQUEST</div>
                    <div>
                      <span className="hero-card-amount">50.00</span>
                      <span className="hero-card-unit">USDC</span>
                    </div>
                    <div className="hero-card-title">Freelance Design Invoice</div>
                  </div>

                  <div className="hero-card-body">
                    <div className="hero-detail-row">
                      <span className="hero-detail-key">Pay to</span>
                      <span className="hero-detail-val">0xF51f••••••••6253</span>
                    </div>
                    <div className="hero-detail-row">
                      <span className="hero-detail-key">Network</span>
                      <span className="hero-detail-val">
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--c)", display: "inline-block" }} />
                        Arc Testnet
                      </span>
                    </div>
                    <div className="hero-detail-row">
                      <span className="hero-detail-key">Privacy</span>
                      <span className="hero-detail-val" style={{ color: "var(--c)", fontSize: 11 }}>🔒 Stealth mode</span>
                    </div>
                    <div className="hero-detail-row" style={{ marginTop: 4 }}>
                      <span className="hero-detail-key">Type</span>
                      <span className="hero-detail-val" style={{ color: "var(--warning)", fontSize: 11 }}>One-time use</span>
                    </div>
                  </div>

                  <div className="hero-card-foot">
                    <button className="btn-pay-demo">Pay 50.00 USDC</button>
                    <div className="demo-net">
                      <span className="demo-dot pulse-dot" />
                      <span className="demo-text">Arc Testnet · Chain 5042002</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px 60px", width: "100%" }}>
              <div className="steps">
                <div className="steps-title">HOW IT WORKS</div>
                <div className="steps-grid">
                  {[
                    { n: "01", t: "Create a link", d: "Set a title and USDC amount. Enable stealth mode to hide your real wallet address from the payer." },
                    { n: "02", t: "Share it", d: "Copy the link and send it via DM, email, invoice, or embed it anywhere. No website needed." },
                    { n: "03", t: "Get paid instantly", d: "Payer connects their wallet — from Arc or any supported chain — and pays. Funds arrive in seconds." },
                  ].map((s) => (
                    <div key={s.n} className="step-card">
                      <div className="step-num">{s.n}</div>
                      <div className="step-title">{s.t}</div>
                      <div className="step-desc">{s.d}</div>
                    </div>
                  ))}
                </div>

                <div className="features">
                  {["One-time use links", "Stealth mode privacy", "Multi-chain payments", "No sign-up required", "Sub-second settlement", "Open source", "Arc Network native"].map((f) => (
                    <div key={f} className="feat">
                      <span className="feat-dot" />{f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Connected dashboard ────────────────────────────── */}
        {mounted && isConnected && (
          <div className="page-wrap fade-in">
            <div className="page-header">
              <h1 className="page-title">Dashboard</h1>
              <p className="page-subtitle">Manage your USDC payment links · Powered by Circle & Arc Network</p>
            </div>

            <StatsRow
              totalLinks={stats.totalLinks}
              completedLinks={stats.completedLinks}
              totalEarned={stats.totalEarned}
            />

            <div className="dashboard-grid">
              <div className="dashboard-left">
                <CreateLinkForm onLinkCreated={() => setRefreshTrigger(n => n + 1)} />
                <div className="quick-actions-grid">
                  <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="quick-action-card">
                    <div className="quick-action-icon">
                      <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><circle cx="8" cy="8" r="6" stroke="var(--c)" strokeWidth="1.4"/><path d="M8 5v3l2 1.5" stroke="var(--c)" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    </div>
                    <div>
                      <div className="quick-action-label">Get USDC</div>
                      <div className="quick-action-sub">Circle Testnet Faucet</div>
                    </div>
                  </a>
                  <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" className="quick-action-card">
                    <div className="quick-action-icon">
                      <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><circle cx="8" cy="8" r="6" stroke="var(--ink-3)" strokeWidth="1.4"/><path d="M5 8h6M8 5v6" stroke="var(--ink-3)" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    </div>
                    <div>
                      <div className="quick-action-label">Explorer</div>
                      <div className="quick-action-sub">ArcScan Testnet</div>
                    </div>
                  </a>
                </div>
              </div>
              <PaymentLinksTable refreshTrigger={refreshTrigger} />
            </div>
          </div>
        )}
      </div>

      <footer className="app-footer">
        <span>Conduit v0.1.0</span>
        <div className="footer-links">
          <a href="https://x.com/conduit_pay" target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.845L1.255 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://t.me/conduit_app" target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.94-.918c-.64-.203-.654-.64.136-.954l11.49-4.43c.532-.194.998.131.838.856z"/></svg>
          </a>
        </div>
        <span>Built on Arc Network · Powered by Circle</span>
      </footer>
    </div>
  );
}
