import nodemailer from 'nodemailer';
import { config } from '../config.js';

// Keeps the last N sent messages in memory so tests (and local dev without
// real SMTP creds) can read OTP/reset codes back out without a mail server.
export const outbox = [];
const MAX_OUTBOX = 50;

let transporter = null;
if (config.smtp.host) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
}

export async function sendMail({ to, subject, text }) {
  outbox.push({ to, subject, text, sentAt: new Date().toISOString() });
  if (outbox.length > MAX_OUTBOX) outbox.shift();

  if (!transporter) {
    // No SMTP configured — this is expected in local dev. Log so the
    // developer can still complete the OTP/reset flow from the console.
    console.log(`[mailer] (no SMTP configured, logging instead) To: ${to} | Subject: ${subject}\n${text}`);
    return;
  }

  await transporter.sendMail({ from: config.smtp.from, to, subject, text });
}
