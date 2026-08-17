import mongoose from 'mongoose';

// Admin uploads a slip for an employee; the employee can only see their own.
const salarySlipSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: Number, required: true },   // 1-12
    year: { type: Number, required: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String, default: '' },
    remark: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

salarySlipSchema.index({ employeeId: 1, year: 1, month: 1 });

export default mongoose.model('SalarySlip', salarySlipSchema);
