const express = require('express');
const router = express.Router();
const { createHenDeath, getHenDeaths, updateHenDeath, deleteHenDeath } = require('../controllers/henController');

router.route('/').post(createHenDeath).get(getHenDeaths);
router.route('/:id').put(updateHenDeath).delete(deleteHenDeath);

module.exports = router;
