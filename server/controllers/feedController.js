const FeedEntry = require('../models/FeedEntry');
const { appendToSheet } = require('../services/googleSheetsService');
const { formatText, formatDate } = require('../utils/formatter');

// @desc    Create new feed entry
// @route   POST /api/feed
const createFeedEntry = async (req, res) => {
  try {
    let { name, date, feedWeight, feedCost, feedType, supplier, enteredBy } = req.body;

    if (!name || !date || feedWeight === undefined || feedCost === undefined || !enteredBy) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    if (Number(feedWeight) <= 0 || Number(feedCost) <= 0) {
      return res.status(400).json({ message: 'Weight and Cost must be greater than zero.' });
    }

    const entry = await FeedEntry.create({
      name: formatText(name),
      date,
      feedWeight: Number(feedWeight),
      feedCost: Number(feedCost),
      feedType: feedType ? formatText(feedType) : '',
      supplier: supplier ? formatText(supplier) : '',
      enteredBy: formatText(enteredBy)
    });

    // Save to Google Sheets (Columns: Name, Date, Feed Weight, Feed Cost, Feed Type, Supplier, Created Time, Entered By)
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

    const sheetResult = await appendToSheet(sheetData, 906025905);

    let message = 'Feed entry saved successfully.';
    if (!sheetResult.success) {
      message = 'Local data was saved but sheet synchronization failed.';
    }

    res.status(201).json({ message, data: entry, sheetSync: sheetResult.success });
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
      entry.name = req.body.name ? formatText(req.body.name) : entry.name;
      entry.date = req.body.date || entry.date;
      entry.feedWeight = req.body.feedWeight !== undefined ? Number(req.body.feedWeight) : entry.feedWeight;
      entry.feedCost = req.body.feedCost !== undefined ? Number(req.body.feedCost) : entry.feedCost;
      entry.feedType = req.body.feedType !== undefined ? formatText(req.body.feedType) : entry.feedType;
      entry.supplier = req.body.supplier !== undefined ? formatText(req.body.supplier) : entry.supplier;
      entry.enteredBy = req.body.enteredBy ? formatText(req.body.enteredBy) : entry.enteredBy;

      const updatedEntry = await entry.save();
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
      await entry.deleteOne();
      res.json({ message: 'Entry removed' });
    } else {
      res.status(404).json({ message: 'Entry not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createFeedEntry, getFeedEntries, updateFeedEntry, deleteFeedEntry };
