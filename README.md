# 💬 GhostTalk — Username-Based Messaging App (Supabase Edition)

Full-stack messaging app with React frontend + Express backend + Supabase (PostgreSQL) database.

---

## 📁 Project Structure

```
ghosttalk/
├── package.json
├── vercel.json
├── .gitignore
│
├── server/
│   ├── index.js
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   └── supabase.js          ← Supabase client
│   ├── database/
│   │   └── schema.sql           ← Run this in Supabase SQL Editor
│   ├── controllers/
│   │   ├── authController.js
│   │   └── postController.js
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js
│       └── posts.js
│
└── client/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── context/AuthContext.jsx
        ├── utils/api.js · helpers.js
        ├── components/Avatar · Topbar · PostCard · Comments
        └── pages/AuthPage · HomePage
```

---

## 🚀 Setup Guide

### Step 1 — Create a Supabase project (free)

1. Go to https://supabase.com and sign up
2. Click "New Project" → give it a name (e.g. ghosttalk) → set a DB password → Create
3. Wait ~2 minutes for the project to be ready

### Step 2 — Create the database tables

1. In your Supabase project → click "SQL Editor" in the left sidebar
2. Click "New Query"
3. Open the file: server/database/schema.sql
4. Copy the entire contents and paste into the SQL Editor
5. Click "Run" (green button)
6. You should see "Success. No rows returned"

### Step 3 — Get your Supabase credentials

In your Supabase project → Settings (gear icon) → API:

- "Project URL"          → this is your SUPABASE_URL
- "service_role" key     → this is your SUPABASE_SERVICE_KEY
  (click "Reveal" to see it — keep this secret!)

### Step 4 — Configure environment

```bash
cp server/.env.example server/.env
```

Edit server/.env:
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...your-service-role-key
JWT_SECRET=any_long_random_string_here_make_it_long
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Step 5 — Install dependencies

```bash
npm run install:all
```

### Step 6 — Run the app

```bash
npm run dev
```

- Backend  → http://localhost:5000
- Frontend → http://localhost:5173

---

## 🌐 Deploy to Vercel

### Backend
1. New Vercel project → Root Directory: server
2. Add environment variables (same as .env but with your production values)
3. Set CLIENT_URL to your frontend Vercel URL

### Frontend
1. New Vercel project → Root Directory: client
2. Add: VITE_API_URL = your backend Vercel URL

---

## 🗄️ Database Tables

| Table          | Purpose                          |
|----------------|----------------------------------|
| users          | username + hashed password       |
| posts          | message body, tags, author       |
| post_likes     | one row per user-post like       |
| post_comments  | comments linked to posts         |
| post_reports   | one report per user per post     |

---

## 🔌 API Endpoints

| Method | Endpoint                  | Auth | Description        |
|--------|---------------------------|------|--------------------|
| POST   | /api/auth/signup          | —    | Create account     |
| POST   | /api/auth/login           | —    | Sign in, get JWT   |
| GET    | /api/auth/me              | JWT  | Current user       |
| GET    | /api/posts                | —    | List posts         |
| GET    | /api/posts/trending-tags  | —    | Top hashtags       |
| POST   | /api/posts                | JWT  | Create post        |
| DELETE | /api/posts/:id            | JWT  | Delete own post    |
| POST   | /api/posts/:id/like       | JWT  | Toggle like        |
| POST   | /api/posts/:id/comment    | JWT  | Add comment        |
| POST   | /api/posts/:id/report     | JWT  | Report post        |
