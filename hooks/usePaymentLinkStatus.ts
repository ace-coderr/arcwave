// hooks/usePaymentLinkStatus.ts
// Custom hook that polls the API to check if a payment link has been paid.
// Used by the PayPage to auto-update status after a transaction is submitted.

import { useState, useEffect, useRef } from "react";

interface PaymentLinkStatus {
  status: "ACTIVE" | "COMPLETED" | "EXPIRED";
  txHash?: string;
  paidBy?: string;
}

interface UsePaymentLinkStatusOptions {
  linkId: string;
  enabled?: boolean;          // Set to true after a payment is submitted
  pollIntervalMs?: number;     // How often to poll (default 5 seconds)
  maxAttempts?: number;        // Stop polling after N attempts (default 24 = 2 minutes)
}

export function usePaymentLinkStatus({
  linkId,
  enabled = false,
  pollIntervalMs = 5000,
  maxAttempts = 24,
}: UsePaymentLinkStatusOptions) {
  const [status, setStatus] = useState<PaymentLinkStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const attemptsRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch(`/api/links/${linkId}`);
      if (!res.ok) return;

      const data = await res.json();
      const link = data.link;

      setStatus({
        status: link.status,
        txHash: link.txHash,
        paidBy: link.paidBy,
      });

      // Stop polling when payment is complete or expired
      if (link.status === "COMPLETED" || link.status === "EXPIRED") {
        stopPolling();
        return;
      }

      // Stop after max attempts
      attemptsRef.current += 1;
      if (attemptsRef.current >= maxAttempts) {
        stopPolling();
      }
    } catch (err) {
      console.error("Status check failed:", err);
    }
  };

  const startPolling = () => {
    if (intervalRef.current) return;
    setIsPolling(true);
    attemptsRef.current = 0;
    checkStatus(); // Check immediately
    intervalRef.current = setInterval(checkStatus, pollIntervalMs);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  };

  useEffect(() => {
    if (enabled && !isPolling) {
      startPolling();
    }
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, linkId]);

  return { status, isPolling };
}
