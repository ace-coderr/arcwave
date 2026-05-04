# Conduit — USDC Payment Links on Arc Network

Conduit lets you generate shareable "pay me" links that accept USDC payments on Arc Network. Pay from any chain — Base, Ethereum, Arbitrum, Polygon and more. Privacy-first with stealth mode.

**Live:** https://conduit-pay.vercel.app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + React + TypeScript |
| Web3 | wagmi v2 + viem |
| Multi-chain | Circle Unified Balance SDK |
| Database | Prisma + Supabase (PostgreSQL) |
| Hosting | Vercel |
| Blockchain | Arc Testnet (Chain ID 5042002, USDC native) |

---

## Features

- **Payment links** — Create shareable one-time USDC payment links
- **Stealth mode** — Route payments through a temp wallet to hide your real address
- **Multi-chain** — Accept USDC from Base, Ethereum, Arbitrum, Polygon, Avalanche, Optimism
- **Fee system** — 0.5% platform fee on all payments
- **Analytics** — Earnings chart, milestones, streak tracking
- **PnL card** — Downloadable PNG card to share your earnings on X
- **Transactions** — Full history with CSV export
- **Dark/Light mode** — System-aware theme toggle

---

## Quick Start

### Prerequisites

- Node.js v20+
- MetaMask browser extension
- Supabase account (free) — https://supabase.com

### Add Arc Testnet to MetaMask

| Field | Value |
|---|---|
| Network name | Arc Testnet |
| RPC URL | `https://rpc.testnet.arc.network` |
| Chain ID | `5042002` |
| Currency symbol | `USDC` |
| Block explorer | `https://testnet.arcscan.app` |

### Get Testnet USDC

Go to **https://faucet.circle.com** → select Arc Testnet → paste your wallet address.

### Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/ace-coderr/arcwave.git conduit
cd conduit

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Fill in your environment variables (see below)

# 5. Push database schema
npx prisma db push

# 6. Start development server
npm run dev
```

Open **http://localhost:3000**

---

## Environment Variables

```env
# Supabase (PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# WalletConnect (get free ID at cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_project_id"

# Stealth wallet encryption key (any random 64-char hex string)
STEALTH_SECRET="your_secret_here"

# Forwarder wallet private key (for stealth forwarding)
FORWARDER_PRIVATE_KEY="0x..."

# Admin recovery token
RECOVER_TOKEN="your_token_here"
```

---

## Project Structure

```
conduit/
├── app/
│   ├── page.tsx                  # Dashboard + landing
│   ├── links/page.tsx            # All payment links
│   ├── transactions/page.tsx     # Transaction history
│   ├── analytics/page.tsx        # Analytics dashboard
│   ├── pay/[linkId]/page.tsx     # Public payment page
│   ├── u/[address]/page.tsx      # Public profile page
│   └── api/
│       ├── links/                # CRUD for payment links
│       ├── forward/              # Stealth forwarding
│       └── og/                   # PnL card image generation
├── components/
│   ├── NavBar.tsx
│   ├── PayPage.tsx               # Payment UI for payers
│   ├── CreateLinkForm.tsx
│   ├── PaymentLinksTable.tsx
│   ├── StatsRow.tsx
│   └── PnlCard.tsx               # Downloadable PnL card
├── lib/
│   ├── arcChain.ts               # Arc Testnet config
│   ├── db.ts                     # Prisma client
│   ├── fees.ts                   # Fee configuration
│   ├── stealthWallet.ts          # Stealth wallet logic
│   ├── appKit.ts                 # Unified Balance SDK
│   └── utils.ts
└── prisma/
    └── schema.prisma
```

---

## How It Works

### Creating a Payment Link

1. Connect your MetaMask wallet on Arc Testnet
2. Enter title, USDC amount, optional description
3. Toggle **Stealth Mode** to hide your real address
4. Click **Generate Link** → get a shareable URL
5. Share with anyone — they pay, you receive

### Stealth Mode

When stealth is enabled:
- A fresh temporary wallet is generated for each link
- Payer sends USDC to the temp wallet
- A forwarder automatically routes funds to your real address
- Payer cannot trace your identity on ArcScan

### Multi-chain Payments (Unified Balance)

Payers can pay from any supported chain using Circle's Unified Balance:
- Deposit USDC from source chain (e.g. Base)
- Circle routes it to Arc Testnet
- You receive USDC on Arc — no bridging needed

### Fee System

- 0.5% fee on all payments
- Fee is added on top of the link amount
- Payer pays `amount + fee` in two MetaMask confirmations
- Fees go to a separate collector wallet

---

## Deployment

### 1. Push to GitHub

```bash
git add .
git commit -m "Deploy Conduit"
git push
```

### 2. Deploy on Vercel

1. Go to **https://vercel.com** → import your GitHub repo
2. Add all environment variables from `.env.local`
3. Click **Deploy**

### 3. Database

Uses Supabase PostgreSQL with connection pooling via pgBouncer.
Run `npx prisma db push` after any schema changes.

---

## Useful Commands

```bash
npm run dev          # Start local dev server
npm run build        # Build for production
npx prisma db push   # Sync database schema
npx prisma studio    # Open visual database browser
```

---

## Resources

| Resource | URL |
|---|---|
| Arc Network | https://www.arc.network |
| Arc Testnet Explorer | https://testnet.arcscan.app |
| Circle Faucet | https://faucet.circle.com |
| Circle Docs | https://developers.circle.com |
| Supabase | https://supabase.com |
| Vercel | https://vercel.com |

---

Built with ♥ on Arc Network · Powered by Circle
