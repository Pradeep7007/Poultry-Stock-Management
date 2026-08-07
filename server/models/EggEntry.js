const mongoose = require('mongoose');

const eggEntrySchema = mongoose.Schema(
  {
    name: {
      type: String, // Batch Name
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    aliveHens: {
      type: Number,
      required: true,
      min: 1
    },
    eggsProduced: {
      type: Number,
      required: true,
      min: 0,
    },
    productionPercentage: {
      type: Number,
      default: 0
    },
    eggsSold: {
      type: Number,
      required: true,
      min: 0,
    },
    damagedEggs: {
      type: Number,
      default: 0,
      min: 0,
    },
    eggPrice: {
      type: Number,
      required: true,
      min: 0.01,
    },
    salesAmount: {
      type: Number,
      required: true,
    },
    profitPerEgg: {
      type: Number,
      default: 0,
      min: 0,
    },
    profit: {
      type: Number,
      default: 0,
    },
    enteredBy: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
  }
);

const EggEntry = mongoose.model('EggEntry', eggEntrySchema);

module.exports = EggEntry;
