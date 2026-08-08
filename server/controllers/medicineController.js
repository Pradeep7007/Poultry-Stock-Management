const MedicineEntry = require('../models/MedicineEntry');
const Batch = require('../models/Batch');
const { appendToSheet, updateInSheet, deleteFromSheet } = require('../services/googleSheetsService');
const { formatText, formatDate } = require('../utils/formatter');

// @desc    Create new medicine/vaccine entry
// @route   POST /api/vaccines
// @access  Public
const createMedicineEntry = async (req, res) => {
  try {
    const { name, date, type, medicineName, dosage, quantity, unitType, cost, notes, enteredBy } = req.body;

    // Find active batch
    const activeBatch = await Batch.findOne({ status: 'Active' });
    if (!activeBatch) {
      return res.status(400).json({ message: 'No active batch found. Please create one first.' });
    }

    const entry = await MedicineEntry.create({
      name: activeBatch.name,
      batchId: activeBatch._id,
      date,
      type: formatText(type),
      medicineName: formatText(medicineName),
      dosage: formatText(dosage),
      quantity: Number(quantity),
      unitType: unitType ? formatText(unitType) : 'Packet',
      cost: Number(cost),
      notes: notes ? formatText(notes) : '',
      enteredBy: formatText(enteredBy)
    });

    // Save to Google Sheets (Columns: Name, Date, Type, Medicine/Vaccine Name, Dosage, Quantity, Cost, Notes, Batch ID, Created Time, Entered By)
    const sheetData = [
      entry.name,
      formatDate(entry.date),
      entry.type,
      entry.medicineName,
      entry.dosage,
      entry.quantity,
      entry.cost,
      entry.notes,
      formatDate(entry.createdAt),
      entry.enteredBy,
      entry.unitType || 'Packet'
    ];

    const sheetResult = await appendToSheet(sheetData, 496930642);

    res.status(201).json({ 
      entry, 
      sheetSync: sheetResult.success,
      message: sheetResult.success ? 'Entry created successfully' : `Entry saved but Google Sheets failed: ${sheetResult.message}`
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all medicine entries
// @route   GET /api/vaccines
// @access  Public
const getMedicineEntries = async (req, res) => {
  try {
    const entries = await MedicineEntry.find().sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update medicine entry
// @route   PUT /api/vaccines/:id
// @access  Public
const updateMedicineEntry = async (req, res) => {
  try {
    const entry = await MedicineEntry.findById(req.params.id);

    if (entry) {
      const oldSheetData = [
        entry.name,
        formatDate(entry.date),
        entry.type,
        entry.medicineName,
        entry.dosage,
        entry.quantity,
        entry.cost,
        entry.notes,
        formatDate(entry.createdAt),
        entry.enteredBy,
        entry.unitType || 'Packet'
      ];

      entry.date = req.body.date || entry.date;
      entry.type = req.body.type ? formatText(req.body.type) : entry.type;
      entry.medicineName = req.body.medicineName ? formatText(req.body.medicineName) : entry.medicineName;
      entry.dosage = req.body.dosage ? formatText(req.body.dosage) : entry.dosage;
      entry.quantity = req.body.quantity || entry.quantity;
      entry.unitType = req.body.unitType ? formatText(req.body.unitType) : entry.unitType;
      entry.cost = req.body.cost || entry.cost;
      entry.notes = req.body.notes !== undefined ? formatText(req.body.notes) : entry.notes;
      entry.enteredBy = req.body.enteredBy ? formatText(req.body.enteredBy) : entry.enteredBy;

      const updatedEntry = await entry.save();
      
      const newSheetData = [
        updatedEntry.name,
        formatDate(updatedEntry.date),
        updatedEntry.type,
        updatedEntry.medicineName,
        updatedEntry.dosage,
        updatedEntry.quantity,
        updatedEntry.cost,
        updatedEntry.notes,
        formatDate(updatedEntry.createdAt),
        updatedEntry.enteredBy,
        updatedEntry.unitType || 'Packet'
      ];
      
      await updateInSheet(oldSheetData, newSheetData, 496930642);
      
      res.json(updatedEntry);
    } else {
      res.status(404).json({ message: 'Record not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete medicine entry
// @route   DELETE /api/vaccines/:id
// @access  Public
const deleteMedicineEntry = async (req, res) => {
  try {
    const entry = await MedicineEntry.findById(req.params.id);

    if (entry) {
      const oldSheetData = [
        entry.name,
        formatDate(entry.date),
        entry.type,
        entry.medicineName,
        entry.dosage,
        entry.quantity,
        entry.cost,
        entry.notes,
        formatDate(entry.createdAt),
        entry.enteredBy,
        entry.unitType || 'Packet'
      ];
      
      await entry.deleteOne();
      await deleteFromSheet(oldSheetData, 496930642);
      
      res.json({ message: 'Record removed' });
    } else {
      res.status(404).json({ message: 'Record not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createMedicineEntry,
  getMedicineEntries,
  updateMedicineEntry,
  deleteMedicineEntry
};
