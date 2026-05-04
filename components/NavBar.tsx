"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useEffect, useState } from "react";

const LINKS = [
  {
    label: "Dashboard", href: "/",
    icon: <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13"><rect x="1" y="1" width="6" height="6" rx="1.5" /><rect x="9" y="1" width="6" height="6" rx="1.5" /><rect x="1" y="9" width="6" height="6" rx="1.5" /><rect x="9" y="9" width="6" height="6" rx="1.5" /></svg>,
  },
  {
    label: "Links", href: "/links",
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><path d="M9 6a3 3 0 010 4.24l-1.5 1.5a3 3 0 01-4.24-4.24l.75-.75" strokeLinecap="round" /><path d="M7 10a3 3 0 010-4.24l1.5-1.5a3 3 0 014.24 4.24l-.75.75" strokeLinecap="round" /></svg>,
  },
  {
    label: "Transactions", href: "/transactions",
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><path d="M2 5h12M2 5l3-3M2 5l3 3M14 11H2m12 0l-3-3m3 3l-3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
  {
    label: "Analytics", href: "/analytics", soon: true,
    icon: <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13"><path d="M2 12V8h2.5v4H2zm4 0V4h2.5v8H6zm4 0V1h2.5v11H10z" opacity=".85" /></svg>,
  },
];

export function NavBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");
  const [isDark, setIsDark] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
    setIsDark(localStorage.getItem("conduit-theme") !== "light");
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

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
  const logoSrc = mounted && !isDark ? "/conduit-logo-black.png" : "/conduit-logo-white.png";

  return (
    <>
      <nav className="nav">
        {/* Logo */}
        <Link href="/" className="nav-logo">
          {mounted ? (
            <Image
              src={logoSrc}
              alt="Conduit"
              width={140}
              height={52}
              style={{ height: 52, width: "auto", objectFit: "contain" }}
              priority
            />
          ) : (
            <Image
              src="/conduit-logo-white.png"
              alt="Conduit"
              width={140}
              height={52}
              style={{ height: 52, width: "auto", objectFit: "contain" }}
              priority
            />
          )}
        </Link>

        {/* Nav links */}
        <div className="nav-links">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.soon ? "#" : l.href}
              className={`nav-link${pathname === l.href ? " active" : ""}`}
              style={l.soon ? { pointerEvents: "none", opacity: 0.4 } : {}}
            >
              <span className="nav-link-icon">{l.icon}</span>
              {l.label}
              {l.soon && <span className="nav-soon">SOON</span>}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="nav-right">
          <div className="nav-network">
            <span className="nav-network-dot pulse-dot" />
            <span className="nav-network-label">Arc Testnet</span>
          </div>

          {mounted && <span className="nav-time">{time}</span>}

          {mounted && (
            <>
              {isConnected ? (
                <div className="nav-wallet" onClick={() => disconnect()} title="Click to disconnect">
                  <span className="nav-wallet-dot" />
                  {short}
                </div>
              ) : (
                <button className="nav-connect-btn" onClick={() => connect({ connector: injected() })}>
                  Connect Wallet
                </button>
              )}
            </>
          )}

          <button className="nav-theme-btn" onClick={toggleTheme} title={isDark ? "Switch to light" : "Switch to dark"}>
            {mounted ? (isDark ? "☀️" : "🌙") : "☀️"}
          </button>

          <button className="nav-hamburger" onClick={() => setDrawerOpen(!drawerOpen)}>
            {drawerOpen
              ? <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              : <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            }
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`nav-drawer${drawerOpen ? " open" : ""}`}>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.soon ? "#" : l.href}
            className={`nav-link${pathname === l.href ? " active" : ""}`}
            style={l.soon ? { pointerEvents: "none", opacity: 0.4 } : {}}
          >
            <span className="nav-link-icon">{l.icon}</span>
            {l.label}
            {l.soon && <span className="nav-soon">SOON</span>}
          </Link>
        ))}
        <div style={{ height: 1, background: "var(--stroke)", margin: "8px 0" }} />
        <div style={{ display: "flex", gap: 10, padding: "4px 0" }}>
          <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ flex: 1, justifyContent: "center" }}>Get USDC ↗</a>
          <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ flex: 1, justifyContent: "center" }}>Explorer ↗</a>
        </div>
      </div>
    </>
  );
}