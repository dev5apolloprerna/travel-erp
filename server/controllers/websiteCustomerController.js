import crypto from 'crypto';
import WebsiteCustomer from '../models/WebsiteCustomer.js';
import Settings from '../models/Settings.js';
import { signWebsiteToken } from '../middleware/websiteAuth.js';
import { sendMail } from '../utils/mailer.js';
import { logActivity } from '../utils/activityLog.js';

const normEmail = (e) => (e || '').trim().toLowerCase();

// POST /api/public/customer/register
// body: { name, mobile, email, password, conform_passwrd }
export const register = async (req, res) => {
  const { name, mobile } = req.body || {};
  const email = normEmail(req.body?.email);
  const password = req.body?.password || '';
  const confirm = req.body?.conform_passwrd ?? req.body?.confirm_password ?? req.body?.confirmPassword;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'A valid email is required.' });
  if (confirm !== undefined && password !== confirm) return res.status(400).json({ message: 'Password and confirm password do not match.' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });

  if (await WebsiteCustomer.findOne({ email }))
    return res.status(400).json({ message: 'An account with this email already exists.' });

  const customer = new WebsiteCustomer({ name, mobile: mobile || '', email });
  await customer.setPassword(password);
  await customer.save();

  // Welcome email — best effort. A missing SMTP config (or any mail error) must NOT fail the signup.
  let emailSent = false;
  try {
    const s = await Settings.getSettings();
    const r = await sendMail({
      to: email,
      subject: `Welcome to ${s.companyName || 'our travel site'}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#15223b">
        <p>Hi ${name},</p><p>Welcome aboard! Your account has been created successfully.</p>
        <p>Happy travels,<br/>${s.companyName || ''}</p></div>`,
    });
    emailSent = !!r.sent;
    if (!r.sent) console.error('[register] welcome email NOT sent to', email, '-', r.error);
  } catch { /* ignore mail errors */ }

  await logActivity(req, {
    action: 'REGISTER', module: 'WebsiteAuth', recordId: customer._id, recordLabel: email,
    message: 'Website customer registered', meta: { emailSent },
  });
  res.status(201).json({ message: 'Registration successful.', token: signWebsiteToken(customer), customer: customer.toPublic(), emailSent });
};

// POST /api/public/customer/login   body: { email, password }
export const login = async (req, res) => {
  const email = normEmail(req.body?.email);
  const password = req.body?.password || '';
  const customer = await WebsiteCustomer.findOne({ email });
  if (!customer || !(await customer.comparePassword(password)))
    return res.status(401).json({ message: 'Invalid email or password.' });
  if (!customer.isActive) return res.status(403).json({ message: 'Your account is inactive.' });
  await logActivity(req, {
    action: 'LOGIN', module: 'WebsiteAuth', recordId: customer._id, recordLabel: customer.email,
    message: 'Website customer signed in',
  });
  res.json({ message: 'Login successful.', token: signWebsiteToken(customer), customer: customer.toPublic() });
};

// POST /api/public/customer/forgot-password   body: { email }
export const forgotPassword = async (req, res) => {
  const email = normEmail(req.body?.email);
  const customer = await WebsiteCustomer.findOne({ email });
  // Always respond the same way (do not reveal whether an email exists).
  if (customer) {
    const token = crypto.randomBytes(24).toString('hex');
    customer.resetToken = token;
    customer.resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await customer.save();

    const s = await Settings.getSettings();
    const base = process.env.CLIENT_URL || '';
    const link = `${base}/reset-password?token=${token}`;
    // sendMail never throws — it returns { sent, error }. Act on the real result so we neither
    // claim success on failure nor crash the request (req #6).
    const result = await sendMail({
      to: email,
      subject: `Reset your password — ${s.companyName || ''}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#15223b">
        <p>Hi ${customer.name},</p>
        <p>Use this token to reset your password (valid 1 hour): <b>${token}</b></p>
        ${base ? `<p>Or open: <a href="${link}">${link}</a></p>` : ''}
      </div>`,
    });
    // Record the technical outcome server-side (never the token/secret) so delivery failures are
    // visible instead of silently swallowed.
    if (!result.sent) console.error('[forgot-password] reset email NOT sent to', email, '-', result.error);
    // Activity log the request with success/failure status (req #5) — no token is stored.
    await logActivity(req, {
      action: 'FORGOT_PASSWORD', module: 'WebsiteAuth', recordId: customer._id, recordLabel: email,
      message: result.sent ? 'Password-reset email sent' : 'Password-reset email FAILED to send',
      meta: { emailSent: !!result.sent, reason: result.sent ? undefined : result.error },
    });
  }
  res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
};

// POST /api/public/customer/reset-password   body: { token, password, conform_passwrd }
export const resetPassword = async (req, res) => {
  const { token } = req.body || {};
  const password = req.body?.password || '';
  const confirm = req.body?.conform_passwrd ?? req.body?.confirm_password ?? req.body?.confirmPassword;
  if (!token || !password) return res.status(400).json({ message: 'Token and new password are required.' });
  if (confirm !== undefined && password !== confirm) return res.status(400).json({ message: 'Passwords do not match.' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });

  const customer = await WebsiteCustomer.findOne({ resetToken: token, resetExpires: { $gt: new Date() } });
  if (!customer) return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
  await customer.setPassword(password);
  customer.resetToken = null;
  customer.resetExpires = null;
  await customer.save();
  // Log the successful reset (req #5) — never the token or new password.
  await logActivity(req, {
    action: 'PASSWORD_RESET', module: 'WebsiteAuth', recordId: customer._id, recordLabel: customer.email,
    message: 'Website customer password reset via token',
  });
  res.json({ message: 'Your password has been reset. You can now log in.' });
};

// GET /api/public/customer/profile   (auth)
export const profile = async (req, res) => {
  res.json({ customer: req.websiteCustomer.toPublic() });
};

// POST /api/public/customer/change-password   (auth)   body: { currentPassword, newPassword, conform_passwrd }
export const changePassword = async (req, res) => {
  const current = req.body?.currentPassword || req.body?.current_password || '';
  const next = req.body?.newPassword || req.body?.new_password || '';
  const confirm = req.body?.conform_passwrd ?? req.body?.confirm_password ?? req.body?.confirmPassword;
  if (!current || !next) return res.status(400).json({ message: 'Current and new password are required.' });
  if (confirm !== undefined && next !== confirm) return res.status(400).json({ message: 'Passwords do not match.' });
  if (next.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  if (!(await req.websiteCustomer.comparePassword(current)))
    return res.status(400).json({ message: 'Current password is incorrect.' });
  await req.websiteCustomer.setPassword(next);
  await req.websiteCustomer.save();
  res.json({ message: 'Password changed successfully.' });
};

// v50 (Task 4): update the signed-in customer's own profile. Identity comes from the auth token
// (req.websiteCustomer) — a customer id in the body is never trusted. Only the supplied fields are
// changed (unspecified fields are preserved). Email/mobile uniqueness is enforced excluding self.
export const updateProfile = async (req, res) => {
  const me = req.websiteCustomer;
  const b = req.body || {};

  // Only update fields that were actually supplied (don't null-out omitted fields — req 4.3).
  const patch = {};
  if (b.name !== undefined) {
    if (!String(b.name).trim()) return res.status(400).json({ message: 'Name cannot be empty.' });
    patch.name = String(b.name).trim();
  }
  if (b.email !== undefined) {
    const email = normEmail(b.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'A valid email is required.' });
    if (email !== me.email) {
      const clash = await WebsiteCustomer.findOne({ email, _id: { $ne: me._id } });
      if (clash) return res.status(409).json({ message: 'That email is already in use.' });
      patch.email = email;   // auth is by token, so changing the email does not break the session
    }
  }
  if (b.mobile !== undefined) {
    const mobile = String(b.mobile).trim();
    if (mobile && !/^[+\d][\d\s-]{6,15}$/.test(mobile)) return res.status(400).json({ message: 'Please enter a valid mobile number.' });
    if (mobile && mobile !== me.mobile) {
      const clash = await WebsiteCustomer.findOne({ mobile, _id: { $ne: me._id } });
      if (clash) return res.status(409).json({ message: 'That mobile number is already in use.' });
    }
    patch.mobile = mobile;
  }
  for (const f of ['address', 'city', 'state', 'country']) {
    if (b[f] !== undefined) patch[f] = String(b[f]).trim();
  }

  try {
    Object.assign(me, patch);
    await me.save();
    await logActivity(req, { action: 'UPDATE', module: 'WebsiteAuth', recordId: me._id, recordLabel: me.email, message: 'Website customer profile updated' });
    res.json({ message: 'Profile updated.', customer: me.toPublic() });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'That email or mobile is already in use.' });
    res.status(500).json({ message: 'Could not update the profile. Please try again.' });
  }
};
