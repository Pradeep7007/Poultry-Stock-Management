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
  {
    timestamps: true,
  }
);

feedEntrySchema.index({ date: -1 });
feedEntrySchema.index({ name: 1 });

const FeedEntry = mongoose.model('FeedEntry', feedEntrySchema);

module.exports = FeedEntry;
