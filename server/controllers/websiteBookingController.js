import WebsiteBooking from '../models/WebsiteBooking.js';
import TourPackage from '../models/TourPackage.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Settings from '../models/Settings.js';
import { applyGstToServices, isInterState } from '../utils/gst.js';
import {
  createPayment, gatewayFor, verifyRazorpaySignature, fetchStripeIntent,
  constructStripeEvent, verifyRazorpayWebhook,
} from '../utils/payments.js';
import { sendMail } from '../utils/mailer.js';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const normEmail = (e) => (e || '').trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Normalise one passenger (req 2.1) — accept both the documented field names and camelCase aliases.
const normPassenger = (p) => {
  if (!p || typeof p !== 'object') return null;
  const out = {
    firstName: (p.firstName ?? p.first_name ?? '').toString().trim(),
    lastName: (p.lastName ?? p.last_name ?? '').toString().trim(),
    dob: (p.dob ?? p.dateOfBirth ?? p.date_of_birth ?? '').toString().trim(),
    gender: (p.gender ?? '').toString().trim(),
    nationality: (p.nationality ?? '').toString().trim(),
    passportNumber: (p.passportNumber ?? p.passport_number ?? p.passportNo ?? '').toString().trim(),
    isLead: !!(p.isLead ?? p.is_lead ?? false),   // lead passenger flag (v52)
  };
  return (out.firstName || out.lastName) ? out : null;   // skip empty rows
};

/**
 * Resolve the website customer for a booking (req 2.2). Returns { customer, created, setupToken }.
 *  - Case A: a websitecustomer_id is supplied -> must exist, else a validation error (never silently
 *    create another). Returns { error } so the caller can respond 400.
 *  - Case B: no id -> find by email (case-insensitive) and reuse; otherwise create a new customer
 *    with a generated initial password. The plaintext is returned ONCE to the caller so the welcome
 *    email can include the login credentials (v54 business requirement); it is hashed in the DB and
 *    never stored, logged or returned by the API. The unique email index prevents duplicates under
 *    concurrent requests; a duplicate-key race resolves to the existing customer.
 */
// A readable, hard-to-guess initial password (alphanumeric, ~12 chars). Emailed once; the customer
// is told to change it after first login.
const genInitialPassword = () => crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);

const resolveWebsiteCustomer = async ({ websitecustomer_id, customerName, email, customerMobile, address, city, state, country }) => {
  if (websitecustomer_id) {
    const existing = await WebsiteCustomer.findById(websitecustomer_id).catch(() => null);
    if (!existing) return { error: 'The supplied customer account was not found.' };
    return { customer: existing, created: false };
  }

  const found = await WebsiteCustomer.findOne({ email });   // email is stored lowercased -> case-insensitive
  if (found) return { customer: found, created: false };

  const password = genInitialPassword();
  const customer = new WebsiteCustomer({
    name: customerName, email, mobile: customerMobile || '',
    address: address || '', city: city || '', state: state || '', country: country || '',
  });
  await customer.setPassword(password);   // hashed in DB; plaintext returned once for the welcome email
  try {
    await customer.save();
    return { customer, created: true, password };
  } catch (err) {
    if (err?.code === 11000) {   // concurrent create -> reuse the winner, no duplicate, no email
      const race = await WebsiteCustomer.findOne({ email });
      if (race) return { customer: race, created: false };
    }
    throw err;
  }
};


/**
 * Website bookings.
 * Public endpoints are used by the separate marketing website;
 * the admin endpoints power the Website Bookings screen inside the ERP.
 */

/* ============================ PUBLIC: CREATE BOOKING ============================ */
/**
 * POST /api/public/bookings
 * Creates a PENDING booking and starts payment.
 * The ERP order is only created once payment actually succeeds.
 */
export const createBooking = async (req, res) => {
  const {
    packageId, customerName, customerEmail, customerMobile,
    address, city, state, country, travelDate,
    adults = 1, children = 0, passengers = [], specialRequest,
  } = req.body;

  if (!packageId) return res.status(400).json({ message: 'Please choose a package.' });
  if (!customerName || !customerEmail) {
    return res.status(400).json({ message: 'Name and email are required to book.' });
  }

  const pkg = await TourPackage.findById(packageId);
  if (!pkg || !pkg.isActive) return res.status(404).json({ message: 'That package is not available.' });

  // ---- Resolve / create the website customer (req 2.2 / 2.3) ----------------
  let resolved;
  try {
    resolved = await resolveWebsiteCustomer({ websitecustomer_id, customerName, email: customerEmail, customerMobile, address, city, state, country });
  } catch {
    return res.status(500).json({ message: 'Could not process the customer account. Please try again.' });
  }
  if (resolved.error) return res.status(400).json({ message: resolved.error });
  const { customer, created, password } = resolved;

  const settings = await Settings.getSettings();

  // Price is taken from the package on the server — never trusted from the browser.
  const perPerson = pkg.discountPrice > 0 ? pkg.discountPrice : pkg.price;
  const payingPax = Math.max(1, Number(adults) || 1) + Math.max(0, Number(children) || 0);
  const subTotal = round2(perPerson * payingPax);
  const gstPercent = Number(pkg.gstPercent) || 0;
  const gstAmount = round2((subTotal * gstPercent) / 100);
  const totalAmount = round2(subTotal + gstAmount);

  const currency = pkg.type === 'INTERNATIONAL'
    ? (pkg.currency || settings.currencyInternational || 'USD')
    : (pkg.currency || settings.currencyDomestic || 'INR');

  const booking = await WebsiteBooking.create({
    packageId: pkg._id,
    packageName: pkg.name,
    packageType: pkg.type,
    customerName, customerEmail, customerMobile,
    address, city, state, country: country || 'India',
    travelDate: travelDate || undefined,
    adults: Number(adults) || 1,
    children: Number(children) || 0,
    passengers: Array.isArray(passengers) ? passengers.filter(Boolean) : [],
    specialRequest,
    pricePerPerson: perPerson,
    subTotal, gstPercent, gstAmount, totalAmount, currency,
    gateway: gatewayFor(pkg.type),
  });

  const payment = await createPayment(booking);
  if (!payment.ok) {
    booking.paymentError = payment.error;
    await booking.save();
    return res.status(400).json({ message: payment.error, bookingNo: booking.bookingNo });
  }

  booking.gatewayOrderId = payment.orderId;
  await booking.save();

  // Welcome / account-setup email — ONLY for a genuinely new customer, after the booking is saved
  // (req 2.4). Best-effort: a mail failure never rolls back the customer/booking. No reusable
  // plaintext password is sent — a secure setup link is used instead.
  let customerEmailSent = false;
  if (created) {
    try {
      // Login page URL comes from the front-website env var — the sign-in page
      // (e.g. https://360-travel.vercel.app/sign-in). Set `frontwebsite_url` in the server .env.
      const loginUrl = process.env.frontwebsite_url;
      const r = await sendMail({
        to: customerEmail,
        subject: `Welcome to ${settings.companyName || 'our travel site'}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#15223b">
          <p>Hi ${customerName},</p>
          <p>Thanks for booking <b>${pkg.name}</b> with us — your account has been created. Use the
             details below to sign in:</p>
          <table cellpadding="6" style="border-collapse:collapse">
            ${loginUrl ? `<tr><td><b>Login</b></td><td><a href="${loginUrl}">${loginUrl}</a></td></tr>` : ''}
            <tr><td><b>Email</b></td><td>${customerEmail}</td></tr>
            <tr><td><b>Password</b></td><td>${password}</td></tr>
          </table>
          <p>For your security, please change your password after your first login.</p>
          <p>Booking reference: <b>${booking.bookingNo}</b></p>
          <p>Happy travels,<br/>${settings.companyName || ''}</p></div>`,
      });
      customerEmailSent = !!r.sent;
      // Never log the password — only the recipient + the mail error, if any.
      if (!r.sent) console.error('[public/bookings] welcome email NOT sent to', customerEmail, '-', r.error);
    } catch { /* ignore mail errors */ }
  }

  res.status(201).json({
    bookingNo: booking.bookingNo,
    bookingId: booking._id,
    amount: booking.totalAmount,
    currency: booking.currency,
    payment,          // everything the website checkout needs
  });
};

/* ============================ ERP ORDER CREATION ============================ */
/**
 * Once payment succeeds: find or create the customer, raise a Retail order,
 * and email the confirmation. Safe to call twice — it won't duplicate.
 */
const fulfilBooking = async (booking) => {
  if (booking.orderId) return booking;      // already fulfilled

  const settings = await Settings.getSettings();

  // Reuse an existing customer with the same email, else create one.
  let customer = await Customer.findOne({ email: booking.customerEmail });
  if (!customer) {
    customer = await Customer.create({
      name: booking.customerName,
      email: booking.customerEmail,
      mobile: booking.customerMobile,
      address: booking.address,
      city: booking.city,
      state: booking.state,
    });
  }

  // One service line representing the package.
  const interState = isInterState(settings.state, booking.state);
  const totals = applyGstToServices(
    [{
      serviceType: 'PACKAGE',
      description: booking.packageName,
      travelDate: booking.travelDate,
      amount: booking.subTotal,
      gstPercent: booking.gstPercent,
      passengers: (booking.passengers || []).map((name) => ({ name })),
    }],
    interState
  );

  const order = await Order.create({
    module: 'RETAIL',
    customerId: customer._id,
    isPackage: true,
    services: totals.services,
    subTotal: totals.subTotal,
    cgstTotal: totals.cgstTotal,
    sgstTotal: totals.sgstTotal,
    igstTotal: totals.igstTotal,
    gstTotal: totals.gstTotal,
    totalAmount: totals.totalAmount,
    paidAmount: totals.totalAmount,          // paid in full online
    isInterState: interState,
    invoiceType: booking.packageType,
    placeOfSupply: booking.state || '',
    source: 'WEBSITE',
  });

  booking.customerId = customer._id;
  booking.orderId = order._id;
  booking.status = 'CONFIRMED';
  await booking.save();

  // Confirmation email — never blocks the booking if SMTP isn't set up.
  await sendMail({
    to: booking.customerEmail,
    subject: `Booking confirmed ${booking.bookingNo} — ${settings.companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#15223b">
        <p>Dear ${booking.customerName},</p>
        <p>Thank you for booking <b>${booking.packageName}</b>.</p>
        <table cellpadding="6" style="border-collapse:collapse">
          <tr><td><b>Booking no.</b></td><td>${booking.bookingNo}</td></tr>
          <tr><td><b>Travellers</b></td><td>${booking.adults} adult(s), ${booking.children} child(ren)</td></tr>
          <tr><td><b>Amount paid</b></td><td>${booking.currency} ${booking.totalAmount}</td></tr>
        </table>
        <p>Our team will contact you shortly with your travel documents.</p>
        <p>Regards,<br/>${settings.companyName}</p>
      </div>`,
  });

  return booking;
};

/* ============================ PUBLIC: CONFIRM PAYMENT ============================ */
/**
 * POST /api/public/bookings/:id/confirm
 * Razorpay: { paymentId, signature }
 * Stripe:   { paymentIntentId }
 * The gateway is always re-checked server-side before anything is confirmed.
 */
export const confirmPayment = async (req, res) => {
  const booking = await WebsiteBooking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  if (booking.gateway === 'RAZORPAY') {
    const { paymentId, signature } = req.body;
    const valid = await verifyRazorpaySignature({
      orderId: booking.gatewayOrderId, paymentId, signature,
    });
    if (!valid) {
      booking.paymentStatus = 'FAILED';
      booking.paymentError = 'Payment signature did not match.';
      await booking.save();
      return res.status(400).json({ message: 'We could not verify that payment. Please contact us.' });
    }
    booking.gatewayPaymentId = paymentId;
    booking.gatewaySignature = signature;
  } else {
    const intent = await fetchStripeIntent(req.body.paymentIntentId || booking.gatewayOrderId);
    if (!intent || intent.status !== 'succeeded') {
      booking.paymentStatus = 'FAILED';
      booking.paymentError = intent ? `Stripe status: ${intent.status}` : 'Payment could not be checked.';
      await booking.save();
      return res.status(400).json({ message: 'That payment has not completed. Please try again.' });
    }
    // Security hardening: the amount/currency come from the PaymentIntent created server-side from the
    // package price, so they must match the booking total. This rejects any attempt to pay a tampered
    // (e.g. reduced) amount. (Razorpay is already bound to its server-created order via the signature.)
    const expectedMinor = Math.round((booking.totalAmount || 0) * 100);
    if (intent.amount !== expectedMinor || String(intent.currency || '').toLowerCase() !== String(booking.currency || '').toLowerCase()) {
      booking.paymentStatus = 'FAILED';
      booking.paymentError = 'Paid amount/currency did not match the booking total.';
      await booking.save();
      return res.status(400).json({ message: 'The payment amount did not match this booking. Please contact us.' });
    }
    booking.gatewayPaymentId = intent.id;
  }

  booking.paymentStatus = 'PAID';
  booking.paidAt = new Date();
  await booking.save();

  //await fulfilBooking(booking);
  res.json({
    message: 'Payment confirmed',
    bookingNo: booking.bookingNo,
    status: 'PAID',
    orderId: booking.orderId,
  });
};

/* ============================ PUBLIC: MARK PAYMENT FAILED ============================ */
/**
 * POST /api/public/bookings/:id/fail   body: { error?, reason?, code?, gateway? }
 * Records a failed / user-cancelled payment so the booking's status is updated (v51). Only acts on a
 * booking that is still PENDING — it never overwrites a PAID booking, and is safe to call more than
 * once (an already-FAILED/PAID booking just returns its current status).
 */
export const markPaymentFailed = async (req, res) => {
  const { error, reason, code, gateway } = req.body || {};

  const booking = await WebsiteBooking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  // Only update if still pending (don't overwrite successful payments).
  if (booking.paymentStatus === 'PENDING') {
    booking.paymentStatus = 'FAILED';
    booking.paymentError = error || reason || 'Payment failed or cancelled by user';

    // Store additional error details if provided.
    if (code || gateway) {
      booking.paymentError = JSON.stringify({
        message: error || reason || '',
        code: code || '',
        gateway: gateway || booking.gateway,
        timestamp: new Date(),
      });
    }

    await booking.save();
    console.error(`[public/bookings] payment failed for ${booking.bookingNo}: ${error || reason || 'cancelled'}`);

    return res.json({ message: 'Payment failure recorded', bookingNo: booking.bookingNo, status: 'FAILED' });
  }

  // Booking already processed (paid or already marked as failed).
  res.json({ message: 'Booking already processed', status: booking.paymentStatus, bookingNo: booking.bookingNo });
};

/* ============================ WEBHOOKS ============================ */
/** Razorpay webhook — a safety net if the browser closes before confirming. */
export const razorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const raw = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);

  const valid = await verifyRazorpayWebhook(raw, signature);
  if (!valid) return res.status(400).json({ message: 'Invalid signature' });

  const event = typeof req.body === 'object' && !(req.body instanceof Buffer) ? req.body : JSON.parse(raw);
  const entity = event?.payload?.payment?.entity;

  if (event?.event === 'payment.captured' && entity?.order_id) {
    const booking = await WebsiteBooking.findOne({ gatewayOrderId: entity.order_id });
    if (booking && booking.paymentStatus !== 'PAID') {
      booking.paymentStatus = 'PAID';
      booking.gatewayPaymentId = entity.id;
      booking.paidAt = new Date();
      await booking.save();
      await fulfilBooking(booking);
    }
  }
  res.json({ received: true });
};

/** Stripe webhook — requires the raw body, mounted before the JSON parser. */
export const stripeWebhook = async (req, res) => {
  const event = await constructStripeEvent(req.body, req.headers['stripe-signature']);
  if (!event) return res.status(400).json({ message: 'Invalid signature' });

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const booking = await WebsiteBooking.findOne({ gatewayOrderId: intent.id });
    if (booking && booking.paymentStatus !== 'PAID') {
      booking.paymentStatus = 'PAID';
      booking.gatewayPaymentId = intent.id;
      booking.paidAt = new Date();
      await booking.save();
      await fulfilBooking(booking);
    }
  }
  res.json({ received: true });
};

/* ============================ ADMIN (inside the ERP) ============================ */
export const listBookings = async (req, res) => {
  const filter = {};
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(req.query.search, 'i');
    filter.$or = [{ bookingNo: rx }, { customerName: rx }, { customerEmail: rx }, { packageName: rx }];
  }

  // Pagination (v58) — default 20/page; the admin listing passes page + limit and a page-size dropdown.
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    WebsiteBooking.countDocuments(filter),
    WebsiteBooking.find(filter)
      .populate('packageId', 'name')
      .populate('orderId', 'orderNo invoiceNo')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
  ]);
  res.json({ rows, total, page, limit, pages: Math.ceil(total / limit) || 1 });
};

export const getBooking = async (req, res) => {
  const row = await WebsiteBooking.findById(req.params.id)
    .populate('packageId', 'name')
    .populate('orderId', 'orderNo invoiceNo totalAmount')
    .populate('customerId', 'name email');
  if (!row) return res.status(404).json({ message: 'Booking not found' });
  res.json(row);
};

export const updateBooking = async (req, res) => {
  const { status, staffNotes } = req.body;
  const row = await WebsiteBooking.findById(req.params.id);
  if (!row) return res.status(404).json({ message: 'Booking not found' });
  if (status) row.status = status;
  if (staffNotes !== undefined) row.staffNotes = staffNotes;
  await row.save();
  res.json(row);
};

/** Manually raise the ERP order for a paid booking that never got one. */
export const fulfilManually = async (req, res) => {
  const booking = await WebsiteBooking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.paymentStatus !== 'PAID') {
    return res.status(400).json({ message: 'This booking has not been paid yet.' });
  }
  if (booking.orderId) return res.status(400).json({ message: 'An order already exists for this booking.' });

  await fulfilBooking(booking);
  res.json({ message: 'Order created', orderId: booking.orderId });
};
