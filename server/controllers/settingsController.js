import Settings from '../models/Settings.js';
import { sendMail } from '../utils/mailer.js';

// Never leak the SMTP password to the client.
const MASK = '********';
const SECRET_FIELDS = ['smtpPassword', 'razorpayKeySecret', 'stripeSecretKey', 'stripeWebhookSecret'];

const safe = (s) => {
  const o = s.toObject ? s.toObject() : { ...s };
  for (const f of SECRET_FIELDS) o[f] = o[f] ? MASK : '';
  return o;
};

export const getSettings = async (req, res) => {
  const s = await Settings.getSettings();
  res.json(safe(s));
};

export const updateSettings = async (req, res) => {
  const s = await Settings.getSettings();
  const body = { ...req.body };

  // Keep the stored secret if the client sent back the masked placeholder.
  for (const f of SECRET_FIELDS) {
    if (!body[f] || body[f] === MASK) delete body[f];
  }

  delete body.key;
  Object.assign(s, body);
  await s.save();
  res.json(safe(s));
};

// Send a test email to verify SMTP settings
export const testSmtp = async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ message: 'Recipient email is required' });

  const s = await Settings.getSettings();
  const result = await sendMail({
    to,
    subject: `SMTP test — ${s.companyName}`,
    html: `<p>Your SMTP settings are working correctly.</p><p>— ${s.companyName}</p>`,
  });

  if (!result.sent) return res.status(400).json({ message: result.error || 'Failed to send test email' });
  res.json({ message: `Test email sent to ${to}` });
};
