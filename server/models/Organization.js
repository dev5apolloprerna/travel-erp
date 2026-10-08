import mongoose from 'mongoose';

// Tenant/organization layer for the 3-layer structure:
//   MAIN_COMPANY (supplier) → THREE_SIXTY (the agency running this app) → Customer
// This is SEPARATE from the B2B `Company` model (which is a B2B client of the agency).
export const ORG_TYPES = {
  THREE_SIXTY: 'THREE_SIXTY',   // the agency itself (this app). Usually exactly one.
  MAIN_COMPANY: 'MAIN_COMPANY', // an external supplier/vendor that invoices the 360 agency.
};

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(ORG_TYPES), required: true },
    // For a MAIN_COMPANY, parentId points at the THREE_SIXTY org it supplies.
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },

    // Optional business details (used on supplier invoices).
    gstNumber: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    stateCode: { type: String, default: '' },

    isDefault: { type: Boolean, default: false }, // the primary THREE_SIXTY org
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);
