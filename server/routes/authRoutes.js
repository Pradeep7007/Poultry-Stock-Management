const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, resetPassword } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/reset-password', resetPassword);
router.get('/me', getMe);

module.exports = router;
