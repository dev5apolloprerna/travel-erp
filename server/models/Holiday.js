import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['PUBLIC', 'OPTIONAL', 'COMPANY'], default: 'PUBLIC' },
    description: { type: String, default: '' },
    year: { type: Number },
  },
  { timestamps: true }
);

holidaySchema.pre('save', function (next) {
  if (this.date) this.year = new Date(this.date).getFullYear();
  next();
});

export default mongoose.model('Holiday', holidaySchema);
