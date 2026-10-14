import mongoose from 'mongoose';

// Website Video Gallery master (v39). _id is the unique primary key.
const videoGallerySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    video_url_link: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('VideoGallery', videoGallerySchema);
