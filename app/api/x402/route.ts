// FILE: conduit/app/api/x402/route.ts

import { NextRequest, NextResponse } from "next/server";
import { arcTestnet } from "@/lib/arcChain";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

const facilitatorData = {
    name: "Conduit x402 Facilitator",
    description: "The first public x402 facilitator on Arc Network. Verify and settle USDC micropayments on Arc — the chain where USDC is the native gas token.",
    url: "https://conduit-pay.vercel.app",
    version: "2",
    supportedSchemes: ["exact"],
    supportedNetworks: [
        {
            networkId: `eip155:${arcTestnet.id}`,
            name: arcTestnet.name,
            chainId: arcTestnet.id,
            token: "USDC",
            tokenAddress: USDC_ADDRESS,
            decimals: 6,
            rpcUrl: "https://rpc.testnet.arc.network",
            explorer: "https://testnet.arcscan.app",
        },
    ],
    endpoints: {
        verify: "/api/x402/verify",
        settle: "/api/x402/settle",
    },
    contact: "@conduit_pay",
};

function buildHumanPage() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Conduit x402 Facilitator</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0a0a;color:#f0f0f0;font-family:'Sora',sans-serif;min-height:100vh;padding:40px 20px}
    .wrap{max-width:680px;margin:0 auto}
    .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:48px}
    .logo{height:32px;width:auto}
    .nav-link{font-size:12px;color:#666;text-decoration:none;padding:7px 14px;border:1px solid #222;border-radius:8px;font-weight:600;transition:color .15s}
    .nav-link:hover{color:#f0f0f0}
    .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(0,229,160,.1);border:1px solid rgba(0,229,160,.2);border-radius:20px;padding:4px 12px;margin-bottom:20px}
    .badge-dot{width:6px;height:6px;border-radius:50%;background:#00E5A0;animation:pulse 1.5s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .badge-text{font-size:10px;color:#00E5A0;font-family:'IBM Plex Mono',monospace;font-weight:700;letter-spacing:.08em}
    h1{font-size:36px;font-weight:900;letter-spacing:-.05em;margin-bottom:12px;line-height:1.1}
    .desc{font-size:14px;color:#888;line-height:1.7;margin-bottom:40px;max-width:520px}
    .section{margin-bottom:36px}
    .section-title{font-size:11px;color:#555;font-family:'IBM Plex Mono',monospace;letter-spacing:.12em;font-weight:700;margin-bottom:14px}
    .card{background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:20px;margin-bottom:10px}
    .card-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #161616}
    .card-row:last-child{border-bottom:none;padding-bottom:0}
    .card-key{font-size:11px;color:#555;font-family:'IBM Plex Mono',monospace}
    .card-val{font-size:12px;color:#f0f0f0;font-family:'IBM Plex Mono',monospace;font-weight:700}
    .card-val.green{color:#00E5A0}
    .card-val.blue{color:#5b8ff9}
    .card-val.purple{color:#a78bfa}
    .endpoint{display:flex;align-items:flex-start;gap:12px;background:#111;border:1px solid #1a1a1a;border-radius:10px;padding:16px;margin-bottom:8px}
    .method{font-size:9px;font-family:'IBM Plex Mono',monospace;font-weight:700;border-radius:4px;padding:2px 6px;flex-shrink:0;margin-top:1px}
    .method.get{color:#00E5A0;background:rgba(0,229,160,.1);border:1px solid rgba(0,229,160,.2)}
    .method.post{color:#5b8ff9;background:rgba(91,143,249,.1);border:1px solid rgba(91,143,249,.2)}
    .endpoint-path{font-size:13px;font-family:'IBM Plex Mono',monospace;color:#f0f0f0;font-weight:700;margin-bottom:3px}
    .endpoint-desc{font-size:12px;color:#666}
    .code-block{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:10px;padding:16px;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#00E5A0;margin-bottom:8px;overflow-x:auto}
    .code-comment{color:#444}
    .btns{display:flex;gap:10px;margin-top:8px;flex-wrap:wrap}
    .btn{padding:10px 20px;background:#00E5A0;border:none;border-radius:8px;color:#000;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sora',sans-serif;text-decoration:none;display:inline-block}
    .btn-ghost{padding:10px 20px;background:transparent;border:1px solid #222;border-radius:8px;color:#888;font-size:12px;font-weight:600;text-decoration:none;display:inline-block}
    .footer{border-top:1px solid #161616;padding-top:24px;margin-top:48px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    .footer-text{font-size:11px;color:#333;font-family:'IBM Plex Mono',monospace}
    .footer-text a{color:#444;text-decoration:none}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <a href="/"><img src="/conduit-logo-white.png" alt="Conduit" class="logo"/></a>
      <a href="/developers" class="nav-link">Docs →</a>
    </div>

    <div class="badge"><span class="badge-dot"></span><span class="badge-text">FACILITATOR LIVE</span></div>
    <h1>Conduit x402<br/>Facilitator</h1>
    <p class="desc">The first public x402 facilitator on Arc Network. Gate any API, content, or data behind USDC micropayments — settled on-chain in under a second.</p>

    <div class="section">
      <div class="section-title">FACILITATOR INFO</div>
      <div class="card">
        <div class="card-row"><span class="card-key">Status</span><span class="card-val green">● Live</span></div>
        <div class="card-row"><span class="card-key">Version</span><span class="card-val">x402 v2</span></div>
        <div class="card-row"><span class="card-key">Network</span><span class="card-val blue">Arc Testnet · eip155:5042002</span></div>
        <div class="card-row"><span class="card-key">Token</span><span class="card-val green">USDC (native)</span></div>
        <div class="card-row"><span class="card-key">USDC Address</span><span class="card-val" style="font-size:10px">0x3600000000000000000000000000000000000000</span></div>
        <div class="card-row"><span class="card-key">Facilitator URL</span><span class="card-val purple">conduit-pay.vercel.app/api/x402</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">ENDPOINTS</div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <div>
          <div class="endpoint-path">/api/x402</div>
          <div class="endpoint-desc">Discovery — returns facilitator info and supported networks</div>
        </div>
      </div>
      <div class="endpoint">
        <span class="method post">POST</span>
        <div>
          <div class="endpoint-path">/api/x402/verify</div>
          <div class="endpoint-desc">Verify a payment payload before serving a resource</div>
        </div>
      </div>
      <div class="endpoint">
        <span class="method post">POST</span>
        <div>
          <div class="endpoint-path">/api/x402/settle</div>
          <div class="endpoint-desc">Submit payment on-chain and wait for Arc confirmation</div>
        </div>
      </div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <div>
          <div class="endpoint-path">/api/arc-stats</div>
          <div class="endpoint-desc">Live demo endpoint — pay 0.001 USDC to access Arc + Conduit stats</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">TRY IT</div>
      <div class="code-block"><span class="code-comment"># Hit the demo endpoint and see the 402 response</span>
curl -i https://conduit-pay.vercel.app/api/arc-stats</div>
      <div class="code-block"><span class="code-comment"># Get raw facilitator JSON</span>
curl https://conduit-pay.vercel.app/api/x402 \
  -H "Accept: application/json"</div>
      <div class="btns">
        <a href="/api/arc-stats" class="btn">Try Demo Endpoint →</a>
        <a href="/developers" class="btn-ghost">Read the Docs</a>
        <a href="https://github.com/ace-coderr/conduit" target="_blank" rel="noopener noreferrer" class="btn-ghost">GitHub ↗</a>
      </div>
    </div>

    <div class="footer">
      <span class="footer-text">Built on <a href="https://arc.network">Arc Network</a> · Powered by <a href="https://circle.com">Circle</a></span>
      <span class="footer-text"><a href="https://x.com/conduit_pay">@conduit_pay</a></span>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
    });
}

export async function GET(req: NextRequest) {
    const acceptHeader = req.headers.get("accept") ?? "";
    const isHuman = acceptHeader.includes("text/html");

    if (isHuman) return buildHumanPage();

    return NextResponse.json(facilitatorData);
}