// server/controllers/adminController.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt   = require('bcryptjs');
const supabase = require('../config/supabase');

// ── GET /api/admin/stats ──────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [
      { data: allUsers },
      { data: allPosts },
      { data: allReports },
      { data: blockedList },
    ] = await Promise.all([
      supabase.from('users').select('id'),
      supabase.from('posts').select('id'),
      supabase.from('post_reports').select('id'),
      supabase.from('users').select('id').eq('is_blocked', true),
    ]);

    res.json({
      totalUsers:   (allUsers    || []).length,
      totalPosts:   (allPosts    || []).length,
      totalReports: (allReports  || []).length,
      blockedUsers: (blockedList || []).length,
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

// ── GET /api/admin/users ──────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, is_admin, is_blocked, can_post, security_question, temp_password, temp_password_used, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const shaped = users.map(u => ({
      ...u,
      hasTempPassword: !!u.temp_password && !u.temp_password_used,
    }));
    res.json(shaped);
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// ── PATCH /api/admin/users/:id/block ─────────────────────
const toggleBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: user } = await supabase
      .from('users').select('is_blocked, is_admin').eq('id', id).single();
    if (!user)         return res.status(404).json({ message: 'User not found' });
    if (user.is_admin) return res.status(403).json({ message: 'Cannot block another admin' });

    const { data: updated } = await supabase
      .from('users').update({ is_blocked: !user.is_blocked })
      .eq('id', id).select('id, username, is_blocked').single();

    res.json({
      message: `User ${updated.is_blocked ? 'blocked' : 'unblocked'} successfully`,
      user: updated,
    });
  } catch (err) {
    console.error('toggleBlock error:', err);
    res.status(500).json({ message: 'Failed to toggle block' });
  }
};

// ── PATCH /api/admin/users/:id/posting ───────────────────
const togglePosting = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: user } = await supabase
      .from('users').select('can_post, is_admin').eq('id', id).single();
    if (!user)         return res.status(404).json({ message: 'User not found' });
    if (user.is_admin) return res.status(403).json({ message: 'Cannot restrict another admin' });

    const { data: updated } = await supabase
      .from('users').update({ can_post: !user.can_post })
      .eq('id', id).select('id, username, can_post').single();

    res.json({
      message: `Posting ${updated.can_post ? 'enabled' : 'disabled'} for ${updated.username}`,
      user: updated,
    });
  } catch (err) {
    console.error('togglePosting error:', err);
    res.status(500).json({ message: 'Failed to toggle posting' });
  }
};

// ── POST /api/admin/users/:id/reset-password ─────────────
const adminResetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { tempPassword } = req.body;
    if (!tempPassword || tempPassword.length < 6)
      return res.status(400).json({ message: 'Temporary password must be at least 6 characters' });

    const { data: user } = await supabase
      .from('users').select('username, is_admin').eq('id', id).single();
    if (!user)         return res.status(404).json({ message: 'User not found' });
    if (user.is_admin) return res.status(403).json({ message: 'Cannot reset another admin password' });

    const hashed = await bcrypt.hash(tempPassword, 10);
    await supabase.from('users').update({
      temp_password:      hashed,
      temp_password_used: false,
    }).eq('id', id);

    res.json({
      message:     `Temporary password set for @${user.username}.`,
      tempPassword,
      username:    user.username,
    });
  } catch (err) {
    console.error('adminResetPassword error:', err);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

// ── GET /api/admin/reports ────────────────────────────────
const getReports = async (req, res) => {
  try {
    // Use raw SQL via RPC to do the join reliably
    const { data: rows, error } = await supabase.rpc('get_reports_with_details');

    // If RPC not available, fall back to manual join
    if (error) {
      console.log('RPC not available, using manual join...');
      return getReportsFallback(req, res);
    }

    const grouped = {};
    rows.forEach(r => {
      if (!grouped[r.post_id]) {
        grouped[r.post_id] = {
          postId:      r.post_id,
          postBody:    r.post_body,
          postAuthor:  r.post_author,
          postUserId:  r.post_user_id,
          reportCount: 0,
          reporters:   [],
        };
      }
      grouped[r.post_id].reportCount++;
      grouped[r.post_id].reporters.push({
        reportId:   r.report_id,
        username:   r.reporter_username,
        userId:     r.reporter_id,
        reason:     r.reason,
        reportedAt: r.created_at,
      });
    });

    res.json(Object.values(grouped).sort((a, b) => b.reportCount - a.reportCount));
  } catch (err) {
    console.error('getReports error:', err);
    return getReportsFallback(req, res);
  }
};

// Fallback: manual join without RPC
const getReportsFallback = async (req, res) => {
  try {
    // Fetch all reports
    const { data: reports, error: rErr } = await supabase
      .from('post_reports')
      .select('id, post_id, user_id, reason, created_at')
      .order('created_at', { ascending: false });

    if (rErr) throw rErr;
    if (!reports || reports.length === 0) return res.json([]);

    // Collect unique IDs
    const postIds = [...new Set(reports.map(r => r.post_id).filter(Boolean))];
    const userIds = [...new Set(reports.map(r => r.user_id).filter(Boolean))];

    // Parallel fetch
    const [postsRes, usersRes] = await Promise.all([
      supabase.from('posts').select('id, body, username, user_id').in('id', postIds),
      supabase.from('users').select('id, username').in('id', userIds),
    ]);

    // Build maps
    const postMap = {};
    (postsRes.data || []).forEach(p => { postMap[p.id] = p; });

    const userMap = {};
    (usersRes.data || []).forEach(u => { userMap[u.id] = u; });

    // Group by post
    const grouped = {};
    reports.forEach(r => {
      const post     = postMap[r.post_id];
      const reporter = userMap[r.user_id];

      const pid = r.post_id;
      if (!grouped[pid]) {
        grouped[pid] = {
          postId:      pid,
          postBody:    post ? post.body     : '[Post deleted]',
          postAuthor:  post ? post.username : '[unknown]',
          postUserId:  post ? post.user_id  : null,
          postDeleted: !post,
          reportCount: 0,
          reporters:   [],
        };
      }

      grouped[pid].reportCount++;
      grouped[pid].reporters.push({
        reportId:   r.id,
        username:   reporter ? reporter.username : 'unknown',
        userId:     r.user_id,
        reason:     r.reason || 'inappropriate',
        reportedAt: r.created_at,
      });
    });

    const result = Object.values(grouped)
      .sort((a, b) => b.reportCount - a.reportCount);

    res.json(result);
  } catch (err) {
    console.error('getReportsFallback error:', err);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
};

// ── DELETE /api/admin/posts/:id ───────────────────────────
const deletePost = async (req, res) => {
  try {
    await supabase.from('posts').delete().eq('id', req.params.id);
    res.json({ message: 'Post deleted by admin' });
  } catch (err) {
    console.error('deletePost error:', err);
    res.status(500).json({ message: 'Failed to delete post' });
  }
};

// ── DELETE /api/admin/reports/:postId ────────────────────
const dismissReports = async (req, res) => {
  try {
    await supabase.from('post_reports').delete().eq('post_id', req.params.postId);
    res.json({ message: 'Reports dismissed' });
  } catch (err) {
    console.error('dismissReports error:', err);
    res.status(500).json({ message: 'Failed to dismiss reports' });
  }
};

module.exports = {
  getStats, getUsers, toggleBlock, togglePosting,
  adminResetPassword, getReports, deletePost, dismissReports,
};