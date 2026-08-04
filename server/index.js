// server/index.js
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express     = require('express');
const cors        = require('cors');
const authRoutes  = require('./routes/auth');
const postRoutes  = require('./routes/posts');
const adminRoutes = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

app.use('/api/auth',  authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

app.listen(PORT, () => {
  console.log(`🚀 GhostTalk running on http://localhost:${PORT}`);
  console.log(`✅ Supabase: ${process.env.SUPABASE_URL}`);
});