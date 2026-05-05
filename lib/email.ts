// lib/email.ts
// Resend email notifications for Conduit payment events

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = "Conduit <onboarding@resend.dev>";
const APP_URL = "https://conduit-pay.vercel.app";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("[email] Resend error:", err);
    } else {
      console.log(`[email] Sent to ${to}: ${subject}`);
    }
  } catch (err: any) {
    console.error("[email] Failed to send:", err.message);
  }
}

function baseTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
    </head>
    <body style="margin:0;padding:0;background:#08090e;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#08090e;padding:40px 20px;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#111318;border:1px solid #1e2433;border-radius:16px;overflow:hidden;max-width:480px;width:100%;">

            <!-- Top bar -->
            <tr><td style="height:3px;background:#00E5A0;"></td></tr>

            <!-- Header -->
            <tr><td style="padding:28px 32px 20px;">
              <img src="${APP_URL}/conduit-logo-white.png" alt="Conduit" height="28" style="display:block;"/>
            </td></tr>

            <!-- Content -->
            <tr><td style="padding:0 32px 32px;">
              ${content}
            </td></tr>

            <!-- Footer -->
            <tr><td style="padding:20px 32px;border-top:1px solid #1e2433;">
              <p style="margin:0;font-size:11px;color:#424d5e;font-family:'Courier New',monospace;">
                conduit-pay.vercel.app · Built on Arc Network · Powered by Circle
              </p>
            </td></tr>

            <!-- Bottom bar -->
            <tr><td style="height:2px;background:#00E5A0;opacity:0.35;"></td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

// ── 1. Link Created ────────────────────────────────────────────
export async function sendLinkCreatedEmail({
  to, title, amount, linkId, expiresAt,
}: {
  to: string;
  title: string;
  amount: string;
  linkId: string;
  expiresAt?: Date | null;
}): Promise<void> {
  const payUrl = `${APP_URL}/pay/${linkId}`;
  const expiryLine = expiresAt
    ? `<p style="margin:0 0 16px;font-size:13px;color:#f5a623;">⏰ Expires: ${new Date(expiresAt).toLocaleString("en", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>`
    : "";

  await sendEmail({
    to,
    subject: `Payment link created — ${title}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#f8fafc;letter-spacing:-0.03em;">Payment Link Created ✅</h2>
      <p style="margin:0 0 24px;font-size:13px;color:#8892a4;">Your payment link is live and ready to share.</p>

      <div style="background:#0d0f17;border:1px solid #1e2433;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:11px;color:#424d5e;font-family:'Courier New',monospace;letter-spacing:0.1em;text-transform:uppercase;">Link Details</p>
        <p style="margin:0 0 12px;font-size:16px;font-weight:800;color:#f8fafc;">${title}</p>
        <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:#00E5A0;font-family:'Courier New',monospace;">${amount} <span style="font-size:14px;">USDC</span></p>
        ${expiryLine}
        <a href="${payUrl}" style="display:inline-block;background:#00E5A0;color:#000;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:8px;">Share Payment Link →</a>
      </div>

      <p style="margin:0;font-size:11px;color:#424d5e;font-family:'Courier New',monospace;">${payUrl}</p>
    `),
  });
}

// ── 2. Payment Received ────────────────────────────────────────
export async function sendPaymentReceivedEmail({
  to, title, amount, txHash, paidBy, linkId,
}: {
  to: string;
  title: string;
  amount: string;
  txHash: string;
  paidBy?: string;
  linkId: string;
}): Promise<void> {
  const txUrl = `https://testnet.arcscan.app/tx/${txHash}`;
  const dashboardUrl = `${APP_URL}/transactions`;
  const shortPayer = paidBy ? `${paidBy.slice(0, 6)}...${paidBy.slice(-4)}` : "Unknown";
  const shortTx = `${txHash.slice(0, 10)}...${txHash.slice(-6)}`;

  await sendEmail({
    to,
    subject: `💰 You received ${amount} USDC — ${title}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#f8fafc;letter-spacing:-0.03em;">Payment Received 💰</h2>
      <p style="margin:0 0 24px;font-size:13px;color:#8892a4;">Someone just paid your Conduit link.</p>

      <div style="background:#0d0f17;border:1px solid rgba(0,229,160,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:11px;color:#424d5e;font-family:'Courier New',monospace;letter-spacing:0.1em;text-transform:uppercase;">Payment Details</p>
        <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#f8fafc;">${title}</p>
        <p style="margin:0 0 16px;font-size:36px;font-weight:900;color:#00E5A0;font-family:'Courier New',monospace;">+${amount} <span style="font-size:16px;">USDC</span></p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-top:1px solid #1e2433;">
              <span style="font-size:11px;color:#424d5e;">From</span>
            </td>
            <td align="right" style="padding:8px 0;border-top:1px solid #1e2433;">
              <span style="font-size:11px;color:#8892a4;font-family:'Courier New',monospace;">${shortPayer}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-top:1px solid #1e2433;">
              <span style="font-size:11px;color:#424d5e;">TX Hash</span>
            </td>
            <td align="right" style="padding:8px 0;border-top:1px solid #1e2433;">
              <a href="${txUrl}" style="font-size:11px;color:#00E5A0;font-family:'Courier New',monospace;text-decoration:none;">${shortTx} ↗</a>
            </td>
          </tr>
        </table>
      </div>

      <a href="${dashboardUrl}" style="display:inline-block;background:#00E5A0;color:#000;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px;text-decoration:none;">View Transactions →</a>
    `),
  });
}

// ── 3. Link Cancelled ──────────────────────────────────────────
export async function sendLinkCancelledEmail({
  to, title, amount,
}: {
  to: string;
  title: string;
  amount: string;
}): Promise<void> {
  await sendEmail({
    to,
    subject: `Payment link cancelled — ${title}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#f8fafc;letter-spacing:-0.03em;">Link Cancelled</h2>
      <p style="margin:0 0 24px;font-size:13px;color:#8892a4;">Your payment link has been cancelled and is no longer active.</p>

      <div style="background:#0d0f17;border:1px solid #1e2433;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:11px;color:#424d5e;font-family:'Courier New',monospace;letter-spacing:0.1em;text-transform:uppercase;">Cancelled Link</p>
        <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#f8fafc;">${title}</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#f03e5f;font-family:'Courier New',monospace;">${amount} USDC</p>
      </div>

      <a href="${APP_URL}" style="display:inline-block;background:#111318;border:1px solid #1e2433;color:#8892a4;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px;text-decoration:none;">Create New Link →</a>
    `),
  });
}

// ── 4. Link Expired ────────────────────────────────────────────
export async function sendLinkExpiredEmail({
  to, title, amount,
}: {
  to: string;
  title: string;
  amount: string;
}): Promise<void> {
  await sendEmail({
    to,
    subject: `Payment link expired — ${title}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#f8fafc;letter-spacing:-0.03em;">Link Expired ⏰</h2>
      <p style="margin:0 0 24px;font-size:13px;color:#8892a4;">Your payment link has reached its expiry date and is no longer active.</p>

      <div style="background:#0d0f17;border:1px solid #1e2433;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:11px;color:#424d5e;font-family:'Courier New',monospace;letter-spacing:0.1em;text-transform:uppercase;">Expired Link</p>
        <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#f8fafc;">${title}</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#f5a623;font-family:'Courier New',monospace;">${amount} USDC</p>
      </div>

      <a href="${APP_URL}" style="display:inline-block;background:#00E5A0;color:#000;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px;text-decoration:none;">Create New Link →</a>
    `),
  });
}
