const express = require('express');
const router = express.Router();
const { createFeedEntry, getFeedEntries, updateFeedEntry, deleteFeedEntry } = require('../controllers/feedController');

router.route('/').post(createFeedEntry).get(getFeedEntries);
router.route('/:id').put(updateFeedEntry).delete(deleteFeedEntry);

module.exports = router;
