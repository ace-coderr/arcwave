// lib/fees.ts
// Conduit fee configuration

export const FEE_CONFIG = {
  percentage: 0.5, // 0.5%
  collectorAddress: "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c",
  minFee: 0.001, // minimum fee in USDC
};

export function calculateFee(amount: string): {
  fee: string;
  recipientAmount: string;
  feePercent: string;
} {
  const total = parseFloat(amount);
  const feeAmount = Math.max(
    (total * FEE_CONFIG.percentage) / 100,
    FEE_CONFIG.minFee
  );
  const recipientAmount = total - feeAmount;

  return {
    fee: feeAmount.toFixed(4),
    recipientAmount: recipientAmount.toFixed(4),
    feePercent: `${FEE_CONFIG.percentage}%`,
  };
}
