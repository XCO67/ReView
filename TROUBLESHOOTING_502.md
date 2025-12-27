# Troubleshooting 502 Bad Gateway Error

## ✅ What I've Fixed

1. **Updated Dockerfile** - Added proper file permissions and Railway PORT support
2. **Created simpler Dockerfile** - Uses `npm start` instead of standalone mode (more reliable)
3. **Switched Railway config** - Now using `Dockerfile.simple`

## 🔍 Check These in Railway

### 1. Environment Variables (CRITICAL)

Go to your service → **Variables** tab and verify these are set:

```
DATABASE_URL=postgresql://postgres:XenBBaaFFFRufRfjMdlLVWfunJZYdqIO@centerbeam.proxy.rlwy.net:37333/railway
SESSION_SECRET=zOtuPjhRqJ7gyp2VEOrZKF0Gdi0aiIKMZ5zR6aSZuhI=
NODE_ENV=production
DEFAULT_ADMIN_USERNAME=mainadmin
DEFAULT_ADMIN_EMAIL=admin@kuwaitre.com
DEFAULT_ADMIN_PASSWORD=KuwaitRe2024!Secure
```

**If any are missing, add them!**

### 2. Check Deploy Logs

1. Go to your service → **Deploy Logs** tab
2. Scroll to the bottom
3. Look for:
   - ✅ "Ready" or "started server" = App is running
   - ❌ "Error" or "Failed" = Something crashed
   - ❌ "Database connection failed" = DB issue
   - ❌ "SESSION_SECRET is not set" = Missing env var

### 3. Check HTTP Logs

1. Go to **HTTP Logs** tab
2. See what errors are happening
3. 502 usually means the app isn't responding

### 4. Verify Service Status

- Service should show **"Active"** or **"Deployed"**
- If it shows **"Failed"** or **"Error"**, check the logs

## 🔧 Common Fixes

### Fix 1: Missing Environment Variables
- Add all required variables in Railway → Variables tab
- Redeploy after adding

### Fix 2: Database Connection Failed
- Verify `DATABASE_URL` is correct
- Check Railway database is running (should show "Online")
- Test connection from Railway database service

### Fix 3: App Crashing on Startup
- Check Deploy Logs for error messages
- Common causes:
  - Missing SESSION_SECRET
  - Database connection timeout
  - Port conflict

### Fix 4: Clear Build Cache
1. Go to Settings → Deploy
2. Click "Clear Build Cache"
3. Click "Redeploy"

## 📋 Quick Checklist

- [ ] All environment variables are set in Railway
- [ ] Database service is running (shows "Online")
- [ ] Service status shows "Active" or "Deployed"
- [ ] Deploy logs show "Ready" or "started server"
- [ ] Port is set to 3000 in Railway networking settings

## 🆘 Still Not Working?

Share the **Deploy Logs** output (especially the last 20-30 lines) and I can help diagnose the specific issue!

