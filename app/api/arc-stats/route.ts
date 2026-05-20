import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { arcPublicClient } from "@/lib/arcClient";
import { decodeAbiParameters, parseAbiParameters, getAddress } from "viem";

const PAYMENT_ADDRESS = "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c";
const PRICE = "1000"; // 0.001 USDC in atomic units (6 decimals)
const NETWORK = "eip155:5042002";
const FACILITATOR = "https://conduit-pay.vercel.app/api/x402";
const USDC = "0x3600000000000000000000000000000000000000";
const MAX_TX_AGE_SECONDS = 300;

const paymentDetails = {
  scheme: "exact",
  network: NETWORK,
  maxAmountRequired: PRICE,
  resource: "https://conduit-pay.vercel.app/api/arc-stats",
  description: "Live Arc Network and Conduit platform stats",
  mimeType: "application/json",
  payTo: PAYMENT_ADDRESS,
  maxTimeoutSeconds: MAX_TX_AGE_SECONDS,
  asset: USDC,
  extra: { name: "USD Coin", version: "2" },
};

// In-memory cache of used tx hashes (prevents replay)
const usedTxHashes = new Set<string>();
setInterval(() => {
  // Clear cache every 10 minutes — tx age check prevents abuse
  usedTxHashes.clear();
}, 600_000);

function buildPaymentRequired() {
  const encoded = Buffer.from(JSON.stringify({ accepts: [paymentDetails] })).toString("base64");
  return new NextResponse(
    JSON.stringify({ error: "Payment Required", accepts: [paymentDetails] }),
    {
      status: 402,
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-REQUIRED": encoded,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
      },
    }
  );
}

function buildHumanPayPage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Pay to Access — Conduit x402</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0a0a;color:#f0f0f0;font-family:'Sora',sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
    .card{background:#111;border:1px solid #222;border-radius:16px;padding:40px;max-width:480px;width:100%;position:relative;overflow:hidden}
    .bar{height:2px;background:linear-gradient(90deg,#00E5A0,#5b8ff9);position:absolute;top:0;left:0;right:0}
    .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(0,229,160,.1);border:1px solid rgba(0,229,160,.2);border-radius:20px;padding:4px 12px;margin-bottom:24px}
    .badge-dot{width:6px;height:6px;border-radius:50%;background:#00E5A0}
    .badge-text{font-size:10px;color:#00E5A0;font-family:'IBM Plex Mono',monospace;font-weight:700;letter-spacing:.08em}
    h1{font-size:24px;font-weight:900;letter-spacing:-.04em;margin-bottom:8px}
    .desc{font-size:13px;color:#888;line-height:1.6;margin-bottom:28px}
    .price-box{background:#0d0d0d;border:1px solid #222;border-radius:12px;padding:20px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center}
    .price-label{font-size:11px;color:#666;font-family:'IBM Plex Mono',monospace;margin-bottom:4px}
    .price-val{font-size:22px;font-weight:800;color:#00E5A0;font-family:'IBM Plex Mono',monospace}
    .price-unit{font-size:13px;color:#5b8ff9;margin-left:4px;font-weight:700}
    .network-badge{font-size:10px;color:#a78bfa;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.2);border-radius:8px;padding:6px 12px;font-family:'IBM Plex Mono',monospace;font-weight:700}
    .data-preview{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:10px;padding:16px;margin-bottom:24px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#555;line-height:1.8}
    .data-preview .key{color:#5b8ff9}
    .data-preview .val{color:#888}
    .btn{width:100%;padding:14px;background:#00E5A0;border:none;border-radius:10px;color:#000;font-size:14px;font-weight:800;cursor:pointer;font-family:'Sora',sans-serif;margin-bottom:12px;transition:opacity .15s}
    .btn:hover{opacity:.9}
    .btn:disabled{opacity:.4;cursor:not-allowed}
    .btn-ghost{width:100%;padding:12px;background:transparent;border:1px solid #222;border-radius:10px;color:#888;font-size:13px;font-weight:600;cursor:pointer;font-family:'Sora',sans-serif;text-decoration:none;display:block;text-align:center}
    .status{font-size:12px;color:#888;text-align:center;margin-top:12px;font-family:'IBM Plex Mono',monospace;min-height:18px}
    .status.success{color:#00E5A0}
    .status.error{color:#f03e5f}
    .result{background:#0d0d0d;border:1px solid #1a2a1a;border-radius:10px;padding:16px;margin-top:16px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#00E5A0;line-height:1.8;display:none;word-break:break-all}
    .powered{font-size:11px;color:#333;text-align:center;margin-top:24px;font-family:'IBM Plex Mono',monospace}
    .powered a{color:#444;text-decoration:none}
  </style>
</head>
<body>
  <div class="card">
    <div class="bar"></div>
    <div class="badge"><span class="badge-dot"></span><span class="badge-text">x402 PAYMENT REQUIRED</span></div>
    <h1>Arc Network Stats</h1>
    <p class="desc">This endpoint requires a micropayment to access. Pay once in USDC on Arc and get live platform data instantly.</p>

    <div class="price-box">
      <div>
        <div class="price-label">ONE-TIME PAYMENT</div>
        <div><span class="price-val">0.001</span><span class="price-unit">USDC</span></div>
      </div>
      <div class="network-badge">Arc Testnet</div>
    </div>

    <div class="data-preview">
      <div><span class="key">"network"</span>: <span class="val">{ chainId: 5042002, blockNumber: "..." }</span></div>
      <div><span class="key">"conduit"</span>: <span class="val">{ totalVolume: "... USDC", escrows: {...} }</span></div>
      <div><span class="key">"timestamp"</span>: <span class="val">"2026-05-20T..."</span></div>
    </div>

    <button class="btn" id="payBtn" onclick="connectAndPay()">Connect Wallet & Pay 0.001 USDC</button>
    <a href="/developers" class="btn-ghost">View Developer Docs →</a>
    <div class="status" id="status"></div>
    <div class="result" id="result"></div>
  </div>
  <p class="powered">Powered by <a href="https://conduit-pay.vercel.app">Conduit</a> · Built on Arc Network · Circle USDC</p>

  <script>
  // ERC-20 transfer(address,uint256) selector + encoded args
  function encodeTransfer(to, amount) {
    const selector = '0xa9059cbb';
    const paddedTo = to.slice(2).toLowerCase().padStart(64, '0');
    const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');
    return selector + paddedTo + paddedAmount;
  }

  async function waitForReceipt(txHash, maxWait = 60000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });
      if (receipt && receipt.status) return receipt;
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Transaction not confirmed within 60s');
  }

  async function connectAndPay() {
    const btn = document.getElementById('payBtn');
    const status = document.getElementById('status');

    if (!window.ethereum) {
      status.textContent = 'MetaMask not found. Install MetaMask to pay.';
      status.className = 'status error';
      return;
    }

    try {
      btn.disabled = true;
      status.textContent = 'Connecting wallet...';
      status.className = 'status';

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];

      status.textContent = 'Switching to Arc Testnet...';
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x4CE692' }],
        });
      } catch (e) {
        if (e.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x4CE692',
                chainName: 'Arc Testnet',
                nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
                rpcUrls: ['https://rpc.testnet.arc.network'],
                blockExplorerUrls: ['https://testnet.arcscan.app'],
              }]
            });
          } catch (addErr) {
            if (!addErr.message?.includes('same RPC')) throw addErr;
          }
        }
      }

      status.textContent = 'Confirm payment in MetaMask...';

      const USDC = '0x3600000000000000000000000000000000000000';
      const PAYMENT_ADDRESS = '${PAYMENT_ADDRESS}';
      const AMOUNT = '1000'; // 0.001 USDC

      // Direct ERC-20 transfer — no EIP-712 signing needed
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: USDC,
          data: encodeTransfer(PAYMENT_ADDRESS, AMOUNT),
        }],
      });

      status.textContent = 'Waiting for confirmation...';
      await waitForReceipt(txHash);

      status.textContent = 'Verifying payment...';

      // Send tx hash as payment proof
      const res = await fetch('/api/arc-stats', {
        headers: { 'PAYMENT-SIGNATURE': 'tx:' + txHash }
      });

      if (res.ok) {
        const data = await res.json();
        status.textContent = '✓ Payment confirmed! Here is your data:';
        status.className = 'status success';
        const resultEl = document.getElementById('result');
        resultEl.style.display = 'block';
        resultEl.textContent = JSON.stringify(data, null, 2);
        btn.textContent = '✓ Paid & Accessed';
      } else {
        const err = await res.json().catch(() => ({}));
        status.textContent = 'Verification failed: ' + (err.error || 'Try again.');
        status.className = 'status error';
        btn.disabled = false;
      }
    } catch (err) {
      status.textContent = err.code === 4001 ? 'Payment rejected.' : 'Error: ' + (err.message ?? 'Something went wrong');
      status.className = 'status error';
      btn.disabled = false;
    }
  }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 402,
    headers: {
      "Content-Type": "text/html",
      "PAYMENT-REQUIRED": Buffer.from(JSON.stringify({ accepts: [paymentDetails] })).toString("base64"),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
    },
  });
}

// Verify a tx-based payment (human flow) by checking the on-chain transfer
async function verifyTxPayment(txHash: string): Promise<{ valid: boolean; payer?: string; error?: string }> {
  try {
    if (usedTxHashes.has(txHash.toLowerCase())) {
      return { valid: false, error: "Transaction already used" };
    }

    const receipt = await arcPublicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!receipt || receipt.status !== "success") {
      return { valid: false, error: "Transaction failed or not found" };
    }

    // Check it was sent to USDC contract
    if (receipt.to?.toLowerCase() !== USDC.toLowerCase()) {
      return { valid: false, error: "Wrong contract" };
    }

    // Get tx to decode input data
    const tx = await arcPublicClient.getTransaction({ hash: txHash as `0x${string}` });
    if (!tx?.input || tx.input.length < 10) {
      return { valid: false, error: "No input data" };
    }

    // Check transfer(address,uint256) selector: 0xa9059cbb
    const selector = tx.input.slice(0, 10).toLowerCase();
    if (selector !== "0xa9059cbb") {
      return { valid: false, error: "Not a transfer call" };
    }

    // Decode (address to, uint256 amount)
    const [recipient, amount] = decodeAbiParameters(
      parseAbiParameters("address, uint256"),
      `0x${tx.input.slice(10)}` as `0x${string}`
    );

    // Check recipient and amount
    if (getAddress(recipient).toLowerCase() !== PAYMENT_ADDRESS.toLowerCase()) {
      return { valid: false, error: `Wrong recipient: ${recipient}` };
    }
    if (amount < BigInt(PRICE)) {
      return { valid: false, error: `Insufficient amount: ${amount} < ${PRICE}` };
    }

    // Check tx age
    const block = await arcPublicClient.getBlock({ blockNumber: receipt.blockNumber });
    const now = Math.floor(Date.now() / 1000);
    const txAge = now - Number(block.timestamp);
    if (txAge > MAX_TX_AGE_SECONDS) {
      return { valid: false, error: `Transaction too old: ${txAge}s` };
    }

    usedTxHashes.add(txHash.toLowerCase());
    return { valid: true, payer: tx.from };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

// Verify EIP-3009 payment (AI agent flow)
async function verifyAgentPayment(paymentHeader: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`${FACILITATOR}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: paymentHeader,
        paymentDetails: {
          scheme: "exact",
          network: NETWORK,
          maxAmountRequired: PRICE,
          payTo: PAYMENT_ADDRESS,
          asset: USDC,
        },
      }),
    });
    const data = await res.json();
    return { valid: data.isValid === true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

async function settlePayment(paymentHeader: string): Promise<void> {
  try {
    await fetch(`${FACILITATOR}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: paymentHeader,
        paymentDetails: {
          scheme: "exact",
          network: NETWORK,
          maxAmountRequired: PRICE,
          payTo: PAYMENT_ADDRESS,
          asset: USDC,
          resource: "https://conduit-pay.vercel.app/api/arc-stats",
        },
      }),
    });
  } catch { }
}

export async function GET(req: NextRequest) {
  const paymentSignature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("payment-signature");
  const acceptHeader = req.headers.get("accept") ?? "";
  const isHuman = acceptHeader.includes("text/html");

  if (!paymentSignature) {
    return isHuman ? buildHumanPayPage() : buildPaymentRequired();
  }

  let payer: string | undefined;

  // Detect payment type: tx-based (human) or EIP-3009 (agent)
  if (paymentSignature.startsWith("tx:")) {
    const txHash = paymentSignature.slice(3);
    const { valid, payer: txPayer, error } = await verifyTxPayment(txHash);
    if (!valid) {
      console.log("[arc-stats] TX verify failed:", error);
      return isHuman ? buildHumanPayPage() : buildPaymentRequired();
    }
    payer = txPayer;

    // Save to DB for admin dashboard
    try {
      await db.x402Payment.create({
        data: {
          txHash,
          payer: (payer ?? "unknown").toLowerCase(),
          payTo: PAYMENT_ADDRESS.toLowerCase(),
          amount: (parseInt(PRICE) / 1_000_000).toFixed(6),
          network: NETWORK,
          resource: "https://conduit-pay.vercel.app/api/arc-stats",
          nonce: txHash, // use txHash as nonce for tx-based payments
          settledAt: new Date(),
        },
      });
    } catch { /* already saved or duplicate */ }

  } else {
    // EIP-3009 agent flow
    const { valid } = await verifyAgentPayment(paymentSignature);
    if (!valid) {
      return isHuman ? buildHumanPayPage() : buildPaymentRequired();
    }
  }

  // Fetch stats
  const [blockNumber, links, escrows] = await Promise.all([
    arcPublicClient.getBlockNumber(),
    db.paymentLink.findMany({ select: { amount: true, status: true } }),
    db.escrowLink.findMany({ select: { amount: true, status: true } }),
  ]);

  const completedLinks = links.filter(l => l.status === "COMPLETED" || l.status === "PAID");
  const releasedEscrows = escrows.filter(e => ["RELEASED", "CONFIRMED"].includes(e.status));
  const totalLinkVolume = completedLinks.reduce((s, l) => s + parseFloat(l.amount), 0);
  const totalEscrowVolume = releasedEscrows.reduce((s, e) => s + parseFloat(e.amount), 0);

  const responseData = {
    network: {
      name: "Arc Testnet",
      chainId: 5042002,
      blockNumber: blockNumber.toString(),
      rpc: "https://rpc.testnet.arc.network",
      explorer: "https://testnet.arcscan.app",
    },
    conduit: {
      paymentLinks: {
        total: links.length,
        completed: completedLinks.length,
        volume: `${totalLinkVolume.toFixed(2)} USDC`,
      },
      escrows: {
        total: escrows.length,
        released: releasedEscrows.length,
        active: escrows.filter(e => e.status === "HOLDING").length,
        disputed: escrows.filter(e => ["DISPUTED", "MEDIATION"].includes(e.status)).length,
        volume: `${totalEscrowVolume.toFixed(2)} USDC`,
      },
      totalVolume: `${(totalLinkVolume + totalEscrowVolume).toFixed(2)} USDC`,
    },
    facilitator: FACILITATOR,
    timestamp: new Date().toISOString(),
  };

  // Settle EIP-3009 payment async (tx-based already settled on-chain)
  if (!paymentSignature.startsWith("tx:")) {
    settlePayment(paymentSignature);
  }

  return NextResponse.json(responseData, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, PAYMENT-SIGNATURE",
      "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
    },
  });
}