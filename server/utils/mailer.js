import nodemailer from 'nodemailer';
import Settings from '../models/Settings.js';

/**
 * Build a transporter from the SMTP settings saved in Company Profile Settings.
 * Returns null if SMTP isn't configured yet (so callers can degrade gracefully).
 */
export const getTransporter = async () => {
  const s = await Settings.getSettings();
  if (!s.smtpHost || !s.smtpUser) return null;

  return nodemailer.createTransport({
    host: s.smtpHost,
    port: s.smtpPort || 587,
    secure: !!s.smtpSecure,           // true for 465, false for 587/25
    auth: { user: s.smtpUser, pass: s.smtpPassword },
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

    const from = s.smtpFromEmail
      ? `"${s.smtpFromName || s.companyName}" <${s.smtpFromEmail}>`
      : `"${s.smtpFromName || s.companyName}" <${s.smtpUser}>`;

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
