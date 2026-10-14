import mongoose from 'mongoose';

// "Customize Trip" request from the website (v39). Every field defaults to null (as requested).
// _id is the unique primary key. create_at / update_at map to timestamps.
const customizeTripSchema = new mongoose.Schema(
  {
    like_to_tavel: { type: String, default: null },
    PreferredDestination: { type: String, default: null },
    number_of_days: { type: String, default: null },
    Travellerscount: { type: String, default: null },
    Preferred_Travel_Date: { type: String, default: null },
    Trip_Type: { type: String, default: null },
    Hotel_Preference: { type: String, default: null },
    budget_of_planing: { type: String, default: null },
    Budget_Type: { type: String, default: null },
    name: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    Special_Requirements: { type: String, default: null },
    package_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TourPackage', default: null },
  },
  { timestamps: { createdAt: 'create_at', updatedAt: 'update_at' } }
);

export default mongoose.model('CustomizeTrip', customizeTripSchema);
