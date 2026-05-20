-- CreateTable
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "stealthAddress" TEXT,
    "stealthPrivateKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "txHash" TEXT,
    "forwardTxHash" TEXT,
    "paidBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowLink" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" TEXT NOT NULL,
    "sellerAddress" TEXT NOT NULL,
    "sellerContact" TEXT,
    "buyerAddress" TEXT,
    "stealthAddress" TEXT NOT NULL,
    "stealthPrivateKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "txHash" TEXT,
    "releaseTxHash" TEXT,
    "feeTxHash" TEXT,
    "paidAt" TIMESTAMP(3),
    "deliveryDays" INTEGER,
    "deliveryDeadline" TIMESTAMP(3),
    "releaseDeadline" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "disputeDeadline" TIMESTAMP(3),
    "sellerRespondedAt" TIMESTAMP(3),
    "buyerLastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowMessage" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "senderAddress" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "X402Payment" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "payer" TEXT NOT NULL,
    "payTo" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "X402Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "X402Payment_txHash_key" ON "X402Payment"("txHash");

-- AddForeignKey
ALTER TABLE "EscrowMessage" ADD CONSTRAINT "EscrowMessage_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "EscrowLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
