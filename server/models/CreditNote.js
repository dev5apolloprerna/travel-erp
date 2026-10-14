import mongoose from 'mongoose';

// Credit Note raised when a SUPER_ADMIN cancels a customer invoice (req #8).
// It references the original (cancelled) invoice/order and is NEVER a substitute for deleting
// data — the original Order/invoice record is always kept for reporting and accounting.
const creditNoteSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true, default: null },

    creditNoteNo: { type: String, index: true },     // CN-000001
    // The order that carried the cancelled invoice.
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    // Snapshot of the cancelled invoice for audit (so the credit note stands on its own even if
    // the order is later edited elsewhere).
    invoiceNo: { type: String, default: '' },
    invoiceDate: { type: Date, default: null },
    amount: { type: Number, default: 0 },             // net amount credited back (the invoice net)
    reason: { type: String, default: '' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One credit note per order — hard guard against duplicates even under concurrent cancels.
creditNoteSchema.index({ orderId: 1 }, { unique: true });

// Sequential CN-000001 numbering per organization.
creditNoteSchema.statics.nextCreditNoteNo = async function (orgId) {
  const filter = { creditNoteNo: /^CN-/ };
  if (orgId) filter.organizationId = orgId;
  const last = await this.findOne(filter).sort({ creditNoteNo: -1 }).select('creditNoteNo').lean();
  const seq = last?.creditNoteNo ? parseInt(last.creditNoteNo.split('-').pop(), 10) : 0;
  return `CN-${String((seq || 0) + 1).padStart(6, '0')}`;
};

export default mongoose.model('CreditNote', creditNoteSchema);
