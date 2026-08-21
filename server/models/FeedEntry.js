const mongoose = require('mongoose');

const feedEntrySchema = mongoose.Schema(
  {
    name: { type: String, required: true }, // Batch name
    date: { type: Date, required: true },
    currentFeedWeightInSilo: { type: Number, default: 0, min: 0 },
    purchasedFeedWeightInSilo: { type: Number, default: 0, min: 0 },
    feedWeight: { type: Number, required: true, min: 0 }, // Total/Purchased feed weight (KG)
    feedCost: { type: Number, required: true, min: 0 },
    feedType: { type: String, default: '' },
    supplier: { type: String, default: '' },
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
