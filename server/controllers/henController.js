const HenDeath = require('../models/HenDeath');
const Batch = require('../models/Batch');
const { appendToSheet, updateInSheet, deleteFromSheet } = require('../services/googleSheetsService');
const { formatText, formatDate } = require('../utils/formatter');

// @desc    Create new hen mortality entry
// @route   POST /api/hens
const createHenDeath = async (req, res) => {
  try {
    let { name, date, deadToday, enteredBy } = req.body;

    if (!name || !date || deadToday === undefined || !enteredBy) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    deadToday = Number(deadToday);
    if (deadToday < 0) {
      return res.status(400).json({ message: 'Dead hens cannot be negative.' });
    }

    // Find active batch
    const activeBatch = await Batch.findOne({ status: 'Active' });
    if (!activeBatch) {
      return res.status(400).json({ message: 'No active batch found. Please create a batch first.' });
    }

    if (deadToday > activeBatch.aliveHens) {
      return res.status(400).json({ message: 'Dead Hens cannot exceed Alive Hens.' });
    }

    const entry = await HenDeath.create({
      name: formatText(name),
      date,
      deadToday,
      batchId: activeBatch._id,
      enteredBy: formatText(enteredBy)
    });

    // Update batch alive hens
    activeBatch.aliveHens -= deadToday;
    await activeBatch.save();

    // Save to Google Sheets (Columns: Name, Date, Dead Today, Alive Hens, Created Time, Entered By)
    const sheetData = [
      entry.name,
      formatDate(entry.date),
      entry.deadToday,
      activeBatch.aliveHens,
      formatDate(entry.createdAt),
      entry.enteredBy
    ];

    const startTime = Date.now();
    appendToSheet(sheetData, 2027024494).then(() => {
      console.log(`[External API] Google Sheets append took ${Date.now() - startTime} ms`);
    }).catch(err => console.error(err));

    res.status(201).json({ message: 'Mortality entry saved successfully.', data: entry, sheetSync: 'pending' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all hen mortality entries
// @route   GET /api/hens
const getHenDeaths = async (req, res) => {
  try {
    const entries = await HenDeath.find({}).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update hen mortality entry
// @route   PUT /api/hens/:id
const updateHenDeath = async (req, res) => {
  try {
    const entry = await HenDeath.findById(req.params.id);

    if (entry) {
      // Find the associated batch
      const batch = await Batch.findById(entry.batchId);
      
      const oldDead = entry.deadToday;
      const newDead = req.body.deadToday !== undefined ? Number(req.body.deadToday) : entry.deadToday;
      
      if (batch) {
        // Reverse the old count, apply the new count
        const difference = newDead - oldDead;
        if (difference > batch.aliveHens) {
           return res.status(400).json({ message: 'Dead Hens update cannot exceed Alive Hens.' });
        }
        batch.aliveHens -= difference;
        await batch.save();
      }

      const oldSheetData = [
        entry.name,
        formatDate(entry.date),
        entry.deadToday,
        batch ? batch.aliveHens + (newDead - oldDead) : entry.deadToday, // approximate old aliveHens
        formatDate(entry.createdAt),
        entry.enteredBy
      ];

      entry.name = req.body.name ? formatText(req.body.name) : entry.name;
      entry.date = req.body.date || entry.date;
      entry.deadToday = newDead;
      entry.enteredBy = req.body.enteredBy ? formatText(req.body.enteredBy) : entry.enteredBy;

      const updatedEntry = await entry.save();
      
      const newSheetData = [
        updatedEntry.name,
        formatDate(updatedEntry.date),
        updatedEntry.deadToday,
        batch ? batch.aliveHens : 0,
        formatDate(updatedEntry.createdAt),
        updatedEntry.enteredBy
      ];
      const startTime = Date.now();
      updateInSheet(oldSheetData, newSheetData, 2027024494).then(() => {
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

// @desc    Delete hen mortality entry
// @route   DELETE /api/hens/:id
const deleteHenDeath = async (req, res) => {
  try {
    const entry = await HenDeath.findById(req.params.id);

    if (entry) {
      const batch = await Batch.findById(entry.batchId);
      let aliveHens = entry.deadToday;
      if (batch) {
        batch.aliveHens += entry.deadToday;
        aliveHens = batch.aliveHens - entry.deadToday;
        await batch.save();
      }

      const oldSheetData = [
        entry.name,
        formatDate(entry.date),
        entry.deadToday,
        aliveHens,
        formatDate(entry.createdAt),
        entry.enteredBy
      ];

      await entry.deleteOne();
      
      const startTime = Date.now();
      deleteFromSheet(oldSheetData, 2027024494).then(() => {
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

module.exports = { createHenDeath, getHenDeaths, updateHenDeath, deleteHenDeath };
