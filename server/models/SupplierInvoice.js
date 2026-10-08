import mongoose from 'mongoose';

// Level-1 invoice in the 3-layer flow: a MAIN_COMPANY (supplier) invoices the 360 agency.
// Kept as a SEPARATE record from the customer invoice (which lives on Order). The two are
// linked via parentInvoiceId on the CUSTOMER order — this supplier invoice is the parent.
const lineSchema = new mongoose.Schema(
  { description: { type: String, default: '' }, amount: { type: Number, default: 0 } },
  { _id: true }
);

const supplierInvoiceSchema = new mongoose.Schema(
  {
    // Which 360 org receives this supplier invoice.
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    // The Main Company (supplier) that issued it.
    mainCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },

    invoiceNo: { type: String, index: true },        // SUP-000001
    // A supplier invoice (Main Company -> 360) is always a PURCHASE invoice (req #4).
    invoiceDirection: { type: String, enum: ['SALES', 'PURCHASE'], default: 'PURCHASE' },
    invoiceDate: { type: Date, default: Date.now },

    lines: { type: [lineSchema], default: [] },

    // Footer, same convention as the customer invoice.
    grossTotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    tdsAmount: { type: Number, default: 0 },
    tcsAmount: { type: Number, default: 0 },
    govtTaxAmount: { type: Number, default: 0 },
    netInvoiceAmount: { type: Number, default: 0 },  // Gross - Discount - TDS - TCS + Govt Tax

    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Sequential SUP-000001 numbering per 360 org.
supplierInvoiceSchema.statics.nextInvoiceNo = async function (orgId) {
  const last = await this.findOne({ organizationId: orgId, invoiceNo: /^SUP-/ })
    .sort({ invoiceNo: -1 }).select('invoiceNo').lean();
  const seq = last?.invoiceNo ? parseInt(last.invoiceNo.split('-').pop(), 10) : 0;
  return `SUP-${String((seq || 0) + 1).padStart(6, '0')}`;
};

export default mongoose.model('SupplierInvoice', supplierInvoiceSchema);
