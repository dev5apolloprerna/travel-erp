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
    // v62: extended passenger profile captured on the booking form. All optional so existing
    // bookings (name only) keep working and passport is never forced (per business rules).
    nationality: { type: String, default: '' },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER', ''], default: '' },
    // Dates: coerce empty-string / null (blank form field) to null so a missing
    // date never throws a CastError — passport is optional, DOB may be blank.
    dob: { type: Date, default: null, set: (v) => (v === '' || v == null ? null : v) },
    passportNumber: { type: String, default: '' },
    passportIssueDate: { type: Date, default: null, set: (v) => (v === '' || v == null ? null : v) },
    relation: String,
    gradeRefAmount: Number, // FIT only, informational
    amountCharged: Number,
    documents: [documentSchema],
  },
  { _id: true }
);
