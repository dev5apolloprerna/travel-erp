import mongoose from 'mongoose';

// Retail: linked to an order. B2B: linked to a company (lump sum, no order link).
const paymentSchema = new mongoose.Schema(
  {
    module: { type: String, enum: ['RETAIL', 'B2B', 'FIT'], required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    amount: { type: Number, required: true },
    mode: { type: String, default: 'CASH' }, // CASH, CARD, UPI, BANK_TRANSFER, CHEQUE, ONLINE
    type: { type: String, enum: ['PARTIAL', 'FULL', 'LUMPSUM', 'ALLOCATED'], default: 'PARTIAL' },
    // A single payment can be split across several orders.
    // Empty allocations => lump-sum on the company account (B2B).
    allocations: [
      new mongoose.Schema(
        {
          orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
          orderNo: String,
          amount: { type: Number, default: 0 },
        },
        { _id: false }
      ),
    ],
    reference: String,
    notes: String,
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // employee, or null if online by customer
    paidByCustomer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
