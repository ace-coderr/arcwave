// FILE: conduit/app/admin/x402/page.tsx
// CREATE folder: conduit/app/admin/x402/
// CREATE file: conduit/app/admin/x402/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import Link from "next/link";

const ADMIN_WALLET = "0x8557fabdc62f59a1ba7d6a74aaf0942cdcb68f69";

interface X402Payment {
    id: string;
    txHash: string;
    payer: string;
    payTo: string;
    amount: string;
    network: string;
    resource: string;
    settledAt: string;
}

export default function X402Dashboard() {
    const { address, isConnected } = useAccount();
    const { connect } = useConnect();
    const [payments, setPayments] = useState<X402Payment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    const isAdmin = address?.toLowerCase() === ADMIN_WALLET;

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (isAdmin) fetchPayments();
    }, [isAdmin]);

    const fetchPayments = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/x402/payments?wallet=${address}`);
            if (res.ok) {
                const data = await res.json();
                setPayments(data.payments ?? []);
            }
        } catch { }
        finally { setIsLoading(false); }
    };

    const totalVolume = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const uniquePayers = new Set(payments.map(p => p.payer)).size;
    const fmtDate = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

    if (!mounted) return null;

    if (!isConnected) return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Sora, sans-serif" }}>
            <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, color: "var(--ink-1)", marginBottom: 16 }}>Connect admin wallet</p>
                <button onClick={() => connect({ connector: injected() })} style={{ padding: "12px 24px", background: "var(--c)", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>Connect Wallet</button>
            </div>
        </div>
    );

    if (!isAdmin) return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "var(--danger)", fontFamily: "Sora, sans-serif" }}>Access denied</p>
        </div>
    );

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Sora, sans-serif", padding: "32px 40px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                            <Link href="/admin" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none" }}>← Admin</Link>
                            <span style={{ color: "var(--ink-3)" }}>/</span>
                            <span style={{ fontSize: 12, color: "var(--ink-2)" }}>x402 Payments</span>
                        </div>
                        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--ink-1)", letterSpacing: "-.04em" }}>x402 Dashboard</h1>
                        <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>API micropayments settled through Conduit's Arc facilitator</p>
                    </div>
                    <button onClick={fetchPayments} style={{ padding: "8px 16px", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 8, color: "var(--c)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>
                        Refresh
                    </button>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
                    {[
                        { label: "Total Settled", value: `${totalVolume.toFixed(4)} USDC`, color: "var(--c)" },
                        { label: "Total Requests", value: payments.length.toString(), color: "var(--info)" },
                        { label: "Unique Payers", value: uniquePayers.toString(), color: "var(--warning)" },
                        { label: "Network", value: "Arc Testnet", color: "#a78bfa" },
                    ].map(s => (
                        <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "16px 20px", boxShadow: "var(--elev-1)" }}>
                            <p style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "IBM Plex Mono, monospace", marginBottom: 4 }}>{s.value}</p>
                            <p style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Facilitator info */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>Facilitator endpoint</p>
                        <p style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", color: "var(--c)", fontWeight: 700 }}>https://conduit-pay.vercel.app/api/x402</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <a href="https://conduit-pay.vercel.app/api/x402" target="_blank" rel="noopener noreferrer" style={{ padding: "7px 14px", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 8, color: "var(--c)", fontSize: 11, fontWeight: 700, textDecoration: "none", fontFamily: "IBM Plex Mono, monospace" }}>Discovery ↗</a>
                        <a href="https://conduit-pay.vercel.app/api/arc-stats" target="_blank" rel="noopener noreferrer" style={{ padding: "7px 14px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-2)", fontSize: 11, fontWeight: 700, textDecoration: "none", fontFamily: "IBM Plex Mono, monospace" }}>Demo endpoint ↗</a>
                    </div>
                </div>

                {/* Transactions table */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--stroke)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-1)" }}>Settled Payments</p>
                            <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{payments.length} total x402 transactions on Arc</p>
                        </div>
                        <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.25)", borderRadius: 4, padding: "2px 8px" }}>Arc Testnet · eip155:5042002</span>
                    </div>

                    {/* Col headers */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, padding: "10px 24px", background: "var(--raised)", borderBottom: "1px solid var(--stroke)" }}>
                        {["RESOURCE", "AMOUNT", "PAYER", "TX HASH", "DATE"].map(c => (
                            <span key={c} style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)", letterSpacing: ".12em", fontWeight: 600 }}>{c}</span>
                        ))}
                    </div>

                    <div style={{ maxHeight: 500, overflowY: "auto" }}>
                        {isLoading ? (
                            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>Loading...</div>
                        ) : payments.length === 0 ? (
                            <div style={{ padding: 40, textAlign: "center" }}>
                                <p style={{ fontSize: 14, color: "var(--ink-2)", fontWeight: 700, marginBottom: 8 }}>No x402 payments yet</p>
                                <p style={{ fontSize: 12, color: "var(--ink-3)" }}>Payments will appear here once agents start using the facilitator</p>
                                <a href="https://conduit-pay.vercel.app/api/arc-stats" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 12, fontSize: 12, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace" }}>Test with curl -i https://conduit-pay.vercel.app/api/arc-stats ↗</a>
                            </div>
                        ) : payments.map((p, i) => (
                            <div key={p.id}
                                style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, padding: "13px 24px", alignItems: "center", borderBottom: i < payments.length - 1 ? "1px solid var(--stroke)" : "none" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "var(--raised)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.resource.replace("https://conduit-pay.vercel.app", "")}</p>
                                    <p style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", marginTop: 2 }}>{p.network}</p>
                                </div>
                                <span style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "var(--c)" }}>{parseFloat(p.amount).toFixed(4)} <span style={{ fontSize: 10, color: "var(--ink-3)" }}>USDC</span></span>
                                <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-2)" }}>{p.payer.slice(0, 6)}...{p.payer.slice(-4)}</span>
                                <a href={`https://testnet.arcscan.app/tx/${p.txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", textDecoration: "none" }}>
                                    {p.txHash.slice(0, 8)}...↗
                                </a>
                                <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)" }}>{fmtDate(p.settledAt)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}