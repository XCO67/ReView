# How to Import Environment Variables to Vercel

## Option 1: Manual Import (Recommended)

Vercel doesn't directly import `.env` files from the dashboard, but you can easily copy the values:

1. **Open the `.env.vercel` file** in this repository
2. **Go to Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
3. **Add each variable** one by one:

### Step-by-Step:

1. Click **"Add New"**
2. Copy each line from `.env.vercel`:
   - **Key:** `DATABASE_URL`
   - **Value:** `postgresql://postgres.pvboydyzaczrkeeexiyl:Kuwaitreviewpassword1967^&@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
   - **Environment:** Select all three (Production, Preview, Development)
   - Click **Save**

3. Repeat for each variable:
   - `SESSION_SECRET`
   - `DEFAULT_ADMIN_USERNAME`
   - `DEFAULT_ADMIN_EMAIL`
   - `DEFAULT_ADMIN_PASSWORD`

## Option 2: Using Vercel CLI (Advanced)

If you have Vercel CLI installed:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Pull environment variables (to see what's already set)
vercel env pull .env.local

# Add variables from .env.vercel
vercel env add DATABASE_URL production
vercel env add SESSION_SECRET production
vercel env add DEFAULT_ADMIN_USERNAME production
vercel env add DEFAULT_ADMIN_EMAIL production
vercel env add DEFAULT_ADMIN_PASSWORD production

# Repeat for preview and development environments
vercel env add DATABASE_URL preview
vercel env add SESSION_SECRET preview
# ... etc
```

## Option 3: Bulk Import via Vercel Dashboard

1. Go to **Settings** → **Environment Variables**
2. Look for **"Import"** or **"Bulk Add"** button (if available)
3. Paste the contents of `.env.vercel` file
4. Vercel will parse and add the variables

## After Adding Variables

**IMPORTANT:** You must redeploy for changes to take effect:

1. Go to **Deployments**
2. Click the **⋯** (three dots) on your latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

## Verify Variables Are Set

1. Go to **Settings** → **Environment Variables**
2. You should see:
   - ✅ `DATABASE_URL`
   - ✅ `SESSION_SECRET`
   - ✅ `DEFAULT_ADMIN_USERNAME`
   - ✅ `DEFAULT_ADMIN_EMAIL`
   - ✅ `DEFAULT_ADMIN_PASSWORD`

## Test Login

After redeploying, test login with:
- **Username:** `admin`
- **Password:** `Admin@2024!` (or whatever you set in `DEFAULT_ADMIN_PASSWORD`)

