import mongoose from 'mongoose';

/**
 * A booking made from the public website.
 * On successful payment it also creates a Retail Order + Customer inside the ERP,
 * while staying visible in its own Website Bookings list.
 */
const websiteBookingSchema = new mongoose.Schema(
  {
    bookingNo: { type: String, index: true },

    // What was booked
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourPackage', required: true },
    packageName: { type: String, default: '' },
    packageType: { type: String, enum: ['DOMESTIC', 'INTERNATIONAL'], default: 'DOMESTIC' },

    // Who booked (the website visitor — no login required)
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerMobile: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'India' },

    // Trip details
    travelDate: Date,
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    passengers: { type: [String], default: [] },
    specialRequest: { type: String, default: '' },

    // Money
    pricePerPerson: { type: Number, default: 0 },
    subTotal: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },

    // Payment
    gateway: { type: String, enum: ['RAZORPAY', 'STRIPE', 'NONE'], default: 'NONE' },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING' },
    gatewayOrderId: { type: String, default: '' },      // Razorpay order id / Stripe PaymentIntent id
    gatewayPaymentId: { type: String, default: '' },
    gatewaySignature: { type: String, default: '' },
    paidAt: Date,
    paymentError: { type: String, default: '' },

    // Links into the ERP once paid
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

    status: { type: String, enum: ['NEW', 'CONFIRMED', 'CANCELLED'], default: 'NEW' },
    staffNotes: { type: String, default: '' },

    // Customer-initiated cancellation (v59).
    cancelReason: { type: String, default: '' },
    cancelledAt: { type: Date, default: null },

    // v50 (req 2.6): reserved booking-workflow flag. Default NULL (unset) — no behaviour is attached
    // here beyond storage; it is set by whatever pending/approval workflow uses it. Existing records
    // read as null. (MongoDB is schemaless, so no SQL migration is needed; adding this field is safe
    // for existing documents.)
    pending: { type: Boolean, default: null },

  },
  { timestamps: true }
);

websiteBookingSchema.pre('save', function (next) {
  if (!this.bookingNo) this.bookingNo = `WEB-${Date.now().toString().slice(-8)}`;
  next();
});

export default mongoose.model('WebsiteBooking', websiteBookingSchema);
