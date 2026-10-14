import mongoose from 'mongoose';

// Website "Our Team" master (v39). Collection name: ourteem_website (as requested).
// `flag` is a dropdown with exactly two options. _id is the unique primary key.
export const OURTEAM_FLAGS = ['first', 'second'];

const ourTeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, default: '' },
    photo: { type: String, default: '' },              // stored image path (/uploads/...)
    department: { type: String, default: '' },
    flag: { type: String, enum: OURTEAM_FLAGS, default: 'first' },
  },
  { timestamps: true, collection: 'ourteem_website' }
);

export default mongoose.model('OurTeam', ourTeamSchema);
