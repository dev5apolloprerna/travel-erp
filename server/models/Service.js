import mongoose from 'mongoose';

// Fixed services with a domestic/international type + GST rate used at billing.
export const SERVICE_TYPE = ['DOMESTIC', 'INTERNATIONAL'];

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },   // Flight, Hotel, Visa, Cab, Bus, Event, Registration
    type: { type: String, enum: SERVICE_TYPE, required: true },
    // GST % charged on this service. Split into CGST+SGST (intra-state) or IGST (inter-state) at invoice time.
    gstPercent: { type: Number, default: 5 },
    // Invoice prefix for this service, entered by the admin (e.g. FLT, HTL).
    // Each prefix keeps its own running sequence: FLT-000001, HTL-000001...
    invoicePrefix: { type: String, default: '', trim: true, uppercase: true },
    // Optional HSN/SAC code printed on the invoice
    hsnCode: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Service', serviceSchema);
