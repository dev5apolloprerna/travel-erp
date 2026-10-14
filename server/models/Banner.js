import mongoose from 'mongoose';

// Website Banner master (v39). _id is the unique primary key.
const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    bannerImage: { type: String, default: '' },        // stored image path (/uploads/...)
    created_date: { type: Date, default: Date.now },
  },
  { timestamps: true }                                   // createdAt / updatedAt (updated_at)
);

export default mongoose.model('Banner', bannerSchema);
