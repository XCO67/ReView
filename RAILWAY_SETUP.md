# 🚂 Railway Setup Guide

## Overview

This application is deployed on **Railway** with:
- **Hosting:** Railway (Next.js app)
- **Database:** Railway PostgreSQL
- **Repository:** GitHub (auto-deploys on push)

## 📋 Environment Variables

Set these in Railway → Your service → **Variables** tab:

### Required Variables

```
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:[PORT]/railway
SESSION_SECRET=[GENERATE_SECURE_SECRET]
NODE_ENV=production
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@kuwaitre.com
DEFAULT_ADMIN_PASSWORD=[GENERATE_SECURE_PASSWORD]
```

**Important:**
- NO quotes around values
- `DATABASE_URL` should point to your Railway PostgreSQL database
- Get the connection string from Railway → PostgreSQL service → Variables tab

## 🗄️ Database Setup

### Railway PostgreSQL Connection

Your Railway PostgreSQL database connection string format:
```
postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway
```

To get your connection string:
1. Go to Railway dashboard
2. Click on your **PostgreSQL** service
3. Go to **Variables** tab
4. Copy the `DATABASE_URL` or construct it from individual variables

### Database Tables

The app automatically creates these tables on first run:
- `roles` - User roles
- `users` - User accounts
- `user_roles` - User-role assignments
- `audit_logs` - Activity logs
- `policies` - Reinsurance policy data

## 🚀 Deployment

### Automatic Deployment

Railway automatically deploys when you push to GitHub:
1. Push to `main` branch
2. Railway detects changes
3. Builds Docker image
4. Deploys new version

### Manual Deployment

1. Go to Railway → Your service
2. Click **"Deploy"** → **"Redeploy"**

## 🔍 Troubleshooting

### Database Connection Issues

1. **Check Railway PostgreSQL is running:**
   - Go to Railway → PostgreSQL service
   - Should show "Active" or "Online"

2. **Verify DATABASE_URL:**
   - Check Variables tab
   - Should match your Railway PostgreSQL connection string
   - NO quotes around it

3. **Test connection:**
   - Visit: `https://your-app.up.railway.app/api/health`
   - Should show: `"database": "connected"`

### Port Issues

Railway automatically sets `PORT` environment variable. The app listens on:
- `0.0.0.0` (all interfaces)
- Port from `PORT` env var (Railway sets this)

### Build Issues

1. Check Deploy Logs in Railway
2. Look for TypeScript/ESLint errors
3. Fix errors and push again

## 📝 Default Login

After first deployment:
- **Username:** `admin`
- **Email:** `admin@kuwaitre.com`
- **Password:** `KuwaitRe2024!Secure`

⚠️ **Change this password immediately after first login!**

## 🔗 Useful Links

- **Railway Dashboard:** https://railway.app
- **Your App URL:** Check Railway → Settings → Networking
- **Health Endpoint:** `https://your-app.up.railway.app/api/health`

## 🛠️ Local Development

For local development, use the same environment variables in your `.env` file, but you can use:
- Local PostgreSQL, OR
- Railway PostgreSQL (same connection string)

The app works the same way locally and in production.

