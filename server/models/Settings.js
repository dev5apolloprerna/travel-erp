import mongoose from 'mongoose';

// Single-document company profile / application settings.
// Holds legal details used on invoices + SMTP config used for outgoing email.
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'COMPANY_PROFILE', unique: true },

    // ---- Company profile (printed on invoices) ----
    companyName: { type: String, default: '360 Travel Concierge Pvt Ltd' },
    gstNumber: { type: String, default: '' },
    pan: { type: String, default: '' },
    addressLine1: { type: String, default: '' },
    addressLine2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },      // home state -> decides CGST+SGST vs IGST
    stateCode: { type: String, default: '' },
    pincode: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' },

    // ---- Bank details (optional, shown on invoice) ----
    bankName: { type: String, default: '' },
    bankAccount: { type: String, default: '' },
    bankIfsc: { type: String, default: '' },

    // ---- SMTP (outgoing mail) ----
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    smtpSecure: { type: Boolean, default: false },
    smtpUser: { type: String, default: '' },
    smtpPassword: { type: String, default: '' },
    smtpFromName: { type: String, default: '360 Travel Concierge' },
    smtpFromEmail: { type: String, default: '' },

    // ---- Payment gateways (website bookings) ----
    // Razorpay handles domestic packages, Stripe handles international.
    razorpayEnabled: { type: Boolean, default: false },
    razorpayKeyId: { type: String, default: '' },
    razorpayKeySecret: { type: String, default: '' },

    stripeEnabled: { type: Boolean, default: false },
    stripePublishableKey: { type: String, default: '' },
    stripeSecretKey: { type: String, default: '' },
    stripeWebhookSecret: { type: String, default: '' },

    currencyDomestic: { type: String, default: 'INR' },
    currencyInternational: { type: String, default: 'USD' },

    // Public website base URL, used in booking confirmation emails
    websiteUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

// Always work with one settings doc.
settingsSchema.statics.getSettings = async function () {
  let doc = await this.findOne({ key: 'COMPANY_PROFILE' });
  if (!doc) doc = await this.create({ key: 'COMPANY_PROFILE' });
  return doc;
};

export default mongoose.model('Settings', settingsSchema);
