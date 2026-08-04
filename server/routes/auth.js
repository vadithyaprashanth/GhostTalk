// server/routes/auth.js
const express  = require('express');
const router   = express.Router();
const {
  signup, login, getMe,
  getSecurityQuestions, getUserSecurityQuestion,
  forgotPassword, changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const rateLimit   = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { message: 'Too many requests — try again in 15 minutes' },
});

router.get('/security-questions',             getSecurityQuestions);
router.get('/security-question/:username',    getUserSecurityQuestion);
router.post('/signup',          limiter,       signup);
router.post('/login',           limiter,       login);
router.get('/me',               protect,       getMe);
router.post('/forgot-password', limiter,       forgotPassword);
router.post('/change-password', protect,       changePassword);

module.exports = router;