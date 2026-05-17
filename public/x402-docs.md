# Conduit x402 Facilitator — Developer Docs

## Overview

Conduit is the **first public x402 facilitator on Arc Network** — the EVM chain where USDC is the native gas token. Use Conduit's facilitator to accept USDC micropayments on Arc from AI agents, browsers, and any HTTP client.

**Facilitator URL:** `https://conduit-pay.vercel.app/api/x402`

**Supported networks:** Arc Testnet (`eip155:5042002`)

**Token:** USDC (`0x3600000000000000000000000000000000000000`)

---

## How It Works

x402 is an HTTP-native payment protocol built on the long-unused `402 Payment Required` status code.

1. Client hits your API → gets `402 Payment Required` with payment details
2. Client signs a USDC `transferWithAuthorization` (EIP-3009) on Arc
3. Client retries with `PAYMENT-SIGNATURE` header
4. Your server calls Conduit's `/verify` endpoint to confirm the payment
5. Your server serves the resource
6. Your server calls Conduit's `/settle` endpoint to submit the transaction on-chain

---

## Endpoints

### `GET /api/x402`

Discovery endpoint. Returns facilitator info and supported networks.

```bash
curl https://conduit-pay.vercel.app/api/x402
```

**Response:**

```json
{
  "name": "Conduit x402 Facilitator",
  "supportedNetworks": [{
    "networkId": "eip155:5042002",
    "name": "Arc Testnet",
    "chainId": 5042002,
    "token": "USDC",
    "tokenAddress": "0x3600000000000000000000000000000000000000",
    "decimals": 6
  }],
  "endpoints": {
    "verify": "/api/x402/verify",
    "settle": "/api/x402/settle"
  }
}
```

---

### `POST /api/x402/verify`

Verifies a payment payload before serving a resource.

**Request:**

```json
{
  "payload": "<base64 encoded payment payload>",
  "paymentDetails": {
    "scheme": "exact",
    "network": "eip155:5042002",
    "maxAmountRequired": "1000",
    "payTo": "0xYOUR_WALLET_ADDRESS",
    "asset": "0x3600000000000000000000000000000000000000"
  }
}
```

**Success Response:**

```json
{
  "isValid": true,
  "networkId": "eip155:5042002",
  "payer": "0xPAYER_ADDRESS",
  "amount": "1000",
  "token": "0x3600000000000000000000000000000000000000"
}
```

**Failure Response:**

```json
{
  "isValid": false,
  "error": "Payment authorization expired"
}
```

---

### `POST /api/x402/settle`

Submits payment on-chain and waits for confirmation.

**Request:** Same as `/verify`

**Success Response:**

```json
{
  "success": true,
  "txHash": "0x...",
  "networkId": "eip155:5042002",
  "payer": "0xPAYER_ADDRESS",
  "amount": "1000",
  "token": "0x3600000000000000000000000000000000000000"
}
```

---

## Quick Integration — Next.js API Route

Protect any Next.js API route behind a USDC payment on Arc:

```ts
// app/api/your-endpoint/route.ts
import { NextRequest, NextResponse } from "next/server";

const PAYMENT_ADDRESS = "0xYOUR_WALLET_ADDRESS";
const PRICE = "1000"; // 0.001 USDC (6 decimals)
const NETWORK = "eip155:5042002";
const FACILITATOR = "https://conduit-pay.vercel.app/api/x402";
const USDC = "0x3600000000000000000000000000000000000000";

function payment402() {
  const details = {
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: PRICE,
    resource: "https://your-app.com/api/your-endpoint",
    description: "Your resource description",
    mimeType: "application/json",
    payTo: PAYMENT_ADDRESS,
    maxTimeoutSeconds: 300,
    asset: USDC,
    extra: { name: "USD Coin", version: "2" },
  };
  return new NextResponse(
    JSON.stringify({ error: "Payment Required", accepts: [details] }),
    {
      status: 402,
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-REQUIRED": Buffer.from(JSON.stringify({ accepts: [details] })).toString("base64"),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
      },
    }
  );
}

async function verifyPayment(sig: string) {
  const res = await fetch(`${FACILITATOR}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: sig,
      paymentDetails: { scheme: "exact", network: NETWORK, maxAmountRequired: PRICE, payTo: PAYMENT_ADDRESS, asset: USDC },
    }),
  });
  const data = await res.json();
  return data.isValid === true;
}

async function settlePayment(sig: string) {
  fetch(`${FACILITATOR}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: sig,
      paymentDetails: { scheme: "exact", network: NETWORK, maxAmountRequired: PRICE, payTo: PAYMENT_ADDRESS, asset: USDC },
    }),
  });
}

export async function GET(req: NextRequest) {
  const sig = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("payment-signature");
  if (!sig) return payment402();

  const valid = await verifyPayment(sig);
  if (!valid) return payment402();

  // Your actual handler logic here
  const data = { message: "Paid content" };

  settlePayment(sig); // async — don't await
  return NextResponse.json(data);
}
```

---

## Client Side — Pay and Access

Install the x402 fetch wrapper:

```bash
npm i @x402/fetch
```

```ts
import { withPaymentInterceptor } from "@x402/fetch";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0xYOUR_PRIVATE_KEY");
const wallet = createWalletClient({
  account,
  transport: http("https://rpc.testnet.arc.network"),
});

const fetch402 = withPaymentInterceptor(fetch, wallet);

// This automatically handles the 402 → pay → retry flow
const res = await fetch402("https://your-app.com/api/your-endpoint");
const data = await res.json();
```

---

## Live Demo Endpoint

Test the facilitator against a live endpoint:

```bash
# Returns 402 with payment details
curl -i https://conduit-pay.vercel.app/api/arc-stats

# Decode the PAYMENT-REQUIRED header to see payment details
curl -s https://conduit-pay.vercel.app/api/arc-stats | python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
print(json.dumps(data, indent=2))
"
```

When paid, returns live Arc Network stats:

- Current block number
- Conduit payment volume
- Active escrows
- Platform transaction count

---

## Pricing

- **Verify:** Free
- **Settle:** No facilitator fee — you only pay Arc Network gas (paid in USDC, sub-cent)

---

## Network Details

| Property | Value |
|---|---|
| Network | Arc Testnet |
| Chain ID | 5042002 |
| CAIP-2 | `eip155:5042002` |
| USDC Address | `0x3600000000000000000000000000000000000000` |
| USDC Decimals | 6 |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| Gas token | USDC (native) |

---

## Support

- Twitter: [@conduit_pay](https://x.com/conduit_pay)
- GitHub: [github.com/ace-coderr/conduit](https://github.com/ace-coderr/conduit)
- Live app: [conduit-pay.vercel.app](https://conduit-pay.vercel.app)