import mongoose from 'mongoose';
import { passengerSchema, documentSchema } from './shared.js';

export const SERVICE_TYPES = ['FLIGHT', 'HOTEL', 'TAXI', 'TRAIN', 'BUS', 'REGISTRATION', 'EVENT'];
export const MODULES = ['RETAIL', 'B2B', 'FIT'];

// One service line inside an order. Fields are a superset; only relevant ones are filled per serviceType.
// A booked service line. Booking-detail fields vary per service (flight, hotel, railway,
// cab, etc.) and are defined by the per-service forms on the client, so the schema is
// intentionally flexible (strict:false) and stores whatever the chosen form captures.
// Money/tax live at the invoice level, not here.
const serviceLineSchema = new mongoose.Schema(
  {
    serviceType: { type: String, required: true },
    serviceRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' }, // link to Service master

    // Hotel (and similar) repeatable room rows — free-form objects.
    rooms: { type: [mongoose.Schema.Types.Mixed], default: undefined },

    // Passengers on this entry.
    passengers: [passengerSchema],
  },
  { _id: true, strict: false, minimize: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, unique: true },
    module: { type: String, enum: MODULES, required: true },
    isPackage: { type: Boolean, default: false },

    // RETAIL
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

    // B2B
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    requestedByMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // employee who booked
    services: [serviceLineSchema],
    documents: [documentSchema],

    // Where the order came from — WEBSITE orders are raised by online bookings.
    source: { type: String, enum: ['ERP', 'WEBSITE'], default: 'ERP' },

    // Society (FIT) booking: the passenger + chosen division's field-force snapshot.
    societyPassenger: {
      passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
      drCode: String,
      name: String,
      divisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Division' },
      divisionName: String,
      smsCode: String,
      designation: String,
      empCode: String,
      empName: String,
      hq: String,
      region: String,
    },

    // ---- Invoice ----
    invoiceNo: { type: String, index: true },       // DOM-000001 / INT-000001
    invoiceType: { type: String, enum: ['DOMESTIC', 'INTERNATIONAL'], default: 'DOMESTIC' },
    invoiceDate: { type: Date, default: Date.now },
    placeOfSupply: { type: String, default: '' },
    isInterState: { type: Boolean, default: false },  // true -> IGST, false -> CGST+SGST

    // ---- Money ----
    subTotal: { type: Number, default: 0 },        // sum of taxable amounts
    cgstTotal: { type: Number, default: 0 },
    sgstTotal: { type: Number, default: 0 },
    igstTotal: { type: Number, default: 0 },
    gstTotal: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },     // subTotal + gstTotal

    // ---- Invoice charge heads (entered manually at invoice generation) ----
    // Mirrors the ePrompt air-ticket invoice. Unused heads stay 0 for non-flight services.
    invoiceCharges: {
      basic: { type: Number, default: 0 },
      yqTax: { type: Number, default: 0 },
      yrTax: { type: Number, default: 0 },
      k3Tax: { type: Number, default: 0 },
      ocTax: { type: Number, default: 0 },
      otherTax: { type: Number, default: 0 },
      processingCharges: { type: Number, default: 0 },
      otherCharges: { type: Number, default: 0 },
      markup: { type: Number, default: 0 },
    },
    // ---- Invoice footer ----
    grossTotal: { type: Number, default: 0 },       // sum of the charge heads above
    discountAmount: { type: Number, default: 0 },
    tdsAmount: { type: Number, default: 0 },
    govtTaxAmount: { type: Number, default: 0 },
    tcsAmount: { type: Number, default: 0 },
    netInvoiceAmount: { type: Number, default: 0 }, // Gross - Discount - TDS - TCS + Govt Tax
    invoiceGenerated: { type: Boolean, default: false },
    invoiceNotes: { type: String, default: '' },

    // RETAIL only: order-level payment tracking (B2B uses company running balance)
    paidAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID'], default: 'UNPAID' },
  },
  { timestamps: true }
);

/**
 * Sequential invoice number for a given prefix.
 * The prefix comes from the Service master (e.g. FLT -> FLT-000001).
 * Each prefix keeps its own independent sequence.
 */
orderSchema.statics.nextInvoiceNo = async function (prefix) {
  const clean = (prefix || 'INV').toString().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'INV';
  const last = await this.findOne({ invoiceNo: new RegExp(`^${clean}-`) })
    .sort({ invoiceNo: -1 })
    .select('invoiceNo')
    .lean();
  const lastSeq = last?.invoiceNo ? parseInt(last.invoiceNo.split('-').pop(), 10) : 0;
  return `${clean}-${String((lastSeq || 0) + 1).padStart(6, '0')}`;
};

orderSchema.pre('save', function (next) {
  if (!this.orderNo) {
    const prefix = this.module === 'B2B' ? 'B2B' : this.module === 'FIT' ? 'FIT' : 'ORD';
    this.orderNo = `${prefix}-${Date.now().toString().slice(-6)}`;
  }
  // Payment status is tracked for every module (B2B payments can now be
  // allocated to specific orders as well as paid lump-sum on account).
  if (this.paidAmount <= 0) this.status = 'UNPAID';
  else if (this.paidAmount < this.totalAmount) this.status = 'PARTIAL';
  else this.status = 'PAID';
  next();
});

orderSchema.virtual('dueAmount').get(function () {
  return (this.totalAmount || 0) - (this.paidAmount || 0);
});
orderSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Order', orderSchema);
