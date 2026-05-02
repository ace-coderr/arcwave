"use client";

import { NavBar } from "@/components/NavBar";
import { PaymentLinksTable } from "@/components/PaymentLinksTable";
import { useState } from "react";

export default function LinksPage() {
  const [refresh, setRefresh] = useState(0);
  return (
    <div className="app">
      <NavBar />
      <div className="page-wrap">
        <div className="page-header">
          <h1 className="page-title">Payment Links</h1>
          <p className="page-subtitle">All your payment links — active, completed, and expired</p>
        </div>
        <PaymentLinksTable refreshTrigger={refresh} />
      </div>
    </div>
  );
}
