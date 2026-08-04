// server/controllers/postController.js
const supabase = require('../config/supabase');

const BAD_WORDS  = ['spam', 'hate', 'abuse', 'toxic'];
const filterBody = (t) => { let s = t; BAD_WORDS.forEach(w => { s = s.replace(new RegExp(w, 'gi'), '***'); }); return s; };
const extractTags = (t) => (t.match(/#\w+/g) || []).map(x => x.toLowerCase());

const shapePost = (p) => ({
  _id:             p.id,
  body:            p.body,
  tags:            p.tags || [],
  username:        p.username,
  author:          p.user_id,
  moderated:       p.moderated,
  commentsEnabled: p.comments_enabled !== false,
  createdAt:       p.created_at,
  likes:           (p.likes    || []).map(l => l.user_id),
  comments:        (p.comments || []).map(c => ({
    _id:       c.id,
    text:      c.text,
    username:  c.username,
    author:    c.user_id,
    createdAt: c.created_at,
  })),
  reports: (p.reports || []).map(r => r.user_id),
  reportCount: (p.reports || []).length,
});

const SELECT = `
  id, body, tags, username, user_id, moderated, comments_enabled, created_at,
  likes:post_likes(user_id),
  comments:post_comments(id, text, username, user_id, created_at),
  reports:post_reports(user_id)
`;

// ── GET /api/posts ────────────────────────────────────────
const getPosts = async (req, res) => {
  try {
    const { tab = 'latest', tag, search, page = 1, userId } = req.query;
    const limit = 20;
    const from  = (Number(page) - 1) * limit;
    const to    = from + limit - 1;

    let query = supabase.from('posts').select(SELECT).range(from, to);

    if (tag)    query = query.contains('tags', [tag.toLowerCase()]);
    if (search) query = query.ilike('body', `%${search}%`);
    if (tab === 'mine' && userId) query = query.eq('user_id', userId);
    if (tab === 'hot') query = query.order('like_count', { ascending: false });
    else               query = query.order('created_at',  { ascending: false });

    const { data: posts, error } = await query;
    if (error) throw error;

    // Filter posts with 5+ reports
    const filtered = (posts || []).filter(p => (p.reports || []).length < 5);
    res.json({ posts: filtered.map(shapePost), page: Number(page) });
  } catch (err) {
    console.error('getPosts:', err);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
};

// ── POST /api/posts ───────────────────────────────────────
const createPost = async (req, res) => {
  try {
    // Blocked users cannot post
    if (req.user.is_blocked)
      return res.status(403).json({ message: 'Your account is blocked.' });
    // Admins can always post — only restrict non-admin users
    if (!req.user.can_post && !req.user.is_admin)
      return res.status(403).json({ message: 'Your posting privilege has been revoked by an admin.' });

    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ message: 'Post body is required' });
    if (body.length > 280) return res.status(400).json({ message: 'Max 280 characters' });

    const clean     = filterBody(body.trim());
    const moderated = clean !== body.trim();

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id:   req.user.id,
        username:  req.user.username,
        body:      clean,
        tags:      extractTags(clean),
        moderated,
      })
      .select(SELECT)
      .single();
    if (error) throw error;

    res.status(201).json(shapePost(post));
  } catch (err) {
    console.error('createPost:', err);
    res.status(500).json({ message: 'Failed to create post' });
  }
};

// ── DELETE /api/posts/:id ─────────────────────────────────
const deletePost = async (req, res) => {
  try {
    const { data: post } = await supabase
      .from('posts').select('user_id').eq('id', req.params.id).single();
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user_id !== req.user.id && !req.user.is_admin)
      return res.status(403).json({ message: 'Not authorised' });

    await supabase.from('posts').delete().eq('id', req.params.id);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete post' });
  }
};

// ── POST /api/posts/:id/like ──────────────────────────────
const toggleLike = async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('post_likes').select('id')
      .eq('post_id', req.params.id).eq('user_id', req.user.id).single();

    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id);
      res.json({ liked: false });
    } else {
      await supabase.from('post_likes').insert({ post_id: req.params.id, user_id: req.user.id });
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle like' });
  }
};

// ── POST /api/posts/:id/comment ───────────────────────────
const addComment = async (req, res) => {
  try {
    const { data: post } = await supabase
      .from('posts').select('comments_enabled').eq('id', req.params.id).single();
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.comments_enabled === false)
      return res.status(403).json({ message: 'Comments are disabled on this post.' });

    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment text is required' });

    const { data: comment, error } = await supabase
      .from('post_comments')
      .insert({
        post_id:  req.params.id,
        user_id:  req.user.id,
        username: req.user.username,
        text:     filterBody(text.trim()),
      })
      .select('id, text, username, user_id, created_at')
      .single();
    if (error) throw error;

    res.status(201).json({
      _id:       comment.id,
      text:      comment.text,
      username:  comment.username,
      author:    comment.user_id,
      createdAt: comment.created_at,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

// ── PATCH /api/posts/:id/toggle-comments ─────────────────
const toggleComments = async (req, res) => {
  try {
    const { data: post } = await supabase
      .from('posts').select('user_id, comments_enabled').eq('id', req.params.id).single();
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user_id !== req.user.id)
      return res.status(403).json({ message: 'Only the post owner can toggle comments' });

    const { data: updated } = await supabase
      .from('posts').update({ comments_enabled: !post.comments_enabled })
      .eq('id', req.params.id).select('comments_enabled').single();

    res.json({ commentsEnabled: updated.comments_enabled });
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle comments' });
  }
};

// ── POST /api/posts/:id/report ────────────────────────────
const reportPost = async (req, res) => {
  try {
    const { reason = 'inappropriate' } = req.body;

    const { data: existing } = await supabase
      .from('post_reports').select('id')
      .eq('post_id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (existing) return res.status(400).json({ message: 'Already reported' });

    await supabase.from('post_reports').insert({
      post_id: req.params.id,
      user_id: req.user.id,
      reason,
    });

    res.json({ message: 'Reported. Thank you.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to report post' });
  }
};

// ── GET /api/posts/trending-tags ──────────────────────────
const getTrendingTags = async (req, res) => {
  try {
    const { data: posts } = await supabase
      .from('posts').select('tags, like_count');
    const map = {};
    (posts || []).forEach(p => {
      (p.tags || []).forEach(t => { map[t] = (map[t] || 0) + 1 + (p.like_count || 0); });
    });
    const sorted = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([_id, count]) => ({ _id, count }));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch trending tags' });
  }
};

module.exports = {
  getPosts, createPost, deletePost,
  toggleLike, addComment, toggleComments,
  reportPost, getTrendingTags,
};