// server/routes/posts.js
const express = require('express');
const router  = express.Router();
const {
  getPosts, createPost, deletePost,
  toggleLike, addComment, reportPost, getTrendingTags,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');

// Public
router.get('/',               getPosts);
router.get('/trending-tags',  getTrendingTags);

// Protected (JWT required)
router.post('/',                   protect, createPost);
router.delete('/:id',              protect, deletePost);
router.post('/:id/like',           protect, toggleLike);
router.post('/:id/comment',        protect, addComment);
router.post('/:id/report',         protect, reportPost);

module.exports = router;
