const mongoose = require('mongoose');

const dailyWorkEntrySchema = mongoose.Schema(
  {
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    date: { type: Date, required: [true, 'Date is required'] },
    attendance: { 
      type: String, 
      enum: ['Present', 'Absent', 'Half Day', 'Leave'], 
      required: [true, 'Attendance is required'] 
    },
    dailyWage: { type: Number, required: [true, 'Daily wage is required'], min: 0, default: 0 },
    workDetails: { type: String, trim: true },
    createdBy: { type: String, required: [true, 'Created By is required'], trim: true }
  },
  { timestamps: true }
);

// Compound index to prevent multiple entries for the same worker on the same day
dailyWorkEntrySchema.index({ workerId: 1, date: 1 }, { unique: true });
dailyWorkEntrySchema.index({ date: 1 });

const DailyWorkEntry = mongoose.model('DailyWorkEntry', dailyWorkEntrySchema);

module.exports = DailyWorkEntry;
