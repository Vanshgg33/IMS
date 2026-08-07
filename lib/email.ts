import nodemailer from "nodemailer";
import { connectDB } from "@/lib/db";
import Settings from "@/models/Settings";

function esc(str: string | number): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ReorderAlert {
  productName: string;
  variantLabel: string;
  sku: string;
  store: string;
  qty: number;
  reorderLevel: number;
}

function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: { user, pass },
  });
}

export async function sendLowStockAlert(alerts: ReorderAlert[]): Promise<void> {
  if (alerts.length === 0) return;

  // fetch recipients from DB (set via Settings UI); fall back to env vars
  let recipientList: string[] = [];
  try {
    await connectDB();
    const settings = await Settings.findById("global");
    if (settings?.alertEmails?.length) {
      recipientList = settings.alertEmails;
    }
  } catch (dbErr) {
    console.warn("[email] Could not read alert recipients from DB, falling back to env vars:", dbErr);
  }

  if (!recipientList.length) {
    recipientList = [process.env.ALERT_EMAIL_1, process.env.ALERT_EMAIL_2]
      .filter((e): e is string => Boolean(e?.trim()));
  }

  const recipients = recipientList.join(", ");

  if (!recipients) {
    console.warn("[email] No alert recipients configured — skipping low stock alert");
    return;
  }

  const transporter = createTransporter();
  if (!transporter) {
    console.warn("[email] EMAIL_HOST / EMAIL_USER / EMAIL_PASS not configured — skipping low stock alert");
    return;
  }

  const STORE_LABEL: Record<string, string> = {
    raipur: "Raipur",
    bhilai: "Bhilai",
    rajnandgaon: "Rajnandgaon",
  };

  const subject =
    alerts.length === 1
      ? `⚠ Low Stock — ${alerts[0].productName} ${alerts[0].variantLabel} (${STORE_LABEL[alerts[0].store] ?? alerts[0].store})`.replace(/&/g, "and")
      : `⚠ Low Stock Alert — ${alerts.length} items need restocking`;

  const rows = alerts
    .map(
      (a) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #F3EDE3;font-weight:600;color:#1C130A">
          ${esc(a.productName)} <span style="font-weight:400;color:#9B7B55">${esc(a.variantLabel)}</span>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #F3EDE3;font-family:monospace;font-size:12px;color:#9B7B55">
          ${esc(a.sku)}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #F3EDE3;text-transform:capitalize;color:#5C3D1E">
          ${esc(STORE_LABEL[a.store] ?? a.store)}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #F3EDE3;font-weight:700;color:#B91C1C;font-family:monospace">
          ${esc(a.qty)}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #F3EDE3;font-family:monospace;color:#9B7B55">
          ${esc(a.reorderLevel)}
        </td>
      </tr>`
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#FAF6EE;font-family:'Segoe UI',Arial,sans-serif">
      <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #E5D9C3;border-radius:12px;overflow:hidden">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1B3A2D,#14532D);padding:28px 32px">
          <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(253,248,240,0.55)">NatureLite IMS</p>
          <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;color:#FDF8F0">
            ⚠ Low Stock Alert
          </h1>
        </div>

        <!-- Body -->
        <div style="padding:28px 32px">
          <p style="margin:0 0 20px;font-size:14px;color:#5C3D1E;line-height:1.6">
            The following ${alerts.length === 1 ? "item has" : `${alerts.length} items have`} reached or fallen below
            ${alerts.length === 1 ? "its" : "their"} reorder level and may need restocking:
          </p>

          <table style="width:100%;border-collapse:collapse;border:1px solid #E5D9C3;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#FAF6EE">
                <th style="padding:10px 14px;text-align:left;font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:#9B7B55;font-weight:700;border-bottom:1px solid #E5D9C3">Product</th>
                <th style="padding:10px 14px;text-align:left;font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:#9B7B55;font-weight:700;border-bottom:1px solid #E5D9C3">SKU</th>
                <th style="padding:10px 14px;text-align:left;font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:#9B7B55;font-weight:700;border-bottom:1px solid #E5D9C3">Store</th>
                <th style="padding:10px 14px;text-align:left;font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:#9B7B55;font-weight:700;border-bottom:1px solid #E5D9C3">Current</th>
                <th style="padding:10px 14px;text-align:left;font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:#9B7B55;font-weight:700;border-bottom:1px solid #E5D9C3">Reorder At</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div style="margin-top:24px;padding:14px 18px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px">
            <p style="margin:0;font-size:13px;color:#92400E;font-weight:600">
              Action required: please restock ${alerts.length === 1 ? "this item" : "these items"} at the earliest.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:16px 32px;background:#FAF6EE;border-top:1px solid #E5D9C3">
          <p style="margin:0;font-size:11px;color:#9B7B55">
            NatureLite IMS · Automated inventory alert · Do not reply to this email
          </p>
        </div>
      </div>
    </body>
    </html>`;

  await transporter.sendMail({
    from: `"NatureLite IMS" <${process.env.EMAIL_USER}>`,
    to: recipients,
    subject,
    html,
  });
}
