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
  if (booking.paymentStatus === 'PAID') {
    return res.json({ message: 'Payment already confirmed', bookingNo: booking.bookingNo, status: 'PAID' });
  }

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
    booking.gatewayPaymentId = intent.id;
  }

  booking.paymentStatus = 'PAID';
  booking.paidAt = new Date();
  await booking.save();

  await fulfilBooking(booking);

  res.json({
    message: 'Payment confirmed',
    bookingNo: booking.bookingNo,
    status: 'PAID',
    orderId: booking.orderId,
  });
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

  const rows = await WebsiteBooking.find(filter)
    .populate('packageId', 'name')
    .populate('orderId', 'orderNo invoiceNo')
    .sort('-createdAt');
  res.json(rows);
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
