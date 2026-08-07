const express = require('express');
const router = express.Router();
const {
  createEggEntry,
  getEggEntries,
  updateEggEntry,
  deleteEggEntry,
} = require('../controllers/eggController');

router.route('/').post(createEggEntry).get(getEggEntries);
router.route('/:id').put(updateEggEntry).delete(deleteEggEntry);

module.exports = router;
