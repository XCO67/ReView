# 🔍 How to Diagnose Railway Deployment Issues

## Quick Diagnosis Steps

### 1. Check Railway Deploy Logs

1. Go to your Railway service
2. Click **"Deployments"** tab
3. Click on the latest deployment
4. Scroll to the bottom of the logs
5. Look for:
   - ✅ `> Ready on http://0.0.0.0:XXXX` = Server started successfully
   - ❌ `Error:` or `Failed:` = Something crashed
   - ❌ `connection refused` = App not listening on correct port
   - ❌ `SESSION_SECRET is not set` = Missing environment variable
   - ❌ `Database connection failed` = Database issue

### 2. Check Environment Variables

1. Go to your service → **Variables** tab
2. Verify these are set (WITHOUT quotes):
   ```
   DATABASE_URL=postgresql://...
   SESSION_SECRET=92caebe9844703a2887089221d1e65df
   NODE_ENV=production
   DEFAULT_ADMIN_USERNAME=admin
   DEFAULT_ADMIN_EMAIL=admin@kuwaitre.com
   DEFAULT_ADMIN_PASSWORD=KuwaitRe2024!Secure
   ```

### 3. Test Health Endpoint

Once deployed, try accessing:
```
https://your-app.up.railway.app/api/health
```

This will show:
- Application status
- Database connection status
- Environment configuration
- Port and hostname settings

### 4. Check Service Status

1. Go to your service dashboard
2. Check the status indicator:
   - 🟢 **Active** = Running
   - 🟡 **Deploying** = Still building
   - 🔴 **Failed** = Build/deployment failed

### 5. Check Network Settings

1. Go to **Settings** → **Networking**
2. Verify:
   - Public domain is generated
   - Port is set to **3000** (or whatever PORT env var is)
   - Service is publicly accessible

## Common Issues & Fixes

### Issue: "Connection Refused" (502 Bad Gateway)

**Causes:**
- App not binding to `0.0.0.0`
- App not using Railway's PORT
- App crashing on startup

**Fix:**
- Verify `server.js` exists and uses `0.0.0.0`
- Check Deploy Logs for startup errors
- Ensure PORT env var is being used

### Issue: "Application Failed to Respond"

**Causes:**
- App crashed after startup
- Database connection failing
- Missing environment variables

**Fix:**
- Check Deploy Logs for error messages
- Verify all environment variables are set
- Test database connection

### Issue: Build Fails

**Causes:**
- TypeScript errors
- Missing dependencies
- Build script issues

**Fix:**
- Check build logs for specific errors
- Run `npm run build` locally to test
- Fix any TypeScript/ESLint errors

## Run Diagnostic Script Locally

To test your configuration locally:

```bash
cd "C:\Users\USER\Desktop\ReView\ReView"
npm run diagnose
```

This will check:
- Environment variables
- Database connectivity
- Next.js build status
- Port configuration
- Server setup

## Still Having Issues?

1. **Share Deploy Logs** - Copy the last 50-100 lines
2. **Share Health Endpoint Response** - Visit `/api/health` and share the JSON
3. **Check Service Status** - What does Railway show?
4. **Verify Environment Variables** - Are they all set correctly?

