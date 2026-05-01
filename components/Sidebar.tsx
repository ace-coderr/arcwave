"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useEffect, useState } from "react";

const SOCIAL = {
  x: "https://x.com/conduit_app",
  telegram: "https://t.me/conduit_community",
};

const NAV = [
  {
    label: "Dashboard", href: "/",
    icon: (
      <svg viewBox="0 0 18 18" fill="currentColor" width="15" height="15">
        <rect x="1" y="1" width="7" height="7" rx="1.5"/>
        <rect x="10" y="1" width="7" height="7" rx="1.5"/>
        <rect x="1" y="10" width="7" height="7" rx="1.5"/>
        <rect x="10" y="10" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    label: "Payment Links", href: "/links",
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" width="15" height="15">
        <path d="M10.5 7.5a3.5 3.5 0 010 4.95l-1.5 1.5a3.5 3.5 0 01-4.95-4.95l.75-.75" strokeLinecap="round"/>
        <path d="M7.5 10.5a3.5 3.5 0 010-4.95l1.5-1.5a3.5 3.5 0 014.95 4.95l-.75.75" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Transactions", href: "/transactions",
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" width="15" height="15">
        <path d="M3 6h12M3 6l3-3M3 6l3 3M15 12H3m12 0l-3-3m3 3l-3 3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Analytics", href: "/analytics", soon: true,
    icon: (
      <svg viewBox="0 0 18 18" fill="currentColor" width="15" height="15">
        <path d="M2 14V9h3v5H2zm5 0V5h3v9H7zm5 0V1h3v13h-3z" opacity="0.85"/>
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("conduit-theme");
    setIsDark(saved !== "light");
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("conduit-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("conduit-theme", "light");
    }
  };

  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  const content = (
    <div className="sidebar-inner">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
            <rect x="2" y="7" width="16" height="3" rx="1.5" fill="black"/>
            <rect x="2" y="11" width="16" height="3" rx="1.5" fill="black"/>
          </svg>
        </div>
        <div>
          <div className="sidebar-logo-name">Conduit</div>
          <div className="sidebar-logo-badge">
            <span className="sidebar-logo-dot pulse-dot"/>
            TESTNET
          </div>
        </div>
      </div>

      {/* Wallet */}
      {mounted && (
        <div className="sidebar-wallet">
          {isConnected ? (
            <>
              <div className="sidebar-wallet-label">CONNECTED</div>
              <div className="sidebar-wallet-address">{short}</div>
              <button className="sidebar-disconnect-btn" onClick={() => disconnect()}>
                Disconnect
              </button>
            </>
          ) : (
            <>
              <div className="sidebar-wallet-subtitle">Connect to get started</div>
              <button className="sidebar-connect-btn" onClick={() => connect({ connector: injected() })}>
                Connect Wallet
              </button>
            </>
          )}
        </div>
      )}

      {/* Nav */}
      <div className="sidebar-section-label">MENU</div>
      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.soon ? "#" : item.href}
              className={`sidebar-nav-link${active ? " active" : ""}${item.soon ? " disabled" : ""}`}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.soon && <span className="sidebar-soon-badge">SOON</span>}
            </Link>
          );
        })}
      </nav>

      {/* Resources + social */}
      <div className="sidebar-resources">
        <div className="sidebar-section-label">RESOURCES</div>
        <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="sidebar-resource-link">
          <span>Get USDC</span><span className="sidebar-resource-arrow">↗</span>
        </a>
        <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" className="sidebar-resource-link">
          <span>Explorer</span><span className="sidebar-resource-arrow">↗</span>
        </a>

        <div className="sidebar-section-label" style={{ marginTop: 12 }}>COMMUNITY</div>
        <a href={SOCIAL.x} target="_blank" rel="noopener noreferrer" className="sidebar-resource-link sidebar-social-link">
          <span className="sidebar-social-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.845L1.255 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </span>
          <span>Follow on X</span>
          <span className="sidebar-resource-arrow">↗</span>
        </a>
        <a href={SOCIAL.telegram} target="_blank" rel="noopener noreferrer" className="sidebar-resource-link sidebar-social-link">
          <span className="sidebar-social-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.94-.918c-.64-.203-.654-.64.136-.954l11.49-4.43c.532-.194.998.131.838.856z"/>
            </svg>
          </span>
          <span>Join Telegram</span>
          <span className="sidebar-resource-arrow">↗</span>
        </a>

        {/* Theme toggle */}
        {mounted && (
          <div className="theme-toggle">
            <span className="theme-toggle-label">
              {isDark ? "🌙" : "☀️"}
              {isDark ? "Dark" : "Light"}
            </span>
            <label className="theme-switch">
              <input
                type="checkbox"
                checked={!isDark}
                onChange={toggleTheme}
              />
              <span className="theme-slider"/>
            </label>
          </div>
        )}

        {/* Network */}
        <div className="sidebar-network-card">
          <div className="sidebar-network-icon">
            <svg viewBox="0 0 14 14" fill="none" width="10" height="10">
              <circle cx="7" cy="7" r="5.5" stroke="#00C896" strokeWidth="1.2"/>
              <path d="M7 4.5v2.5l1.5 1" stroke="#00C896" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="sidebar-network-name">Arc Network</div>
            <div className="sidebar-network-id">#5042002</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sidebar sidebar-desktop">{content}</aside>

      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <div className="mobile-topbar-logo">
          <div className="sidebar-logo-icon" style={{ width: 26, height: 26, borderRadius: 7 }}>
            <svg viewBox="0 0 20 20" fill="none" width="11" height="11">
              <rect x="2" y="7" width="16" height="3" rx="1.5" fill="black"/>
              <rect x="2" y="11" width="16" height="3" rx="1.5" fill="black"/>
            </svg>
          </div>
          <span className="mobile-topbar-name">Conduit</span>
        </div>
        <button className="mobile-hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          {mobileOpen ? (
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>

      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)}/>}
      <aside className={`sidebar sidebar-mobile${mobileOpen ? " open" : ""}`}>{content}</aside>
    </>
  );
}
