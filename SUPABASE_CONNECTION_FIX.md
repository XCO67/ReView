# 🔧 Supabase "Tenant or user not found" Error Fix

## ❌ Error: `Tenant or user not found` (Code: XX000)

This is a **Supabase-specific error** that means:
- The database user/tenant doesn't exist
- The connection string is pointing to the wrong project
- The username format is incorrect
- The Supabase project might be deleted/suspended

## 🔍 Your Current Connection String

Based on your error, your DATABASE_URL is:
```
postgresql://postgres.pvboydyzaczrkeeexiyl:Kuwaitreviewpassword1967%5E%26@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres
```

The username is: `postgres.pvboydyzaczrkeeexiyl`

## ✅ How to Fix

### Step 1: Get the Correct Connection String from Supabase

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **"Connection string"** section
5. Select **"Connection pooling"** tab (for port 6543)
6. Copy the connection string

### Step 2: Verify the Format

The connection string should look like:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-[REGION].pooler.supabase.com:6543/postgres
```

**Important parts:**
- `postgres.[PROJECT_REF]` - Your project reference (should match your Supabase project)
- `[PASSWORD]` - Your database password (URL-encoded if it has special chars)
- `aws-[REGION]` - Your region (e.g., `aws-1-ap-northeast-2`)
- Port `6543` - Connection pooler port

### Step 3: Check Your Supabase Project

1. Verify your project is **active** (not paused/deleted)
2. Check if the project reference `pvboydyzaczrkeeexiyl` matches your actual project
3. Verify your database password is correct

### Step 4: Try Direct Connection (Alternative)

If the pooler doesn't work, try the **direct connection**:

1. In Supabase Dashboard → Settings → Database
2. Select **"Direct connection"** tab
3. Copy that connection string
4. Use port `5432` instead of `6543`

### Step 5: Update Railway

1. Go to Railway → Your service → **Variables** tab
2. Update `DATABASE_URL` with the correct connection string from Supabase
3. Make sure **NO quotes** around it
4. Save - Railway will redeploy

## 🔍 Common Issues

### Issue 1: Wrong Project Reference

The username `postgres.pvboydyzaczrkeeexiyl` might be from a different project or old project.

**Fix:** Get the current connection string from your active Supabase project.

### Issue 2: Password Changed

If you changed your Supabase database password, the connection string needs to be updated.

**Fix:** 
1. Reset password in Supabase Dashboard
2. Get new connection string
3. Update Railway

### Issue 3: Project Paused/Deleted

If your Supabase project was paused or deleted, you'll get this error.

**Fix:**
1. Check Supabase Dashboard
2. Reactivate project if paused
3. Create new project if deleted

### Issue 4: Wrong Region

The connection string points to `aws-1-ap-northeast-2` - make sure this matches your project's region.

**Fix:** Verify region in Supabase Dashboard → Settings → General

## 🧪 Test Connection

After updating, check:
1. Health endpoint: `https://review-production-8775.up.railway.app/api/health`
2. Should show: `"database": "connected"` instead of error
3. Try logging in

## 📝 Quick Checklist

- [ ] Supabase project is active
- [ ] Connection string copied from Supabase Dashboard
- [ ] Project reference matches your project
- [ ] Password is correct (URL-encoded if needed)
- [ ] Region matches your project
- [ ] DATABASE_URL updated in Railway (no quotes)
- [ ] Railway redeployed

## 🆘 Still Not Working?

If you're still getting the error:
1. Create a new Supabase project
2. Get the connection string from the new project
3. Update Railway with the new connection string
4. Re-import your data if needed

