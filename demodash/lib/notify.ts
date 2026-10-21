import nodemailer from "nodemailer";
import { db } from "./db";
import { config } from "./config";
import { dateTime, mapsLink, inr } from "./format";

type Channel = "EMAIL" | "SMS" | "WHATSAPP";

async function log(type: string, channel: Channel, recipient: string, status: "SENT" | "FAILED" | "SKIPPED", payload: unknown, error?: string) {
  try {
    await db.notificationLog.create({
      data: { type, channel, recipient, status, error, payload: payload as object },
    });
  } catch (e) {
    console.error("[notify] failed to write NotificationLog", e);
  }
}

let transporter: nodemailer.Transporter | null | undefined;
function getTransporter() {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  transporter = host
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : null;
  return transporter;
}

export async function sendEmail(type: string, to: string, subject: string, html: string, text: string) {
  const t = getTransporter();
  if (!t) {
    console.log(`[email:console] to=${to} subject="${subject}"\n${text}\n`);
    return log(type, "EMAIL", to, "SKIPPED", { subject, text }, "SMTP not configured (logged to console)");
  }
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM || "DemoDash <no-reply@localhost>", to, subject, html, text });
    await log(type, "EMAIL", to, "SENT", { subject });
  } catch (e) {
    console.error("[email] send failed", e);
    await log(type, "EMAIL", to, "FAILED", { subject }, (e as Error).message);
  }
}

function toE164(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return `+${d}`;
  return d.length === 10 ? `+91${d}` : `+${d}`;
}

export async function sendSms(type: string, phone: string, message: string, opts: { whatsapp?: boolean } = {}) {
  const provider = (process.env.SMS_PROVIDER || "console").toLowerCase();
  const channel: Channel = opts.whatsapp ? "WHATSAPP" : "SMS";
  const payload = { message: type === "PHONE_OTP" ? "[redacted]" : message };

  try {
    if (provider === "twilio") {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = opts.whatsapp ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_FROM_NUMBER;
      if (!sid || !token || !from) throw new Error("Twilio is not fully configured");
      const to = opts.whatsapp ? `whatsapp:${toE164(phone)}` : toE164(phone);
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: message }),
      });
      if (!res.ok) throw new Error(`Twilio ${res.status}: ${(await res.text()).slice(0, 200)}`);
    } else if (provider === "msg91") {
      const key = process.env.MSG91_AUTH_KEY;
      const template = process.env.MSG91_TEMPLATE_ID;
      if (!key || !template) throw new Error("MSG91 is not fully configured");
      const res = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: { authkey: key, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          template_id: template,
          short_url: "0",
          recipients: [{ mobiles: toE164(phone).replace("+", ""), [process.env.MSG91_VAR_NAME || "message"]: message }],
        }),
      });
      if (!res.ok) throw new Error(`MSG91 ${res.status}: ${(await res.text()).slice(0, 200)}`);
    } else {
      console.log(`[sms:console] to=${phone} :: ${message}`);
      return log(type, channel, phone, "SKIPPED", payload, "SMS provider is 'console' (printed to server log)");
    }
    await log(type, channel, phone, "SENT", payload);
  } catch (e) {
    console.error("[sms] send failed", e);
    await log(type, channel, phone, "FAILED", payload, (e as Error).message);
  }
}

export interface BookingNotifyData {
  code: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  address: string;
  lat?: number | null;
  lng?: number | null;
  preferredTime?: Date | null;
  notes?: string | null;
  product: string;
  price: number;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Sends owner + customer notifications. Never throws; failures are recorded in NotificationLog. */
export async function notifyBookingCreated(b: BookingNotifyData) {
  const when = b.preferredTime ? dateTime(b.preferredTime) : "ASAP";
  const map = mapsLink(b.lat, b.lng, b.address);
  const adminUrl = `${config.appUrl}/admin/bookings`;

  const adminText = [
    `New demo booking ${b.code}`,
    `Phone: ${b.product} (${inr(b.price)})`,
    `Customer: ${b.customerName} — ${b.customerPhone}`,
    `Address: ${b.address}`,
    `Map: ${map}`,
    `When: ${when}`,
    b.notes ? `Notes: ${b.notes}` : "",
    `Open dashboard: ${adminUrl}`,
  ].filter(Boolean).join("\n");

  const adminHtml = `<div style="font-family:system-ui,sans-serif;max-width:520px">
    <h2 style="margin:0 0 8px">New demo booking <span style="color:#5a2fe0">${esc(b.code)}</span></h2>
    <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
      <tr><td><b>Phone</b></td><td>${esc(b.product)} (${esc(inr(b.price))})</td></tr>
      <tr><td><b>Customer</b></td><td>${esc(b.customerName)}</td></tr>
      <tr><td><b>Mobile</b></td><td><a href="tel:${esc(b.customerPhone)}">${esc(b.customerPhone)}</a></td></tr>
      <tr><td><b>Address</b></td><td>${esc(b.address)}</td></tr>
      <tr><td><b>Map</b></td><td><a href="${esc(map)}">Open in Google Maps</a></td></tr>
      <tr><td><b>When</b></td><td>${esc(when)}</td></tr>
      ${b.notes ? `<tr><td><b>Notes</b></td><td>${esc(b.notes)}</td></tr>` : ""}
    </table>
    <p><a href="${esc(adminUrl)}" style="background:#5a2fe0;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Assign a delivery person</a></p>
  </div>`;

  const tasks: Promise<unknown>[] = [];

  for (const to of (process.env.ADMIN_NOTIFY_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean)) {
    tasks.push(sendEmail("BOOKING_CREATED_ADMIN", to, `New demo booking ${b.code} — ${b.product}`, adminHtml, adminText));
  }
  const adminPhone = process.env.ADMIN_NOTIFY_PHONE?.trim();
  const shortSms = `New demo ${b.code}: ${b.product}. ${b.customerName} ${b.customerPhone}. ${b.address.slice(0, 80)}. Map: ${map}`;
  if (adminPhone) tasks.push(sendSms("BOOKING_CREATED_ADMIN", adminPhone, shortSms));
  const adminWa = process.env.ADMIN_NOTIFY_WHATSAPP?.trim();
  if (adminWa) tasks.push(sendSms("BOOKING_CREATED_ADMIN", adminWa, adminText, { whatsapp: true }));

  const trackUrl = `${config.appUrl}/track/${b.code}`;
  tasks.push(
    sendSms(
      "BOOKING_CREATED_CUSTOMER",
      b.customerPhone,
      `${config.shopName}: your free demo of ${b.product} is booked. Booking ID ${b.code}. Track: ${trackUrl}`,
    ),
  );
  if (b.customerEmail) {
    tasks.push(
      sendEmail(
        "BOOKING_CREATED_CUSTOMER",
        b.customerEmail,
        `Your demo is booked — ${b.code}`,
        `<div style="font-family:system-ui,sans-serif"><h2>Your free demo is booked 🎉</h2>
        <p>${esc(b.product)} · ${esc(when)}</p><p>Booking ID: <b>${esc(b.code)}</b></p>
        <p><a href="${esc(trackUrl)}">Track your demo</a></p><p>— ${esc(config.shopName)}</p></div>`,
        `Your free demo of ${b.product} is booked. Booking ID ${b.code}. Track: ${trackUrl}`,
      ),
    );
  }

  await Promise.allSettled(tasks);
}
