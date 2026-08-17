import mongoose from 'mongoose';

export const LEAVE_TYPES = ['CASUAL', 'SICK', 'EARNED', 'UNPAID'];

// Yearly opening balance per employee per leave type.
const leaveBalanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    year: { type: Number, required: true },
    balances: {
      CASUAL: { type: Number, default: 12 },
      SICK: { type: Number, default: 6 },
      EARNED: { type: Number, default: 15 },
      UNPAID: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);
leaveBalanceSchema.index({ employeeId: 1, year: 1 }, { unique: true });

const leaveSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    leaveType: { type: String, enum: LEAVE_TYPES, required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    adminRemark: { type: String, default: '' },
  },
  { timestamps: true }
);

export const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);
export default mongoose.model('Leave', leaveSchema);
