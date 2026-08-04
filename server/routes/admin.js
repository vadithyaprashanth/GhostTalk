// server/routes/admin.js
const express  = require('express');
const router   = express.Router();
const {
  getStats, getUsers, toggleBlock, togglePosting,
  adminResetPassword, getReports, deletePost, dismissReports,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/stats',                     getStats);
router.get('/users',                     getUsers);
router.patch('/users/:id/block',         toggleBlock);
router.patch('/users/:id/posting',       togglePosting);
router.post('/users/:id/reset-password', adminResetPassword);
router.get('/reports',                   getReports);
router.delete('/posts/:id',              deletePost);
router.delete('/reports/:postId',        dismissReports);

module.exports = router;