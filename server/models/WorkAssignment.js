const mongoose = require('mongoose');

const workAssignmentSchema = mongoose.Schema(
  {
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    workName: { type: String, required: [true, 'Work Name is required'], trim: true },
    workDate: { type: Date, required: [true, 'Work Date is required'] },
    createdBy: { type: String, required: [true, 'Created By is required'], trim: true }
  },
  { timestamps: true }
);

workAssignmentSchema.index({ workerId: 1 });
workAssignmentSchema.index({ workDate: 1 });

const WorkAssignment = mongoose.model('WorkAssignment', workAssignmentSchema);

module.exports = WorkAssignment;
