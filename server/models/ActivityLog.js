import mongoose from 'mongoose';

// Reusable activity/audit log (req #1). One row per important backend operation. Never stores
// passwords, tokens or other secrets (the logging helper sanitises payloads).
const activityLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },     // CREATE | UPDATE | DELETE | CANCEL | HOLD | RELEASE | INVOICE_GENERATE | INVOICE_CANCEL | ...
    module: { type: String, default: '' },         // Order | Customer | Invoice | Company | ...
    recordId: { type: mongoose.Schema.Types.ObjectId, default: null },
    recordLabel: { type: String, default: '' },    // human-friendly id, e.g. the order/invoice number
    message: { type: String, default: '' },        // short summary line
    changes: { type: mongoose.Schema.Types.Mixed, default: undefined }, // { field: { from, to } } for updates

    // Who performed it (denormalised so the log reads standalone even if the user changes later).
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userName: { type: String, default: '' },
    userRole: { type: String, default: '' },

    // Tenant association where applicable.
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);
