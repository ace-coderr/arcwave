# 🌊 ArcWave — USDC Payment Links on Arc Network

ArcWave lets you generate shareable "pay me" links that accept USDC payments
on Arc Network. Built with Next.js, wagmi, and Prisma.

![ArcWave Dashboard](.github/preview.png)

---

## 🔗 Live Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 + React + TypeScript | Full-stack framework |
| Styling | Tailwind CSS | Dark theme UI |
| Web3 | wagmi v2 + viem | Wallet connection & transactions |
| Wallet UI | RainbowKit | Beautiful "Connect Wallet" button |
| Database | Prisma + SQLite | Store payment links locally |
| Blockchain | Arc Testnet | Chain ID 5042002, USDC native token |

---

## ⚡ Quick Start

### 1. Prerequisites

Install these on your computer first:
- **Node.js v20+** → https://nodejs.org
- **MetaMask** browser extension → https://metamask.io
- **VS Code** (optional, recommended) → https://code.visualstudio.com

### 2. Add Arc Testnet to MetaMask

Open MetaMask → click the network dropdown → "Add network" → "Add manually":

| Field | Value |
|---|---|
| Network name | Arc Testnet |
| New RPC URL | `https://rpc.testnet.arc.network` |
| Chain ID | `5042002` |
| Currency symbol | `USDC` |
| Block explorer | `https://testnet.arcscan.app` |

### 3. Get Free Testnet USDC

Go to **https://faucet.circle.com**:
- Select **Arc Testnet**
- Paste your MetaMask wallet address
- Receive 1 free USDC/day (used for both payments and gas fees)

### 4. Get a WalletConnect Project ID (free)

Go to **https://cloud.walletconnect.com**:
- Create a free account
- Create a new project
- Copy the **Project ID**

### 5. Install & Run

```bash
# 1. Install all packages
npm install

# 2. Create your environment file
cp .env.local.example .env.local

# 3. Open .env.local in VS Code and fill in:
#    - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_id_here"
#    (keep DATABASE_URL as-is for local dev)

# 4. Create the SQLite database
npm run db:push

# 5. Start the development server
npm run dev
```

Open **http://localhost:3000** in your browser. ✅

---

## 🗺️ How It Works

### Creating a Payment Link

1. Connect your MetaMask wallet (make sure you're on Arc Testnet)
2. Fill in the title, amount in USDC, and optional description
3. Click **Generate Link** → you get a URL like `http://localhost:3000/pay/clxxxxx`
4. Share that URL with anyone you want to pay you

### Receiving a Payment

When someone opens your payment link:
1. They connect their MetaMask wallet
2. They see the amount and your address
3. They click **"Pay X USDC"** → MetaMask pops up
4. They confirm → USDC is sent directly to your wallet
5. The link status updates from PENDING → COMPLETED

### How USDC Works on Arc

On Arc Network, **USDC is the native gas token** (like ETH on Ethereum).
This means:
- Paying = a regular native transfer (no ERC20 approve needed)
- Gas fees are also paid in USDC
- Amounts use 18 decimal places in the code (e.g. 1 USDC = `1000000000000000000` wei)

---

## 📁 Project Structure

```
arcwave/
├── app/
│   ├── page.tsx              ← Dashboard (your payment links)
│   ├── pay/[linkId]/         ← Payment page (shared with payers)
│   └── api/links/            ← Backend API routes
├── components/
│   ├── Navbar.tsx            ← Top navigation
│   ├── BalanceCard.tsx       ← Your USDC balance display
│   ├── CreateLinkForm.tsx    ← Form to generate new links
│   ├── PaymentLinksTable.tsx ← Table of all your links
│   └── PayPage.tsx           ← Payment UI for payers
├── lib/
│   ├── arcChain.ts           ← Arc Testnet configuration
│   ├── arcClient.ts          ← viem client for server-side reads
│   ├── db.ts                 ← Prisma database client
│   └── utils.ts              ← Helper functions
├── prisma/
│   └── schema.prisma         ← Database schema
└── providers/
    └── Web3Provider.tsx      ← wagmi + RainbowKit setup
```

---

## 🌐 Deploying to Vercel (Free)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial ArcWave commit"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/arcwave.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to **https://vercel.com** → Sign in with GitHub
2. Click **"Add New Project"** → Import your `arcwave` repo
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` = your project ID
   - `DATABASE_URL` = your Postgres URL (see below)
4. Click **Deploy**

### 3. Switch to Postgres (for production)

SQLite doesn't work on Vercel. Use **Neon** (free hosted Postgres):
1. Go to **https://neon.tech** → create a free project
2. Copy the connection string
3. In your `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`
4. Set `DATABASE_URL` in Vercel to your Neon connection string
5. Run `npx prisma migrate deploy` or add it to your build command

---

## 🔧 Useful Commands

```bash
npm run dev          # Start local dev server (http://localhost:3000)
npm run build        # Build for production
npm run db:push      # Sync database schema (run after schema changes)
npm run db:studio    # Open Prisma Studio (visual database browser)
```

---

## 🔗 Resources

| Resource | URL |
|---|---|
| Arc Network | https://www.arc.network |
| Arc Docs | https://docs.arc.network/build |
| Arc Testnet Explorer | https://testnet.arcscan.app |
| Circle Faucet | https://faucet.circle.com |
| Circle Console | https://console.circle.com |
| Circle Dev Docs | https://developers.circle.com |
| WalletConnect Cloud | https://cloud.walletconnect.com |
| Neon (free Postgres) | https://neon.tech |
| Vercel (free hosting) | https://vercel.com |

---

## 🚧 Future Improvements

- [ ] Email notifications when payment is received
- [ ] Expiry dates for payment links
- [ ] Multiple payment links per request (split payments)
- [ ] Circle Wallets API integration for custodial payments
- [ ] Payment history with transaction details from ArcScan API
- [ ] QR code generation for payment links
- [ ] Webhook support for payment notifications

---

Built with ❤️ on Arc Network · Powered by Circle
