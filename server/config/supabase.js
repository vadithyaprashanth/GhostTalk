// server/config/supabase.js
require('dotenv').config(); // load .env BEFORE using any env vars
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;