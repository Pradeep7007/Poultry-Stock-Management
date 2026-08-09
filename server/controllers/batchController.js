const Batch = require('../models/Batch');
const { appendToSheet } = require('../services/googleSheetsService');
const { formatText, formatDate } = require('../utils/formatter');

// @desc    Create new batch
// @route   POST /api/batches
const createBatch = async (req, res) => {
  try {
    const { name, startDate, endDate, startedHens, enteredBy } = req.body;

    if (!name || !startDate || !endDate || !startedHens || !enteredBy) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: 'End date must be after start date.' });
    }

    if (Number(startedHens) <= 0) {
      return res.status(400).json({ message: 'Starting Hen Count must be a positive number.' });
    }

    // Set all previous batches to completed
    await Batch.updateMany({ status: 'Active' }, { $set: { status: 'Completed' } });

    const formattedName = formatText(name);
    const formattedEnteredBy = formatText(enteredBy);

    const batch = await Batch.create({
      name: formattedName,
      startDate,
      endDate,
      startedHens: Number(startedHens),
      aliveHens: Number(startedHens), // initially alive = started
      status: 'Active',
      phase: 'Phase 1',
      enteredBy: formattedEnteredBy
    });

    // Save to Google Sheets (Batch Columns: Batch Name, Start Date, End Date, Started Hens, Alive Hens, Status, Created Time, Entered By)
    const sheetData = [
      batch.name,
      formatDate(batch.startDate),
      formatDate(batch.endDate),
      batch.startedHens,
      batch.aliveHens,
      batch.status,
      formatDate(batch.createdAt),
      batch.enteredBy
    ];

    const startTime = Date.now();
    appendToSheet(sheetData, 'Batch').then(() => {
      console.log(`[External API] Google Sheets append took ${Date.now() - startTime} ms`);
    }).catch(err => console.error(err));

    res.status(201).json({ message: 'Batch created successfully', data: batch });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all batches
// @route   GET /api/batches
const getBatches = async (req, res) => {
  try {
    // Automatically check for end dates and mark as Completed
    const now = new Date();
    await Batch.updateMany(
      { status: 'Active', endDate: { $lt: now } },
      { $set: { status: 'Completed', aliveHens: 0 } }
    );

    const batches = await Batch.find({}).sort({ createdAt: -1 });
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createBatch, getBatches };
