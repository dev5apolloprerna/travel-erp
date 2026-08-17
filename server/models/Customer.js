import mongoose from 'mongoose';
import { documentSchema } from './shared.js';

// Retail customer
const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: String,
    email: { type: String, required: true },
    city: String,
    state: { type: String, default: '' },     // drives CGST+SGST vs IGST
    stateCode: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    address: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },

    // customer-level documents (any type: PAN, Aadhar, Passport, photo...)
    documents: [documentSchema],

    // reusable saved members/travelers for this customer
    members: [
      new mongoose.Schema(
        {
          name: String,
          relation: String,
          documents: [documentSchema],
        },
        { _id: true }
      ),
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Customer', customerSchema);
