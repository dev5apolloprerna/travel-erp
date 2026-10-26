import nodemailer from 'nodemailer';
import Settings from '../models/Settings.js';

/**
 * Build a transporter from the SMTP settings saved in Company Profile Settings.
 * Returns null if SMTP isn't configured yet (so callers can degrade gracefully).
 */
export const getTransporter = async () => {
  const s = await Settings.getSettings();

  // Prefer the SMTP saved in Company Profile Settings; fall back to environment variables so a
  // deployment can configure mail without the UI (common cause of "no email sent" — Settings SMTP
  // was never filled in). Nothing is hardcoded; env is only a fallback.
  const host = s.smtpHost || process.env.SMTP_HOST || process.env.MAIL_HOST;
  const user = s.smtpUser || process.env.SMTP_USER || process.env.MAIL_USERNAME;
  const pass = s.smtpPassword || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.MAIL_PASSWORD;
  const port = Number(s.smtpPort || process.env.SMTP_PORT || process.env.MAIL_PORT || 587);
  const secure = s.smtpHost ? !!s.smtpSecure
    : /^(1|true|ssl)$/i.test(String(process.env.SMTP_SECURE ?? (port === 465 ? 'true' : 'false')));

  if (!host || !user) return null;   // genuinely not configured anywhere

  return nodemailer.createTransport({
    host,
    port,
    secure,                 // true for 465, false for 587/25
    auth: { user, pass },
  });
};

/**
 * Send an email. Never throws — returns { sent, error } so a failed mail
 * doesn't roll back the business action that triggered it.
 */
export const sendMail = async ({ to, subject, html, text, attachments = [] }) => {
  try {
    const s = await Settings.getSettings();
    const transporter = await getTransporter();
    if (!transporter) {
      return { sent: false, error: 'SMTP not configured. Add it in Settings → Company Profile.' };
    }

    const fromEmail = s.smtpFromEmail || process.env.SMTP_FROM || process.env.MAIL_FROM_ADDRESS
      || s.smtpUser || process.env.SMTP_USER || process.env.MAIL_USERNAME;
    const fromName = s.smtpFromName || process.env.SMTP_FROM_NAME || s.companyName || 'Travel ERP';
    const from = `"${fromName}" <${fromEmail}>`;

    const info = await transporter.sendMail({ from, to, subject, text, html, attachments });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('sendMail error:', err.message);
    return { sent: false, error: err.message };
  }
};

/** Credentials email used when creating a customer / B2B member. */
export const sendCredentialsMail = async ({ to, name, loginUrl, username, password, portal }) => {
  const s = await Settings.getSettings();
  return sendMail({
    to,
    subject: `Your ${portal} login — ${s.companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#15223b">
        <p>Dear ${name},</p>
        <p>Your ${portal} account has been created.</p>
        <table cellpadding="6" style="border-collapse:collapse">
          <tr><td><b>Login URL</b></td><td><a href="${loginUrl}">${loginUrl}</a></td></tr>
          <tr><td><b>Username</b></td><td>${username}</td></tr>
          <tr><td><b>Password</b></td><td>${password}</td></tr>
        </table>
        <p>Please change your password after first login.</p>
        <p>Regards,<br/>${s.companyName}</p>
      </div>`,
  });
};
