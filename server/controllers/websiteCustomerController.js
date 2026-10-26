import crypto from 'crypto';
import WebsiteCustomer from '../models/WebsiteCustomer.js';
import Wishlist from '../models/Wishlist.js';
import WebsiteBooking from '../models/WebsiteBooking.js';
import Settings from '../models/Settings.js';
import { signWebsiteToken } from '../middleware/websiteAuth.js';
import { sendMail } from '../utils/mailer.js';
import { logActivity } from '../utils/activityLog.js';
import { publicUrl, removeFile } from '../utils/upload.js';
import { buildBookingBillPdf } from '../utils/bookingBillPdf.js';

const normEmail = (e) => (e || '').trim().toLowerCase();

// Build an absolute URL for a stored relative /uploads path (so the website can load the image).
const absUrl = (req, p) => (!p ? null : (/^https?:\/\//i.test(p) ? p : `${req.protocol}://${req.get('host')}${p}`));
// The customer's public profile with the profile image made absolute (v59).
const customerPublic = (req, c) => ({ ...c.toPublic(), customer_profile_image: absUrl(req, c.customer_profile_image) });

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
  res.json({ customer: customerPublic(req, req.websiteCustomer) });   // includes absolute customer_profile_image (v59)
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

  // Profile image upload (v59). Field name: customer_profile_image (multipart/form-data).
  if (req.file) {
    const oldImage = me.customer_profile_image;
    patch.customer_profile_image = publicUrl(req, req.file);
    if (oldImage) removeFile(oldImage);   // clean up the previous file
  }

  try {
    Object.assign(me, patch);
    await me.save();
    await logActivity(req, { action: 'UPDATE', module: 'WebsiteAuth', recordId: me._id, recordLabel: me.email, message: 'Website customer profile updated' });
    res.json({ message: 'Profile updated.', customer: customerPublic(req, me) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'That email or mobile is already in use.' });
    res.status(500).json({ message: 'Could not update the profile. Please try again.' });
  }
};

// POST /api/public/customer/logout   (auth)
// The customer token is a stateless JWT, so sign-out is completed client-side by discarding the
// token (there is no server-side session to destroy). This endpoint acknowledges the logout and
// records it in the activity log; it does not blacklist the token.
export const logout = async (req, res) => {
  await logActivity(req, {
    action: 'LOGOUT', module: 'WebsiteAuth', recordId: req.websiteCustomer._id,
    recordLabel: req.websiteCustomer.email, message: 'Website customer signed out',
  });
  res.json({ message: 'Logged out. Please discard your access token.' });
};

// GET /api/public/customer/bookings            (auth) -> all of this customer's bookings, grouped
// GET /api/public/customer/bookings/:type      (auth) -> one list; type can also be ?type=
//   types: pending | paid | failed | cancelled | upcoming | completed | all
// Grouping rules (documented assumptions):
//   pending   = paymentStatus PENDING and not cancelled
//   paid      = paymentStatus PAID (includes a later-cancelled booking that was paid)
//   failed    = paymentStatus FAILED
//   cancelled = booking status CANCELLED
//   upcoming  = paid, not cancelled, travelDate today-or-later
//   completed = paid, not cancelled, travelDate in the past
export const myBookings = async (req, res) => {
  const now = new Date();
  const rows = await WebsiteBooking.find({ websitecustomer_id: req.websiteCustomer._id })
    .populate('packageId', 'name slug bannerImage')
    .sort({ createdAt: -1 })
    .lean();

  const isCancelled = (b) => b.status === 'CANCELLED';
  const isPaid = (b) => b.paymentStatus === 'PAID';
  const travel = (b) => (b.travelDate ? new Date(b.travelDate) : null);

  const groups = {
    pending:   rows.filter((b) => b.paymentStatus === 'PENDING' && !isCancelled(b)),
    paid:      rows.filter((b) => isPaid(b)),
    failed:    rows.filter((b) => b.paymentStatus === 'FAILED'),
    cancelled: rows.filter(isCancelled),
    upcoming:  rows.filter((b) => isPaid(b) && !isCancelled(b) && travel(b) && travel(b) >= now),
    completed: rows.filter((b) => isPaid(b) && !isCancelled(b) && travel(b) && travel(b) < now),
  };

  const type = String(req.params.type || req.query.type || '').toLowerCase();
  if (type && type !== 'all') {
    if (!(type in groups)) return res.status(400).json({ message: 'Unknown booking type.' });
    return res.json({ type, count: groups[type].length, bookings: groups[type] });
  }

  res.json({
    counts: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])),
    ...groups,
  });
};

// GET /api/public/customer/wishlist   (auth) -> this customer's wishlist with package details
export const myWishlist = async (req, res) => {

  // v59: return the FULL package detail (all fields), not just a few.
  const rows = await Wishlist.find({ websitecustomer_id: req.websiteCustomer._id })
    .populate('package_id')
    .sort({ createdAt: -1 });
  res.json(rows);
};

// POST /api/public/customer/wishlist-delete   (auth)   body: { package_id } or { id }
// Removes ONE wishlist record belonging to the signed-in customer. The customer is taken from the
// auth token, so a customer can only delete their own wishlist entries (never another customer's).
export const deleteWishlist = async (req, res) => {
  const { package_id, id } = req.body || {};
  if (!package_id && !id) return res.status(400).json({ message: 'package_id or id is required.' });

  // Always scope by the authenticated customer so ownership can't be bypassed via the body.
  const filter = { websitecustomer_id: req.websiteCustomer._id };
  if (id) filter._id = id; else filter.package_id = package_id;

  const result = await Wishlist.deleteOne(filter);
  if (!result.deletedCount) return res.status(404).json({ message: 'Wishlist item not found.' });
  res.json({ message: 'Removed from wishlist.', deleted: result.deletedCount });
};


// POST /api/public/customer/bookings/cancel   (auth)   body: { booking_id, cancel_reason }
// The signed-in customer cancels ONE of their own website bookings. Scoped by the auth token, so a
// customer can only cancel a booking that belongs to them. Idempotent on an already-cancelled booking.
export const cancelMyBooking = async (req, res) => {
  const { booking_id, cancel_reason } = req.body || {};
  if (!booking_id) return res.status(400).json({ message: 'booking_id is required.' });

  const booking = await WebsiteBooking
    .findOne({ _id: booking_id, websitecustomer_id: req.websiteCustomer._id })
    .catch(() => null);
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });
  if (booking.status === 'CANCELLED') {
    return res.status(400).json({ message: 'This booking is already cancelled.', bookingNo: booking.bookingNo, status: 'CANCELLED' });
  }

  booking.status = 'CANCELLED';
  booking.cancelReason = (cancel_reason || '').toString().trim();
  booking.cancelledAt = new Date();
  await booking.save();

  await logActivity(req, {
    action: 'CANCEL', module: 'WebsiteBooking', recordId: booking._id, recordLabel: booking.bookingNo,
    message: 'Website booking cancelled by customer', meta: { reason: booking.cancelReason },
  });
  res.json({ message: 'Booking cancelled.', bookingNo: booking.bookingNo, status: booking.status });
};

// POST /api/public/customer/bookings/bill   (auth)   body: { booking_id }
// Streams a PDF bill/receipt for ONE of the signed-in customer's bookings.
export const downloadMyBookingBill = async (req, res) => {
  const { booking_id } = req.body || {};
  if (!booking_id) return res.status(400).json({ message: 'booking_id is required.' });

  const booking = await WebsiteBooking
    .findOne({ _id: booking_id, websitecustomer_id: req.websiteCustomer._id })
    .catch(() => null);
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });

  const settings = await Settings.getSettings();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${booking.bookingNo || 'booking'}.pdf"`);
  buildBookingBillPdf({ booking, settings }, res);
};
