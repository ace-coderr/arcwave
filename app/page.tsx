"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { StatsRow } from "@/components/StatsRow";
import { CreateLinkForm } from "@/components/CreateLinkForm";
import { PaymentLinksTable } from "@/components/PaymentLinksTable";

interface LinkStats {
  totalLinks: number;
  completedLinks: number;
  totalEarned: string;
}

export default function HomePage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<LinkStats>({
    totalLinks: 0,
    completedLinks: 0,
    totalEarned: "0",
  });

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  useEffect(() => { setMounted(true); }, []);

  // Fetch stats whenever address changes or a new link is created/paid
  const fetchStats = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/links?address=${address}`);
      if (!res.ok) return;
      const data = await res.json();
      const links: any[] = data.links ?? [];

      const completed = links.filter((l) => l.status === "COMPLETED");
      const totalEarned = completed
        .reduce((sum, l) => sum + parseFloat(l.amount || "0"), 0)
        .toFixed(2);

      setStats({
        totalLinks: links.length,
        completedLinks: completed.length,
        totalEarned,
      });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) fetchStats();
  }, [isConnected, address, fetchStats, refreshTrigger]);

  const handleLinkCreated = () => {
    setRefreshTrigger((n) => n + 1);
    // stats will auto-refresh via the refreshTrigger useEffect above
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <TopBar />

        <main className="page-content">

          {/* Loading spinner */}
          {!mounted && (
            <div className="loading-center">
              <div className="page-spinner" />
            </div>
          )}

          {/* Not connected */}
          {mounted && !isConnected && (
            <div className="welcome-wrap">
              <div className="welcome-card">
                <div className="welcome-card-top-line" />
                <div className="welcome-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
                    <path
                      d="M3 17 C6 10, 10 6, 12 12 C14 18, 18 14, 21 7"
                      stroke="#60a5fa"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <h2 className="welcome-title">Welcome to ArcWave</h2>
                <p className="welcome-desc">
                  Generate shareable USDC payment links on Arc Network.
                  Connect your MetaMask wallet to get started.
                </p>
                <button
                  className="welcome-connect-btn"
                  onClick={() => connect({ connector: injected() })}
                >
                  Connect Wallet
                </button>
                <div className="welcome-footer">
                  <p>
                    Need testnet USDC?{" "}
                    <a
                      href="https://faucet.circle.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Get from faucet →
                    </a>
                  </p>
                  <p className="welcome-network-note">
                    Arc Testnet · Chain 5042002
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Connected — full dashboard */}
          {mounted && isConnected && (
            <>
              <div className="page-header">
                <h1 className="page-title">Payment Dashboard</h1>
                <p className="page-subtitle">
                  Generate and manage USDC payment links · Powered by Circle & Arc Network
                </p>
              </div>

              {/* Stats — now uses real data */}
              <StatsRow
                totalLinks={stats.totalLinks}
                completedLinks={stats.completedLinks}
                totalEarned={stats.totalEarned}
              />

              {/* Main grid */}
              <div className="dashboard-grid">
                <div className="dashboard-left">
                  <CreateLinkForm onLinkCreated={handleLinkCreated} />

                  <div className="quick-actions-grid">
                    <a
                      href="https://faucet.circle.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="quick-action-card"
                    >
                      <div
                        className="quick-action-icon"
                        style={{ background: "rgba(59,130,246,0.1)" }}
                      >
                        <svg viewBox="0 0 14 14" fill="#3b82f6" width="11" height="11">
                          <circle cx="7" cy="7" r="6" />
                        </svg>
                      </div>
                      <div className="quick-action-label">Get USDC</div>
                      <div className="quick-action-sub">Circle Faucet</div>
                    </a>
                    <a
                      href="https://testnet.arcscan.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="quick-action-card"
                    >
                      <div
                        className="quick-action-icon"
                        style={{ background: "rgba(139,92,246,0.1)" }}
                      >
                        <svg viewBox="0 0 14 14" fill="#8b5cf6" width="11" height="11">
                          <circle cx="7" cy="7" r="6" />
                        </svg>
                      </div>
                      <div className="quick-action-label">Explorer</div>
                      <div className="quick-action-sub">ArcScan</div>
                    </a>
                  </div>
                </div>

                <PaymentLinksTable refreshTrigger={refreshTrigger} />
              </div>
            </>
          )}
        </main>

        <footer className="page-footer">
          <span>ArcWave v0.1.0</span>
          <span>Powered by Arc Network & Circle</span>
        </footer>
      </div>
    </div>
  );
}
