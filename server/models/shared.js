import mongoose from 'mongoose';

// A document record: name + file path. Add/delete only (no edit) enforced at API level.
export const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// A passenger/member line on a booking
export const passengerSchema = new mongoose.Schema(
  {
    passengerType: { type: String, enum: ['DR', 'EMPLOYEE', 'MEMBER', 'CUSTOMER'], default: 'CUSTOMER' },
    name: { type: String, required: true },
    relation: String,
    gradeRefAmount: Number, // FIT only, informational
    amountCharged: Number,
    documents: [documentSchema],
  },
  { _id: true }
);
