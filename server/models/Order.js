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
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
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
    // Sales vs Purchase direction (req #4). A customer Order invoice is always a SALES invoice
    // (the Company Owner / 360 selling to a customer). The 360 ← Main Company PURCHASE invoice is
    // the separate SupplierInvoice module. Stamped server-side from the creator's context, never
    // from a client value.
    invoiceDirection: { type: String, enum: ['SALES', 'PURCHASE'], default: 'SALES' },
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

    // ---- Invoice charge heads (entered at invoice generation) ----
    // Service-specific: Flight uses YQ/YR/K3…, Bus uses Tax I/Gateway…, etc.
    // Flexible so each service stores only its own heads.
    invoiceCharges: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Hotel per-room breakdown (Rate × Rooms + Tax%).
    invoiceRooms: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    serviceCalcType: { type: String, default: '' },     // which calculator was used
    chargesTotal: { type: Number, default: 0 },
    markupTotal: { type: Number, default: 0 },
    hotelTotalRoomAmount: { type: Number, default: 0 },
    hotelTotalTax: { type: Number, default: 0 },
    // ---- Invoice footer ----
    grossTotal: { type: Number, default: 0 },       // service gross (charges + markup, or hotel grand)
    discountAmount: { type: Number, default: 0 },
    tdsAmount: { type: Number, default: 0 },
    govtTaxAmount: { type: Number, default: 0 },
    tcsAmount: { type: Number, default: 0 },
    // Manual "360 service charge" entered at billing time (req #7). Included in the net:
    // Net = Gross - Discount - TDS - TCS + Govt Tax + Service Charge. Defaults to 0 so every
    // existing invoice is unchanged.
    serviceChargeAmount: { type: Number, default: 0 },
    netInvoiceAmount: { type: Number, default: 0 }, // Gross - Discount - TDS - TCS + Govt Tax + Service Charge
    invoiceGenerated: { type: Boolean, default: false },
    invoiceNotes: { type: String, default: '' },
    // req #7: which party type this invoice bills — keeps the 360 / Company Owner / Employee /
    // Retail / B2B / Society distinction explicit on the record. Stamped server-side at generation.
    billedToType: { type: String, enum: ['RETAIL_CUSTOMER', 'B2B_COMPANY', 'SOCIETY', 'COMPANY_OWNER', ''], default: '' },
    // 3-layer link: the parent supplier invoice (Main Company -> 360) this customer invoice derives from.
    parentInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupplierInvoice', default: null },

    // ---- Invoice cancellation + credit note (req #8) ----
    // Cancelling an invoice is a SUPER_ADMIN-only accounting action: the invoice/order record is
    // NEVER deleted (kept for reporting/audit); instead it is flagged and a linked Credit Note is
    // raised. This is distinct from the order-level `cancelled` flag (req #2, v32).
    invoiceCancelled: { type: Boolean, default: false },
    invoiceCancelledAt: { type: Date, default: null },
    invoiceCancelReason: { type: String, default: '' },
    creditNoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditNote', default: null },
    creditNoteNo: { type: String, default: '' },

    // RETAIL only: order-level payment tracking (B2B uses company running balance)
    paidAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID'], default: 'UNPAID' },

    // ---- Cancellation (req #2, v32) ----
    // An order may be CANCELLED only AFTER its invoice has been generated. This is a soft
    // cancel (the record is kept for audit / invoice history), distinct from a hard Delete.
    // Editing is blocked once invoiceGenerated is true; cancelling once cancelled is true.
    cancelled: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },

    // ---- Order Hold (req #1, v33) ----
    // A pre-invoice working state: an order can be put On Hold and later released. An order on
    // hold cannot have its invoice generated until it is released. Follows the same additive
    // boolean pattern as `cancelled`, so the existing order workflow is extended, not duplicated.
    onHold: { type: Boolean, default: false },
    heldAt: { type: Date, default: null },
    holdReason: { type: String, default: '' },
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

// req #1: a single, clear order lifecycle status for display. Priority reflects finality:
// Cancelled > Invoice Cancelled > Invoiced > On Hold > Open. (Payment status UNPAID/PARTIAL/PAID
// remains separate.)
orderSchema.virtual('lifecycleStatus').get(function () {
  if (this.cancelled) return 'CANCELLED';
  if (this.invoiceCancelled) return 'INVOICE_CANCELLED';
  if (this.invoiceGenerated) return 'INVOICED';
  if (this.onHold) return 'ON_HOLD';
  return 'OPEN';
});
orderSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Order', orderSchema);
