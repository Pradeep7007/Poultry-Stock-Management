const express = require('express');
const router = express.Router();
const {
  createBatch,
  getBatches
} = require('../controllers/batchController');

router.route('/').post(createBatch).get(getBatches);

module.exports = router;
