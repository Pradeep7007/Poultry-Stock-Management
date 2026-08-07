const express = require('express');
const router = express.Router();
const {
  createMedicineEntry,
  getMedicineEntries,
  updateMedicineEntry,
  deleteMedicineEntry
} = require('../controllers/medicineController');

router.route('/')
  .post(createMedicineEntry)
  .get(getMedicineEntries);

router.route('/:id')
  .put(updateMedicineEntry)
  .delete(deleteMedicineEntry);

module.exports = router;
