import nodemailer from "nodemailer";
import { getDb } from "../../lib/db.js";
import { signDeliveryToken, tokenTTLSeconds } from "../../lib/crypto.js";

const PUBLIC_URL = process.env.PUBLIC_URL || "http://127.0.0.1:8080";

function getMailer(){
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "0") === "1";
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure, auth:{ user, pass } });
}

export async function sendDeliveryEmailForOrder(orderId, email){
  const transporter = getMailer();
  if (!transporter) return;

  const db = getDb();
  const items = db.prepare("SELECT product_id, title, qty FROM order_items WHERE order_id=?").all(orderId);
  const exp = Math.floor(Date.now()/1000) + tokenTTLSeconds();
  const ttlHours = Math.round(tokenTTLSeconds()/3600);

  const links = items.map(it => ({
    title: it.title,
    qty: it.qty,
    link: `${PUBLIC_URL}/api/delivery/download/${signDeliveryToken({ sid: orderId, pid: it.product_id, exp })}`
  }));

  const from = process.env.FROM_EMAIL || "no-reply@example.com";
  const brand = "PDF-Ready";
  const subject = `${brand} — Your downloads (Order ${orderId})`;
  const text = [
    `Thanks for your purchase!`,
    ``,
    `Order: ${orderId}`,
    ``,
    `Downloads (links expire in ${ttlHours} hours):`,
    ``,
    ...links.map(l => `- ${l.title} (x${l.qty})\n  ${l.link}`),
    ``,
    `Support: support@yourdomain.com`
  ].join("\n");

  await transporter.sendMail({ from, to: email, subject, text });
}
