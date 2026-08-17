import crypto from 'crypto';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import Settings from '../models/Settings.js';

/**
 * Payment gateways for website bookings.
 * Domestic packages go through Razorpay, international through Stripe.
 * Keys live in Company Profile Settings so they can be changed without a redeploy.
 */

export const gatewayFor = (packageType) => (packageType === 'INTERNATIONAL' ? 'STRIPE' : 'RAZORPAY');

const getRazorpay = async () => {
  const s = await Settings.getSettings();
  if (!s.razorpayEnabled || !s.razorpayKeyId || !s.razorpayKeySecret) return null;
  return new Razorpay({ key_id: s.razorpayKeyId, key_secret: s.razorpayKeySecret });
};

const getStripe = async () => {
  const s = await Settings.getSettings();
  if (!s.stripeEnabled || !s.stripeSecretKey) return null;
  return new Stripe(s.stripeSecretKey);
};

/**
 * Start a payment for a booking.
 * Returns everything the website checkout needs, or an error message the
 * site can show if the gateway hasn't been configured yet.
 */
export const createPayment = async (booking) => {
  const settings = await Settings.getSettings();
  const gateway = gatewayFor(booking.packageType);

  // Both gateways work in the smallest currency unit (paise / cents).
  const minorUnits = Math.round((booking.totalAmount || 0) * 100);
  if (minorUnits <= 0) return { ok: false, error: 'Booking amount must be greater than zero.' };

  if (gateway === 'RAZORPAY') {
    const rzp = await getRazorpay();
    if (!rzp) {
      return { ok: false, error: 'Razorpay is not configured. Add the keys under Settings → Payment Gateways.' };
    }
    try {
      const order = await rzp.orders.create({
        amount: minorUnits,
        currency: booking.currency || settings.currencyDomestic || 'INR',
        receipt: booking.bookingNo,
        notes: { bookingNo: booking.bookingNo, package: booking.packageName },
      });
      return {
        ok: true,
        gateway: 'RAZORPAY',
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        // Public key — safe to hand to the browser
        keyId: settings.razorpayKeyId,
        bookingNo: booking.bookingNo,
      };
    } catch (err) {
      return { ok: false, error: err?.error?.description || err.message || 'Razorpay order could not be created.' };
    }
  }

  const stripe = await getStripe();
  if (!stripe) {
    return { ok: false, error: 'Stripe is not configured. Add the keys under Settings → Payment Gateways.' };
  }
  try {
    const intent = await stripe.paymentIntents.create({
      amount: minorUnits,
      currency: (booking.currency || settings.currencyInternational || 'USD').toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: { bookingNo: booking.bookingNo, package: booking.packageName },
      receipt_email: booking.customerEmail || undefined,
    });
    return {
      ok: true,
      gateway: 'STRIPE',
      orderId: intent.id,
      clientSecret: intent.client_secret,
      amount: intent.amount,
      currency: intent.currency,
      publishableKey: settings.stripePublishableKey,
      bookingNo: booking.bookingNo,
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Stripe payment could not be started.' };
  }
};

/**
 * Verify a Razorpay payment using the signature the checkout returns.
 * HMAC of "order_id|payment_id" with the key secret must match.
 */
export const verifyRazorpaySignature = async ({ orderId, paymentId, signature }) => {
  const s = await Settings.getSettings();
  if (!s.razorpayKeySecret) return false;
  const expected = crypto
    .createHmac('sha256', s.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  // Constant-time compare to avoid leaking information through timing.
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature || '')));
  } catch {
    return false;
  }
};

/** Confirm a Stripe PaymentIntent really succeeded (never trust the browser). */
export const fetchStripeIntent = async (intentId) => {
  const stripe = await getStripe();
  if (!stripe) return null;
  try {
    return await stripe.paymentIntents.retrieve(intentId);
  } catch {
    return null;
  }
};

/** Validate an incoming Stripe webhook against the signing secret. */
export const constructStripeEvent = async (rawBody, signature) => {
  const s = await Settings.getSettings();
  const stripe = await getStripe();
  if (!stripe || !s.stripeWebhookSecret) return null;
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, s.stripeWebhookSecret);
  } catch {
    return null;
  }
};

/** Validate an incoming Razorpay webhook signature. */
export const verifyRazorpayWebhook = async (rawBody, signature) => {
  const s = await Settings.getSettings();
  if (!s.razorpayKeySecret) return false;
  const expected = crypto.createHmac('sha256', s.razorpayKeySecret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature || '')));
  } catch {
    return false;
  }
};
