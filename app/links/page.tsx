"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { CreateLinkForm } from "@/components/CreateLinkForm";
import { PaymentLinksTable } from "@/components/PaymentLinksTable";

export default function LinksPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <TopBar />
        <main className="page-content">
          <div className="page-header">
            <h1 className="page-title">Payment Links</h1>
            <p className="page-subtitle">Create and manage all your USDC payment links</p>
          </div>

          <div className="dashboard-grid">
            <CreateLinkForm onLinkCreated={() => setRefreshTrigger((n) => n + 1)} />
            <PaymentLinksTable refreshTrigger={refreshTrigger} />
          </div>
        </main>
        <footer className="page-footer">
          <span>ArcWave v0.1.0</span>
          <span>Powered by Arc Network & Circle</span>
        </footer>
      </div>
    </div>
  );
}
