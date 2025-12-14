# Vercel Database Setup - Fixing "ECONNREFUSED 127.0.0.1:5432"

## The Problem

The error `connect ECONNREFUSED 127.0.0.1:5432` means your application is trying to connect to a database on `localhost`, which doesn't work on Vercel because:

- Vercel runs on cloud servers, not your local machine
- `localhost` on Vercel refers to Vercel's servers, not your computer
- You need a **cloud-hosted database** that Vercel can access over the internet

## Solution: Use a Cloud Database

You have several options:

### Option 1: Supabase (Recommended - Free Tier Available)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **Settings** → **Database**
4. Copy the **Connection String** (URI format)
5. In Vercel, add this as `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
   Replace `[YOUR-PASSWORD]` and `[PROJECT-REF]` with your actual values

### Option 2: AWS RDS / Google Cloud SQL / Azure Database

If you already have a cloud database:
1. Get the connection string from your cloud provider
2. Make sure the database allows connections from anywhere (or Vercel's IP ranges)
3. Add it to Vercel as `DATABASE_URL`

### Option 3: Railway / Render / Neon

These services provide PostgreSQL databases that work well with Vercel:
- **Railway**: [railway.app](https://railway.app)
- **Render**: [render.com](https://render.com)
- **Neon**: [neon.tech](https://neon.tech)

## Steps to Fix

### 1. Set up a Cloud Database

Choose one of the options above and create your database.

### 2. Update Vercel Environment Variables

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. **Remove or update** any variables that point to `localhost`:
   - If you have `DB_HOST=localhost`, **delete it** or change it to your cloud database host
   - If you have `DATABASE_URL=postgres://...@localhost:5432/...`, **update it** with your cloud database URL

3. **Add/Update** `DATABASE_URL` with your cloud database connection string:
   ```
   DATABASE_URL=postgresql://user:password@your-cloud-db-host:5432/database_name
   ```

### 3. Important: Database Must Allow External Connections

- Make sure your database firewall/security group allows connections from anywhere (0.0.0.0/0)
- Or allow Vercel's IP ranges (check Vercel documentation for current IP ranges)
- Enable SSL/TLS connections (the code handles this automatically)

### 4. Verify Your Connection String Format

Your `DATABASE_URL` should look like:
```
postgresql://username:password@hostname:5432/database_name
```

**NOT:**
```
postgresql://username:password@localhost:5432/database_name  ❌
```

### 5. Redeploy

After updating environment variables:
1. Go to **Deployments** in Vercel
2. Click the **three dots** (⋯) on your latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete
5. Try logging in again

## Quick Test: Supabase Setup

If you want to quickly test with Supabase:

1. **Create Supabase account**: https://supabase.com
2. **Create new project** (takes ~2 minutes)
3. **Get connection string**:
   - Go to Settings → Database
   - Find "Connection string" → "URI"
   - Copy it (looks like: `postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`)
4. **Add to Vercel**:
   - Project → Settings → Environment Variables
   - Add: `DATABASE_URL` = (paste the connection string)
   - Make sure to replace `[YOUR-PASSWORD]` with your actual database password
5. **Redeploy** your Vercel project
6. **Try logging in** - it should work now!

## Common Mistakes

❌ **Using localhost in production**
```
DATABASE_URL=postgres://user:pass@localhost:5432/db  # Won't work on Vercel!
```

✅ **Using cloud database**
```
DATABASE_URL=postgres://user:pass@db.xxxxx.supabase.co:5432/postgres  # Works!
```

❌ **Not replacing password placeholder**
```
DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@...  # Replace [YOUR-PASSWORD]!
```

✅ **Using actual password**
```
DATABASE_URL=postgres://postgres:actualpassword123@...  # Correct!
```

## Need Help?

If you're still getting errors after setting up a cloud database:
1. Check Vercel function logs for the exact error
2. Verify your connection string is correct
3. Test the connection string locally (if possible)
4. Make sure the database allows external connections

