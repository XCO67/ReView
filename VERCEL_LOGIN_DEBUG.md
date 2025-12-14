# Vercel Login Debugging Guide

## Recent Fixes Applied

1. **Added `credentials: "include"` to login fetch** - Ensures cookies are sent with requests
2. **Improved error messages** - Now shows detailed error messages instead of generic ones
3. **Better database error handling** - Catches and reports database connection issues
4. **Fixed cookie settings** - Properly handles secure cookies on Vercel
5. **Increased database timeout** - Better for cloud database connections

## How to Debug Login Issues on Vercel

### Step 1: Check Vercel Function Logs

1. Go to your Vercel project dashboard
2. Click on **Deployments** → Select your latest deployment
3. Click on **Functions** tab
4. Look for `/api/auth/login` function
5. Check the logs for any errors

### Step 2: Verify Environment Variables

Make sure these are set in Vercel (Settings → Environment Variables):

**Required:**
- `SESSION_SECRET` - Must be set! (Generate with: `openssl rand -base64 32`)
- `DATABASE_URL` OR (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)

**Optional but recommended:**
- `DEFAULT_ADMIN_USERNAME=admin`
- `DEFAULT_ADMIN_EMAIL=admin@example.com`
- `DEFAULT_ADMIN_PASSWORD=your-secure-password`

### Step 3: Test Database Connection

The login route will now show specific error messages:
- "Database connection failed" - Database env vars are wrong or DB is not accessible
- "SESSION_SECRET is missing" - Session secret not configured
- "Invalid username or password" - Credentials are wrong or user doesn't exist

### Step 4: Check Browser Console

1. Open your Vercel site
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Try to login
5. Check for any error messages in the console

### Step 5: Check Network Tab

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try to login
4. Look for the `/api/auth/login` request
5. Check:
   - **Status code** (should be 200 for success)
   - **Response** - What error message is returned?
   - **Cookies** - Is the `app_session` cookie being set?

## Common Issues and Solutions

### Issue: "Authentication error" with no details
**Solution:** Check Vercel function logs. The error message should now be more detailed.

### Issue: Database connection timeout
**Solution:** 
- Check if your database allows connections from Vercel's IP ranges
- For cloud databases (Supabase, AWS RDS, etc.), check firewall/security groups
- Verify `DATABASE_URL` or `DB_*` variables are correct

### Issue: Cookie not being set
**Solution:**
- Make sure you're accessing the site via HTTPS (Vercel provides this automatically)
- Check browser console for cookie-related errors
- The code now includes `credentials: "include"` which should fix this

### Issue: "SESSION_SECRET is not set"
**Solution:**
- Add `SESSION_SECRET` in Vercel environment variables
- Generate a secure random string (minimum 32 characters)
- **Redeploy** after adding it

### Issue: Login succeeds but redirect fails
**Solution:**
- Check if `/api/auth/me` endpoint is working
- Check browser console for redirect errors
- Verify the user has proper roles assigned

## Testing Checklist

- [ ] Environment variables are set in Vercel
- [ ] Database is accessible from Vercel (check firewall/security groups)
- [ ] `SESSION_SECRET` is set and is a secure random string
- [ ] Database connection string is correct
- [ ] Default admin user exists (or create one manually)
- [ ] Checked Vercel function logs for errors
- [ ] Checked browser console for errors
- [ ] Checked Network tab for API response

## Next Steps

After deploying the latest changes:
1. Wait for Vercel to finish deploying
2. Try logging in again
3. Check the error message - it should now be more specific
4. Check Vercel function logs for detailed error information
5. Share the specific error message if you still can't login

