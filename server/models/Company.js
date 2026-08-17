import mongoose from 'mongoose';
import { documentSchema } from './shared.js';

// A company contact person (not a login user — purely a contact record)
const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    designation: String,
    email: String,
    mobile: String,
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true }
);

// B2B company + its members (login users live in User with role B2B_MEMBER)
const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    gst: String,
    contactPerson: String,
    contactNumber: String,
    email: String,
    billingAddress: String,
    city: { type: String, default: '' },
    state: { type: String, default: '' },     // drives CGST+SGST vs IGST
    stateCode: { type: String, default: '' },
    creditTerms: { type: String, default: 'None' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },

    // multiple contact people
    contacts: [contactSchema],
    // company-level documents (agreement, GST cert, PAN...)
    documents: [documentSchema],

    // running account (lump-sum, not bill-to-bill)
    totalBilled: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
  },
  { timestamps: true }
);

companySchema.virtual('outstanding').get(function () {
  return (this.totalBilled || 0) - (this.totalPaid || 0);
});
companySchema.set('toJSON', { virtuals: true });

export default mongoose.model('Company', companySchema);
