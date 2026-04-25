"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useEffect, useState } from "react";

const NAV = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <svg viewBox="0 0 18 18" fill="currentColor" width="15" height="15">
        <rect x="1" y="1" width="7" height="7" rx="1.5" />
        <rect x="10" y="1" width="7" height="7" rx="1.5" />
        <rect x="1" y="10" width="7" height="7" rx="1.5" />
        <rect x="10" y="10" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    label: "Payment Links",
    href: "/links",
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" width="15" height="15">
        <path d="M10.5 7.5a3.5 3.5 0 010 4.95l-1.5 1.5a3.5 3.5 0 01-4.95-4.95l.75-.75" strokeLinecap="round" />
        <path d="M7.5 10.5a3.5 3.5 0 010-4.95l1.5-1.5a3.5 3.5 0 014.95 4.95l-.75.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" width="15" height="15">
        <path d="M3 6h12M3 6l3-3M3 6l3 3M15 12H3m12 0l-3-3m3 3l-3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/analytics",
    soon: true,
    icon: (
      <svg viewBox="0 0 18 18" fill="currentColor" width="15" height="15">
        <path d="M2 14V9h3v5H2zm5 0V5h3v9H7zm5 0V1h3v13h-3z" opacity="0.85" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => { setMounted(true); }, []);

  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <aside className="sidebar">

      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
            <path d="M3 17 C6 10, 10 6, 12 12 C14 18, 18 14, 21 7"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div className="sidebar-logo-name">
            Arc<span>Wave</span>
          </div>
          <div className="sidebar-logo-badge">
            <span className="sidebar-logo-dot pulse-dot" />
            TESTNET
          </div>
        </div>
      </div>

      {/* Wallet card */}
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

      {/* Resources */}
      <div className="sidebar-resources">
        <div className="sidebar-section-label">RESOURCES</div>
        <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="sidebar-resource-link">
          <span>Faucet</span>
          <span className="sidebar-resource-arrow">↗</span>
        </a>
        <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" className="sidebar-resource-link">
          <span>Explorer</span>
          <span className="sidebar-resource-arrow">↗</span>
        </a>

        <div className="sidebar-network-card">
          <div className="sidebar-network-icon">
            <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
              <circle cx="7" cy="7" r="5.5" stroke="#3b82f6" strokeWidth="1.2" />
              <path d="M7 4.5v2.5l1.5 1" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="sidebar-network-name">Arc Network</div>
            <div className="sidebar-network-id">#5042002</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
