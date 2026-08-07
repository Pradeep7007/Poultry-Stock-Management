const mongoose = require('mongoose');

const henDeathSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    date: { type: Date, required: true },
    deadToday: { type: Number, required: true, min: 0 },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    enteredBy: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('HenDeath', henDeathSchema);
