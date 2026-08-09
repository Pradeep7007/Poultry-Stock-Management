const mongoose = require('mongoose');

const batchSchema = mongoose.Schema(
  {
    name: { type: String, required: [true, 'Batch Name is required'], trim: true },
    startDate: { type: Date, required: [true, 'Start Date is required'] },
    endDate: { type: Date, required: [true, 'End Date is required'] },
    startedHens: { type: Number, required: true, min: 1 },
    aliveHens: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Active', 'Completed'], default: 'Active' },
    phase: { type: String, default: 'Phase 1' },
    enteredBy: { type: String, required: true }
  },
  { timestamps: true }
);

batchSchema.index({ name: 1 });
batchSchema.index({ status: 1 });

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;
