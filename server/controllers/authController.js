// server/controllers/authController.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const supabase = require('../config/supabase');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the name of your primary school?",
  "What city were you born in?",
  "What was your childhood nickname?",
  "What is the name of your favourite childhood friend?",
  "What street did you grow up on?",
  "What was the make of your first car?",
];

const getSecurityQuestions = (_req, res) => res.json(SECURITY_QUESTIONS);

const signup = async (req, res) => {
  try {
    const { username, password, securityQuestion, securityAnswer } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password are required' });
    if (username.length < 3)
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return res.status(400).json({ message: 'Username: letters, numbers and _ only' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (!securityQuestion || !securityAnswer)
      return res.status(400).json({ message: 'Security question and answer are required' });

    const { data: existing } = await supabase
      .from('users').select('id').ilike('username', username).single();
    if (existing)
      return res.status(400).json({ message: 'Username already taken — choose another' });

    const [hashedPw, hashedAnswer] = await Promise.all([
      bcrypt.hash(password, 10),
      bcrypt.hash(securityAnswer.trim().toLowerCase(), 10),
    ]);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ username, password: hashedPw, security_question: securityQuestion, security_answer: hashedAnswer })
      .select('id, username, is_admin, is_blocked, can_post, created_at')
      .single();
    if (error) throw error;

    res.status(201).json({
      token: signToken(user.id),
      user: { _id: user.id, username: user.username, isAdmin: user.is_admin, isBlocked: user.is_blocked, canPost: user.can_post, createdAt: user.created_at },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password are required' });

    const { data: user } = await supabase
      .from('users')
      .select('id, username, password, temp_password, temp_password_used, is_admin, is_blocked, can_post, created_at')
      .ilike('username', username)
      .single();

    if (!user)
      return res.status(401).json({ message: 'No account found with this username' });
    if (user.is_blocked)
      return res.status(403).json({ message: 'Your account has been blocked. Contact the admin.' });

    const normalMatch = await bcrypt.compare(password, user.password);

    let usedTempPassword = false;
    if (!normalMatch && user.temp_password && !user.temp_password_used) {
      const tempMatch = await bcrypt.compare(password, user.temp_password);
      if (!tempMatch)
        return res.status(401).json({ message: 'Incorrect password' });
      usedTempPassword = true;
      await supabase.from('users').update({ temp_password_used: true }).eq('id', user.id);
    } else if (!normalMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    res.json({
      token: signToken(user.id),
      user: { _id: user.id, username: user.username, isAdmin: user.is_admin, isBlocked: user.is_blocked, canPost: user.can_post, createdAt: user.created_at },
      mustChangePassword: usedTempPassword,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const getMe = async (req, res) => {
  res.json({
    user: { _id: req.user.id, username: req.user.username, isAdmin: req.user.is_admin, isBlocked: req.user.is_blocked, canPost: req.user.can_post, createdAt: req.user.created_at },
  });
};

const getUserSecurityQuestion = async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users').select('security_question').ilike('username', req.params.username).single();
    if (!user || !user.security_question)
      return res.status(404).json({ message: 'No security question found for this username' });
    res.json({ question: user.security_question });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { username, securityAnswer, newPassword } = req.body;
    if (!username || !securityAnswer || !newPassword)
      return res.status(400).json({ message: 'Username, answer and new password are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const { data: user } = await supabase
      .from('users').select('id, username, security_answer').ilike('username', username).single();
    if (!user)
      return res.status(404).json({ message: 'No account found with this username' });
    if (!user.security_answer)
      return res.status(400).json({ message: 'No security question set for this account. Contact admin.' });

    const match = await bcrypt.compare(securityAnswer.trim().toLowerCase(), user.security_answer);
    if (!match)
      return res.status(400).json({ message: 'Incorrect security answer' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await supabase.from('users').update({
      password: hashed, temp_password: null, temp_password_used: false,
    }).eq('id', user.id);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Current and new password are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const { data: user } = await supabase
      .from('users').select('password').eq('id', req.user.id).single();
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match)
      return res.status(401).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await supabase.from('users').update({
      password: hashed, temp_password: null, temp_password_used: false,
    }).eq('id', req.user.id);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  signup, login, getMe,
  getSecurityQuestions, getUserSecurityQuestion,
  forgotPassword, changePassword,
};