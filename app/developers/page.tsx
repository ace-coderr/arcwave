import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Developers — Conduit Pay",
    description: "Build on Conduit. The first public x402 facilitator on Arc Network. Accept USDC micropayments from AI agents and HTTP clients.",
};

export default function DevelopersPage() {
    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Sora, sans-serif", color: "var(--ink-1)" }}>

            {/* Top bar */}
            <div style={{ height: 56, background: "var(--surface)", borderBottom: "1px solid var(--stroke)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
                <Link href="/" style={{ textDecoration: "none" }}>
                    <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 32, width: "auto" }} />
                </Link>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <a href="https://github.com/ace-coderr/conduit" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none", fontWeight: 600 }}>GitHub ↗</a>
                    <Link href="/" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none", padding: "6px 14px", border: "1px solid var(--stroke)", borderRadius: 8, fontWeight: 600 }}>← App</Link>
                </div>
            </div>

            <div style={{ maxWidth: 860, margin: "0 auto", padding: "60px 40px" }}>

                {/* Hero */}
                <div style={{ marginBottom: 56 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 20, padding: "4px 12px", marginBottom: 20 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c)" }} />
                        <span style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".08em" }}>LIVE ON ARC TESTNET</span>
                    </div>
                    <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-.05em", marginBottom: 16, lineHeight: 1.1 }}>
                        Build with Conduit
                    </h1>
                    <p style={{ fontSize: 16, color: "var(--ink-3)", lineHeight: 1.7, maxWidth: 600 }}>
                        Conduit is the first public x402 facilitator on Arc Network. Gate any API, content, or data behind USDC micropayments — paid automatically by AI agents and HTTP clients.
                    </p>
                </div>

                {/* Quick links */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 56 }}>
                    {[
                        { label: "Facilitator URL", value: "conduit-pay.vercel.app/api/x402", href: "https://conduit-pay.vercel.app/api/x402", color: "var(--c)" },
                        { label: "Demo endpoint", value: "/api/arc-stats", href: "https://conduit-pay.vercel.app/api/arc-stats", color: "var(--info)" },
                        { label: "Network", value: "Arc Testnet · eip155:5042002", href: "https://testnet.arcscan.app", color: "#a78bfa" },
                    ].map(s => (
                        <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "16px 18px", textDecoration: "none", display: "block" }}>
                            <p style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", marginBottom: 6, letterSpacing: ".08em" }}>{s.label}</p>
                            <p style={{ fontSize: 12, color: s.color, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>{s.value}</p>
                        </a>
                    ))}
                </div>

                {/* How it works */}
                <section style={{ marginBottom: 56 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", marginBottom: 20 }}>How It Works</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {[
                            { n: "01", t: "Client hits your API", d: "Gets 402 Payment Required with payment details — amount, token, network, recipient." },
                            { n: "02", t: "Client pays on Arc", d: "Signs a USDC transferWithAuthorization (EIP-3009) on Arc Testnet and retries with PAYMENT-SIGNATURE header." },
                            { n: "03", t: "Conduit verifies", d: "Your server calls Conduit's /verify endpoint. Conduit checks the signature, amount, recipient, and nonce." },
                            { n: "04", t: "Serve the resource", d: "Verification passed — serve your API response. Call /settle async to submit the transaction on-chain." },
                        ].map(s => (
                            <div key={s.n} style={{ display: "flex", gap: 16, background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "16px 20px" }}>
                                <span style={{ fontSize: 11, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{s.n}</span>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", marginBottom: 4 }}>{s.t}</p>
                                    <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>{s.d}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Test it */}
                <section style={{ marginBottom: 56 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", marginBottom: 8 }}>Test it now</h2>
                    <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>Hit the live demo endpoint and see the 402 response:</p>
                    <div style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 12, padding: "20px 24px", fontFamily: "IBM Plex Mono, monospace" }}>
                        <p style={{ fontSize: 11, color: "#666", marginBottom: 8 }}># Returns 402 with payment details</p>
                        <p style={{ fontSize: 13, color: "#00E5A0" }}>curl -i https://conduit-pay.vercel.app/api/arc-stats</p>
                        <div style={{ height: 1, background: "#222", margin: "16px 0" }} />
                        <p style={{ fontSize: 11, color: "#666", marginBottom: 8 }}># Expected response</p>
                        <p style={{ fontSize: 12, color: "#5b8ff9" }}>HTTP/1.1 402 Payment Required</p>
                        <p style={{ fontSize: 12, color: "#888" }}>Payment-Required: eyJhY2NlcHRzIjpbeyJzY2hlb...</p>
                        <p style={{ fontSize: 12, color: "#888" }}>Content-Type: application/json</p>
                    </div>
                </section>

                {/* Integration code */}
                <section style={{ marginBottom: 56 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", marginBottom: 8 }}>Protect any API route</h2>
                    <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>Add a USDC payment gate to any Next.js API route in minutes:</p>
                    <div style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 12, padding: "20px 24px", fontFamily: "IBM Plex Mono, monospace", fontSize: 12, lineHeight: 1.8, overflowX: "auto" }}>
                        <p style={{ color: "#666" }}>{"// app/api/your-endpoint/route.ts"}</p>
                        <p style={{ color: "#a78bfa" }}>{"import { NextRequest, NextResponse } from \"next/server\";"}</p>
                        <br />
                        <p style={{ color: "#888" }}>{"const PAYMENT_ADDRESS = \"0xYOUR_WALLET\";"}</p>
                        <p style={{ color: "#888" }}>{"const PRICE = \"1000\"; // 0.001 USDC"}</p>
                        <p style={{ color: "#888" }}>{"const FACILITATOR = \"https://conduit-pay.vercel.app/api/x402\";"}</p>
                        <br />
                        <p style={{ color: "#a78bfa" }}>{"export async function GET(req: NextRequest) {"}</p>
                        <p style={{ color: "#5b8ff9", paddingLeft: 16 }}>{"const sig = req.headers.get(\"PAYMENT-SIGNATURE\");"}</p>
                        <p style={{ color: "#5b8ff9", paddingLeft: 16 }}>{"if (!sig) return payment402(); // returns 402"}</p>
                        <br />
                        <p style={{ color: "#5b8ff9", paddingLeft: 16 }}>{"const valid = await verifyWithConduit(sig);"}</p>
                        <p style={{ color: "#5b8ff9", paddingLeft: 16 }}>{"if (!valid) return payment402();"}</p>
                        <br />
                        <p style={{ color: "#00E5A0", paddingLeft: 16 }}>{"// Payment verified — serve your content"}</p>
                        <p style={{ color: "#5b8ff9", paddingLeft: 16 }}>{"return NextResponse.json({ data: \"your content\" });"}</p>
                        <p style={{ color: "#a78bfa" }}>{"}"}</p>
                    </div>
                </section>

                {/* Endpoints */}
                <section style={{ marginBottom: 56 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", marginBottom: 20 }}>Endpoints</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {[
                            { method: "GET", path: "/api/x402", desc: "Discovery — returns facilitator info and supported networks", color: "#00E5A0" },
                            { method: "POST", path: "/api/x402/verify", desc: "Verify a payment payload before serving a resource", color: "#5b8ff9" },
                            { method: "POST", path: "/api/x402/settle", desc: "Submit payment on-chain and wait for confirmation", color: "#f5a623" },
                            { method: "GET", path: "/api/arc-stats", desc: "Live demo endpoint — pays 0.001 USDC to access Arc + Conduit stats", color: "#a78bfa" },
                        ].map(e => (
                            <div key={e.path} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 10, padding: "14px 18px" }}>
                                <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: e.color, background: `${e.color}18`, border: `1px solid ${e.color}30`, borderRadius: 4, padding: "2px 6px", flexShrink: 0, marginTop: 1 }}>{e.method}</span>
                                <div>
                                    <p style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-1)", fontWeight: 700, marginBottom: 3 }}>{e.path}</p>
                                    <p style={{ fontSize: 12, color: "var(--ink-3)" }}>{e.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Network details */}
                <section style={{ marginBottom: 56 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", marginBottom: 20 }}>Network Details</h2>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, overflow: "hidden" }}>
                        {[
                            { k: "Network", v: "Arc Testnet" },
                            { k: "Chain ID", v: "5042002" },
                            { k: "CAIP-2", v: "eip155:5042002" },
                            { k: "USDC Address", v: "0x3600000000000000000000000000000000000000" },
                            { k: "USDC Decimals", v: "6" },
                            { k: "RPC", v: "https://rpc.testnet.arc.network" },
                            { k: "Explorer", v: "https://testnet.arcscan.app" },
                            { k: "Gas token", v: "USDC (native)" },
                        ].map((r, i, arr) => (
                            <div key={r.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                                <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>{r.k}</span>
                                <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-1)", fontWeight: 700 }}>{r.v}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section style={{ background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 16, padding: "32px", textAlign: "center" }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "var(--ink-1)", marginBottom: 8 }}>Ready to build?</p>
                    <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}>Start accepting USDC micropayments on Arc in minutes.</p>
                    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                        <a href="https://github.com/ace-coderr/conduit" target="_blank" rel="noopener noreferrer" style={{ padding: "11px 22px", background: "var(--c)", border: "none", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>View on GitHub ↗</a>
                        <a href="https://x.com/conduit_pay" target="_blank" rel="noopener noreferrer" style={{ padding: "11px 22px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-2)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>@conduit_pay ↗</a>
                    </div>
                </section>

            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid var(--stroke)", padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 860, margin: "0 auto" }}>
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Built on Arc Network · Powered by Circle</span>
                <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>Conduit v0.1.0</span>
            </div>
        </div>
    );
}