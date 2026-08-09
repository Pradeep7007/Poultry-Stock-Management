const EggEntry = require('../models/EggEntry');
const Batch = require('../models/Batch');
const { appendToSheet, updateInSheet, deleteFromSheet } = require('../services/googleSheetsService');
const { formatText, formatDate } = require('../utils/formatter');

// @desc    Create new egg entry
// @route   POST /api/eggs
const createEggEntry = async (req, res) => {
  try {
    let { name, date, eggsProduced, eggsSold, damagedEggs, eggPrice, profitPerEgg, enteredBy } = req.body;

    if (!name || !date || eggsProduced === undefined || eggsSold === undefined || eggPrice === undefined || !enteredBy) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    eggsProduced = Number(eggsProduced);
    eggsSold = Number(eggsSold);
    damagedEggs = damagedEggs ? Number(damagedEggs) : 0;
    eggPrice = Number(eggPrice);
    profitPerEgg = profitPerEgg ? Number(profitPerEgg) : 0;

    if (eggsProduced < 0 || eggsSold < 0 || damagedEggs < 0 || eggPrice <= 0 || profitPerEgg < 0) {
      return res.status(400).json({ message: 'Invalid values provided' });
    }

    const formattedName = formatText(name);
    const formattedEnteredBy = formatText(enteredBy);

    // Find the batch to get Alive Hens
    const batch = await Batch.findOne({ name: formattedName });
    if (!batch) {
      return res.status(404).json({ message: 'Selected batch not found in database.' });
    }

    if (batch.aliveHens <= 0) {
      return res.status(400).json({ message: 'Alive Hen Count must be greater than zero for this batch.' });
    }

    if (eggsProduced > batch.aliveHens) {
      return res.status(400).json({ message: 'Eggs Produced cannot exceed the Alive Hen Count.' });
    }

    const productionPercentage = Number(((eggsProduced / batch.aliveHens) * 100).toFixed(2));

    const stockStats = await EggEntry.aggregate([
      {
        $group: {
          _id: null,
          totalProduced: { $sum: '$eggsProduced' },
          totalSold: { $sum: '$eggsSold' },
          totalDamaged: { $sum: '$damagedEggs' }
        }
      }
    ]);
    
    let currentStock = 0;
    if (stockStats.length > 0) {
      currentStock = stockStats[0].totalProduced - stockStats[0].totalSold - stockStats[0].totalDamaged;
    }

    if ((eggsSold + damagedEggs) > (eggsProduced + currentStock)) {
      return res.status(400).json({ message: 'Eggs sold and damaged cannot exceed eggs produced today plus available stock.' });
    }

    const salesAmount = eggsSold * eggPrice;
    const totalProfit = eggsSold * profitPerEgg;

    const entry = await EggEntry.create({
      name: formattedName,
      date,
      aliveHens: batch.aliveHens,
      eggsProduced,
      productionPercentage,
      eggsSold,
      damagedEggs,
      eggPrice,
      salesAmount,
      profitPerEgg,
      profit: totalProfit,
      enteredBy: formattedEnteredBy
    });

    // Save to Google Sheets
    const sheetData = [
      entry.name,
      formatDate(entry.date),
      entry.aliveHens,
      entry.eggsProduced,
      `${entry.productionPercentage}%`,
      entry.eggsSold,
      entry.eggPrice,
      entry.salesAmount,
      entry.profit,
      formatDate(entry.createdAt),
      entry.enteredBy
    ];

    // Save to Google Sheets non-blocking
    const startTime = Date.now();
    appendToSheet(sheetData, 0).then(sheetResult => {
      console.log(`[External API] Google Sheets append took ${Date.now() - startTime} ms`);
    }).catch(err => console.error(err));

    res.status(201).json({ message: 'Record saved successfully.', data: entry, sheetSync: 'pending' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all egg entries
// @route   GET /api/eggs
const getEggEntries = async (req, res) => {
  try {
    const entries = await EggEntry.find({}).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update egg entry
// @route   PUT /api/eggs/:id
const updateEggEntry = async (req, res) => {
  try {
    const entry = await EggEntry.findById(req.params.id);

    if (entry) {
      const formattedName = req.body.name ? formatText(req.body.name) : entry.name;
      
      let aliveHens = entry.aliveHens;
      if (req.body.name && req.body.name !== entry.name) {
        const batch = await Batch.findOne({ name: formattedName });
        if (batch) aliveHens = batch.aliveHens;
      }
      
      const eggsProduced = req.body.eggsProduced !== undefined ? Number(req.body.eggsProduced) : entry.eggsProduced;
      
      if (eggsProduced > aliveHens) {
        return res.status(400).json({ message: 'Eggs Produced cannot exceed the Alive Hen Count.' });
      }

      const eggsSold = req.body.eggsSold !== undefined ? Number(req.body.eggsSold) : entry.eggsSold;
      const damagedEggs = req.body.damagedEggs !== undefined ? Number(req.body.damagedEggs) : (entry.damagedEggs || 0);

      const stockStats = await EggEntry.aggregate([
        { $match: { _id: { $ne: entry._id } } },
        {
          $group: {
            _id: null,
            totalProduced: { $sum: '$eggsProduced' },
            totalSold: { $sum: '$eggsSold' },
            totalDamaged: { $sum: '$damagedEggs' }
          }
        }
      ]);
      
      let currentStock = 0;
      if (stockStats.length > 0) {
        currentStock = stockStats[0].totalProduced - stockStats[0].totalSold - stockStats[0].totalDamaged;
      }

      if ((eggsSold + damagedEggs) > (eggsProduced + currentStock)) {
        return res.status(400).json({ message: 'Eggs sold and damaged cannot exceed eggs produced today plus available stock.' });
      }

      const productionPercentage = Number(((eggsProduced / aliveHens) * 100).toFixed(2));

      const oldSheetData = [
        entry.name,
        formatDate(entry.date),
        entry.aliveHens,
        entry.eggsProduced,
        `${entry.productionPercentage}%`,
        entry.eggsSold,
        entry.eggPrice,
        entry.salesAmount,
        entry.profit,
        formatDate(entry.createdAt),
        entry.enteredBy
      ];

      entry.name = formattedName;
      entry.date = req.body.date || entry.date;
      entry.aliveHens = aliveHens;
      entry.eggsProduced = eggsProduced;
      entry.productionPercentage = productionPercentage;
      entry.eggsSold = eggsSold;
      entry.damagedEggs = damagedEggs;
      entry.eggPrice = req.body.eggPrice !== undefined ? Number(req.body.eggPrice) : entry.eggPrice;
      entry.profitPerEgg = req.body.profitPerEgg !== undefined ? Number(req.body.profitPerEgg) : (entry.profitPerEgg || 0);
      entry.enteredBy = req.body.enteredBy ? formatText(req.body.enteredBy) : entry.enteredBy;
      
      entry.salesAmount = entry.eggsSold * entry.eggPrice;
      entry.profit = entry.eggsSold * entry.profitPerEgg;

      const updatedEntry = await entry.save();
      
      const newSheetData = [
        updatedEntry.name,
        formatDate(updatedEntry.date),
        updatedEntry.aliveHens,
        updatedEntry.eggsProduced,
        `${updatedEntry.productionPercentage}%`,
        updatedEntry.eggsSold,
        updatedEntry.eggPrice,
        updatedEntry.salesAmount,
        updatedEntry.profit,
        formatDate(updatedEntry.createdAt),
        updatedEntry.enteredBy
      ];
      const startTime = Date.now();
      updateInSheet(oldSheetData, newSheetData, 0).then(() => {
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

// @desc    Delete egg entry
// @route   DELETE /api/eggs/:id
const deleteEggEntry = async (req, res) => {
  try {
    const entry = await EggEntry.findById(req.params.id);

    if (entry) {
      const oldSheetData = [
        entry.name,
        formatDate(entry.date),
        entry.aliveHens,
        entry.eggsProduced,
        `${entry.productionPercentage}%`,
        entry.eggsSold,
        entry.eggPrice,
        entry.salesAmount,
        entry.profit,
        formatDate(entry.createdAt),
        entry.enteredBy
      ];
      
      await entry.deleteOne();
      
      const startTime = Date.now();
      deleteFromSheet(oldSheetData, 0).then(() => {
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

module.exports = { createEggEntry, getEggEntries, updateEggEntry, deleteEggEntry };
