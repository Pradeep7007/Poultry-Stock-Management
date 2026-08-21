const FeedEntry = require('../models/FeedEntry');
const { appendToSheet, updateInSheet, deleteFromSheet } = require('../services/googleSheetsService');
const { formatText, formatDate } = require('../utils/formatter');

// @desc    Create new feed entry
// @route   POST /api/feed
const createFeedEntry = async (req, res) => {
  try {
    let {
      name,
      date,
      currentFeedWeightInSilo,
      purchasedFeedWeightInSilo,
      feedWeight,
      feedCost,
      feedType,
      supplier,
      enteredBy
    } = req.body;

    const parsedPurchasedWeight = purchasedFeedWeightInSilo !== undefined && purchasedFeedWeightInSilo !== ''
      ? Number(purchasedFeedWeightInSilo)
      : (feedWeight !== undefined ? Number(feedWeight) : 0);

    const parsedCurrentWeight = currentFeedWeightInSilo !== undefined && currentFeedWeightInSilo !== ''
      ? Number(currentFeedWeightInSilo)
      : 0;

    const parsedCost = Number(feedCost || 0);

    if (!name || !date || (!parsedPurchasedWeight && !parsedCurrentWeight) || parsedCost <= 0 || !enteredBy) {
      return res.status(400).json({ message: 'Please provide all required feed details including Batch, Date, Feed Weight, Cost, and Entered By.' });
    }

    const totalWeight = parsedPurchasedWeight > 0 ? parsedPurchasedWeight : parsedCurrentWeight;

    const entry = await FeedEntry.create({
      name: formatText(name),
      date,
      currentFeedWeightInSilo: parsedCurrentWeight,
      purchasedFeedWeightInSilo: parsedPurchasedWeight,
      feedWeight: totalWeight,
      feedCost: parsedCost,
      feedType: feedType ? formatText(feedType) : '',
      supplier: supplier ? formatText(supplier) : '',
      enteredBy: formatText(enteredBy)
    });

    // Save to Google Sheets
    const sheetData = [
      entry.name,
      formatDate(entry.date),
      entry.feedWeight,
      entry.feedCost,
      entry.feedType,
      entry.supplier,
      formatDate(entry.createdAt),
      entry.enteredBy
    ];

    const startTime = Date.now();
    appendToSheet(sheetData, 906025905).then(() => {
      console.log(`[External API] Google Sheets append took ${Date.now() - startTime} ms`);
    }).catch(err => console.error(err));

    res.status(201).json({ message: 'Feed entry saved successfully.', data: entry, sheetSync: 'pending' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all feed entries
// @route   GET /api/feed
const getFeedEntries = async (req, res) => {
  try {
    const entries = await FeedEntry.find({}).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update feed entry
// @route   PUT /api/feed/:id
const updateFeedEntry = async (req, res) => {
  try {
    const entry = await FeedEntry.findById(req.params.id);

    if (entry) {
      const oldSheetData = [
        entry.name,
        formatDate(entry.date),
        entry.feedWeight,
        entry.feedCost,
        entry.feedType,
        entry.supplier,
        formatDate(entry.createdAt),
        entry.enteredBy
      ];

      entry.name = req.body.name ? formatText(req.body.name) : entry.name;
      entry.date = req.body.date || entry.date;
      
      if (req.body.currentFeedWeightInSilo !== undefined) {
        entry.currentFeedWeightInSilo = Number(req.body.currentFeedWeightInSilo);
      }
      if (req.body.purchasedFeedWeightInSilo !== undefined) {
        entry.purchasedFeedWeightInSilo = Number(req.body.purchasedFeedWeightInSilo);
      }

      const totalWeight = req.body.purchasedFeedWeightInSilo !== undefined
        ? Number(req.body.purchasedFeedWeightInSilo)
        : (req.body.feedWeight !== undefined ? Number(req.body.feedWeight) : entry.feedWeight);

      entry.feedWeight = totalWeight;
      entry.feedCost = req.body.feedCost !== undefined ? Number(req.body.feedCost) : entry.feedCost;
      entry.feedType = req.body.feedType !== undefined ? formatText(req.body.feedType) : entry.feedType;
      entry.supplier = req.body.supplier !== undefined ? formatText(req.body.supplier) : entry.supplier;
      entry.enteredBy = req.body.enteredBy ? formatText(req.body.enteredBy) : entry.enteredBy;

      const updatedEntry = await entry.save();
      
      const newSheetData = [
        updatedEntry.name,
        formatDate(updatedEntry.date),
        updatedEntry.feedWeight,
        updatedEntry.feedCost,
        updatedEntry.feedType,
        updatedEntry.supplier,
        formatDate(updatedEntry.createdAt),
        updatedEntry.enteredBy
      ];
      const startTime = Date.now();
      updateInSheet(oldSheetData, newSheetData, 906025905).then(() => {
        console.log(`[External API] Google Sheets update took ${Date.now() - startTime} ms`);
      }).catch(err => console.error(err));
      
      res.json(updatedEntry);
    } else {
      res.status(404).json({ message: 'Entry not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete feed entry
// @route   DELETE /api/feed/:id
const deleteFeedEntry = async (req, res) => {
  try {
    const entry = await FeedEntry.findById(req.params.id);

    if (entry) {
      const oldSheetData = [
        entry.name,
        formatDate(entry.date),
        entry.feedWeight,
        entry.feedCost,
        entry.feedType,
        entry.supplier,
        formatDate(entry.createdAt),
        entry.enteredBy
      ];

      await entry.deleteOne();
      
      const startTime = Date.now();
      deleteFromSheet(oldSheetData, 906025905).then(() => {
        console.log(`[External API] Google Sheets delete took ${Date.now() - startTime} ms`);
      }).catch(err => console.error(err));
      
      res.json({ message: 'Entry removed' });
    } else {
      res.status(404).json({ message: 'Entry not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createFeedEntry, getFeedEntries, updateFeedEntry, deleteFeedEntry };
