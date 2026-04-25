"use client";

import { useEffect, useState } from "react";

interface ExpiryCountdownProps {
  expiresAt: string;
  onExpired: () => void;
}

export function ExpiryCountdown({ expiresAt, onExpired }: ExpiryCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setSecondsLeft(0);
        setExpired(true);
        onExpired();
      } else {
        setSecondsLeft(diff);
      }
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (expired) return <span className="expiry-expired">Expired</span>;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = secondsLeft < 300;

  return (
    <span className={`expiry-countdown${isUrgent ? " urgent" : ""}`}>
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}
