import mongoose from 'mongoose';
import { documentSchema } from './shared.js';

// B2B passenger database, scoped per company (companyId)
const passengerDbSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true },
    relation: String,
    documents: [documentSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Passenger', passengerDbSchema);
