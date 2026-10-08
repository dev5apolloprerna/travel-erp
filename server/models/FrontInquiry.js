import mongoose from 'mongoose';

// Website "Contact / Inquiry" submissions. Collection: front_inquiry
const frontInquirySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    travelRequirement: { type: String, required: true, trim: true },
  },
  { timestamps: true, collection: 'front_inquiry' }
);

export default mongoose.model('FrontInquiry', frontInquirySchema);
