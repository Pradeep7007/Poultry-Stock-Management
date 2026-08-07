const mongoose = require('mongoose');

const feedEntrySchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    date: { type: Date, required: true },
    feedWeight: { type: Number, required: true, min: 0.01 },
    feedCost: { type: Number, required: true, min: 0.01 },
    feedType: { type: String },
    supplier: { type: String },
    enteredBy: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeedEntry', feedEntrySchema);
