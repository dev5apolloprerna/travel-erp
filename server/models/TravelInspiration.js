import mongoose from 'mongoose';

// Travel Inspiration sign-up (v39). Stores an email only; the email is unique so the same
// address is never stored twice. _id is the unique primary key.
const travelInspirationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('TravelInspiration', travelInspirationSchema);
