"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
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
      const data = await res.json();
      const links: any[] = data.links ?? [];
      const completed = links.filter((l) => l.status === "COMPLETED");
      const totalEarned = completed.reduce((s, l) => s + parseFloat(l.amount || "0"), 0).toFixed(2);
      setStats({ totalLinks: links.length, completedLinks: completed.length, totalEarned });
    } catch {}
  }, [address]);

  useEffect(() => {
    if (isConnected && address) fetchStats();
  }, [isConnected, address, fetchStats, refreshTrigger]);

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <TopBar />
        <main className="page-content">

          {/* Loading */}
          {!mounted && (
            <div className="loading-center">
              <div className="page-spinner" />
            </div>
          )}

          {/* Not connected — full landing experience */}
          {mounted && !isConnected && (
            <div className="welcome-wrap">
              <div className="welcome-hero">

                {/* Hero card */}
                <div className="welcome-card animate-fade-up">
                  <div className="welcome-eyebrow">
                    <span className="welcome-eyebrow-dot pulse-dot" />
                    <span className="welcome-eyebrow-text">LIVE ON ARC TESTNET</span>
                  </div>

                  <h1 className="welcome-title">
                    The payment channel<br />
                    <span>for Web3</span>
                  </h1>

                  <p className="welcome-desc">
                    Create a payment link in seconds. Share it. Get paid in USDC
                    from any blockchain — no sign-ups, no KYC, no middlemen.
                  </p>

                  <button
                    className="welcome-connect-btn"
                    onClick={() => connect({ connector: injected() })}
                  >
                    Connect Wallet — It's Free
                  </button>

                  <div className="welcome-divider">
                    <span>or learn more below</span>
                  </div>

                  <div className="welcome-footer">
                    <p>
                      Need testnet USDC? &nbsp;
                      <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">
                        Circle Faucet →
                      </a>
                    </p>
                    <p className="welcome-network-note">Arc Testnet · Chain 5042002 · Native USDC gas</p>
                    <div className="welcome-social">
                      <a href="https://x.com/conduit_app" target="_blank" rel="noopener noreferrer" className="welcome-social-link">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.845L1.255 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        @conduit_app
                      </a>
                      <span style={{ color: "var(--border-mid)" }}>·</span>
                      <a href="https://t.me/conduit_community" target="_blank" rel="noopener noreferrer" className="welcome-social-link">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.94-.918c-.64-.203-.654-.64.136-.954l11.49-4.43c.532-.194.998.131.838.856z"/>
                        </svg>
                        Community
                      </a>
                    </div>
                  </div>
                </div>

                {/* How it works */}
                <div className="how-it-works animate-fade-up" style={{ animationDelay: "0.08s" }}>
                  <div className="how-it-works-grid">
                    {[
                      { n: "01", t: "Create a link", d: "Set a title, amount, and optionally enable stealth mode for privacy." },
                      { n: "02", t: "Share it anywhere", d: "Send via DM, email, invoice, or embed in your website." },
                      { n: "03", t: "Get paid instantly", d: "Payer connects wallet and pays — from Arc or any supported chain." },
                    ].map((s) => (
                      <div key={s.n} className="how-step-card">
                        <div className="how-step-num">{s.n}</div>
                        <div className="how-step-title">{s.t}</div>
                        <div className="how-step-desc">{s.d}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature tags */}
                <div className="features-row animate-fade-up" style={{ animationDelay: "0.16s" }}>
                  {["One-time use", "Stealth mode", "Multi-chain", "No KYC", "Sub-second", "Privacy first"].map((f) => (
                    <div key={f} className="feature-tag">
                      <span className="feature-tag-dot" />
                      <span className="feature-tag-text">{f}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* Connected dashboard */}
          {mounted && isConnected && (
            <>
              <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">
                  Manage your USDC payment links · Powered by Circle & Arc Network
                </p>
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
                        <svg viewBox="0 0 18 18" fill="none" width="14" height="14">
                          <circle cx="9" cy="9" r="7" stroke="var(--brand)" strokeWidth="1.5"/>
                          <path d="M9 5v4l2.5 2" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="quick-action-label">Get USDC</div>
                      <div className="quick-action-sub">Circle Testnet Faucet</div>
                    </a>
                    <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" className="quick-action-card">
                      <div className="quick-action-icon">
                        <svg viewBox="0 0 18 18" fill="none" width="14" height="14">
                          <circle cx="9" cy="9" r="7" stroke="var(--text-3)" strokeWidth="1.5"/>
                          <path d="M6 9h6M9 6v6" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="quick-action-label">Explorer</div>
                      <div className="quick-action-sub">ArcScan Testnet</div>
                    </a>
                  </div>
                </div>
                <PaymentLinksTable refreshTrigger={refreshTrigger} />
              </div>
            </>
          )}
        </main>

        <footer className="page-footer">
          <span>Conduit v0.1.0</span>
          <div className="footer-social">
            <a href="https://x.com/conduit_app" target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.845L1.255 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://t.me/conduit_community" target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.94-.918c-.64-.203-.654-.64.136-.954l11.49-4.43c.532-.194.998.131.838.856z"/>
              </svg>
            </a>
          </div>
          <span>Powered by Arc Network & Circle</span>
        </footer>
      </div>
    </div>
  );
}
