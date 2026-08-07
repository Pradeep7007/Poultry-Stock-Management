const mongoose = require('mongoose');

const MedicineEntrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['Medicine', 'Vaccine'],
    required: true
  },
  medicineName: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  cost: {
    type: Number,
    required: true,
    min: 0.01
  },
  notes: {
    type: String
  },
  enteredBy: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('MedicineEntry', MedicineEntrySchema);
