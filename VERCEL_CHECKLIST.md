# Vercel Environment Variables Verification Checklist

## ✅ Verify Your Vercel Variables Match

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Make sure you have these **exact** variables:

### 1. ✅ DATABASE_URL (CRITICAL - Must be Pooler Connection)
**Value should be:**
```
postgresql://postgres.pvboydyzaczrkeeexiyl:Kuwaitreviewpassword1967^&@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Check:**
- ✅ Uses `pooler.supabase.com` (NOT `db.pvboydyzaczrkeeexiyl.supabase.co`)
- ✅ Port is `6543` (NOT `5432`)
- ✅ Username includes project ref: `postgres.pvboydyzaczrkeeexiyl`
- ✅ Environment: All (Production, Preview, Development)

### 2. ✅ SESSION_SECRET (REQUIRED)
**Value should be:**
```
92caebe9844703a2887089221d1e65df
```

**Check:**
- ✅ Exactly 32 characters
- ✅ Environment: All (Production, Preview, Development)

### 3. ✅ DEFAULT_ADMIN_USERNAME (Optional)
**Value should be:**
```
admin
```

### 4. ✅ DEFAULT_ADMIN_EMAIL (Optional)
**Value should be:**
```
admin@kuwaitre.com
```

### 5. ✅ DEFAULT_ADMIN_PASSWORD (Optional)
**Value should be:**
```
Admin@2024!
```

## ❌ Remove These (If Present)

If you see any of these, **DELETE** them:
- ❌ `DB_HOST=localhost`
- ❌ `DB_HOST=127.0.0.1`
- ❌ Any `DATABASE_URL` containing `localhost`
- ❌ `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (if they point to localhost)

## 🔄 After Verifying

1. **Redeploy** your application:
   - Go to **Deployments**
   - Click **⋯** (three dots) on latest deployment
   - Click **Redeploy**
   - Wait for completion

2. **Test Login:**
   - Username: `admin`
   - Password: `Admin@2024!`

## 🐛 If Still Not Working

### Check Vercel Function Logs:
1. Go to **Deployments** → Latest deployment
2. Click **Functions** tab
3. Find `/api/auth/login`
4. Check logs for errors

### Common Issues:

**Error: "ENOTFOUND db.pvboydyzaczrkeeexiyl.supabase.co"**
- **Fix:** Make sure `DATABASE_URL` uses `pooler.supabase.com` (not `db.pvboydyzaczrkeeexiyl.supabase.co`)

**Error: "SESSION_SECRET is not set"**
- **Fix:** Add `SESSION_SECRET` and redeploy

**Error: "Database connection failed"**
- **Fix:** 
  - Verify `DATABASE_URL` is correct
  - Check Supabase project is active (not paused)
  - Make sure password in connection string is correct

## 📋 Quick Verification Command

If you want to verify your variables are set correctly, check the Vercel deployment logs after redeploying. The app will show specific error messages if any variables are missing or incorrect.

