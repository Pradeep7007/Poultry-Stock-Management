const mongoose = require('mongoose');

const workerSchema = mongoose.Schema(
  {
    name: { type: String, required: [true, 'Worker Name is required'], trim: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    enteredBy: { type: String, required: [true, 'Entered By is required'], trim: true },
    dateAdded: { type: Date, default: Date.now },
    defaultDailyWage: { type: Number, required: [true, 'Default daily wage is required'], min: 0, default: 0 },
    phoneNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    jobRole: { type: String, trim: true },
    notes: { type: String }
  },
  { timestamps: true }
);

workerSchema.index({ name: 1 });
workerSchema.index({ status: 1 });

const Worker = mongoose.model('Worker', workerSchema);

module.exports = Worker;
