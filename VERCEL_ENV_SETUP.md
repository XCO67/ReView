# Vercel Environment Variables Setup Guide

## Required Environment Variables

To fix the authentication error on Vercel, you need to configure the following environment variables in your Vercel project settings.

### 1. Database Connection (Choose ONE option)

**Option A: Use DATABASE_URL (Recommended)**
```
DATABASE_URL=postgres://username:password@host:port/database_name
```

**Option B: Use Individual Variables**
```
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=kuwait_dashboard
DB_USER=your-database-user
DB_PASSWORD=your-database-password
```

### 2. Session Secret (REQUIRED)
```
SESSION_SECRET=your-random-secret-key-here-minimum-32-characters
```

**Generate a secure secret:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 3. Default Admin User (Optional but Recommended)
```
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=your-secure-password
```

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click on **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: The variable name (e.g., `DATABASE_URL`)
   - **Value**: The variable value
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**
5. **Redeploy** your application for changes to take effect

## Important Notes

- **SESSION_SECRET** must be set, otherwise authentication will fail
- **Database connection** must be accessible from Vercel's servers
- If using a cloud database (like Supabase, AWS RDS, etc.), ensure:
  - The database allows connections from Vercel's IP ranges
  - SSL is enabled (the code automatically uses SSL in production)
- After adding environment variables, you **must redeploy** for them to take effect

## Testing the Connection

After setting up the environment variables and redeploying:

1. Try logging in with your default admin credentials
2. If you still get an error, check Vercel's function logs:
   - Go to **Deployments** → Click on your latest deployment → **Functions** tab
   - Look for any error messages related to database connection or SESSION_SECRET

## Common Issues

### "SESSION_SECRET is not set"
- Make sure `SESSION_SECRET` is added in Vercel environment variables
- Redeploy after adding it

### "DATABASE_URL or DB_HOST/... must be set"
- Make sure either `DATABASE_URL` or all `DB_*` variables are set
- Check that the values are correct (no extra spaces)
- Redeploy after adding them

### "Connection timeout" or "Connection refused"
- Your database might not be accessible from Vercel
- Check firewall rules and allow Vercel's IP ranges
- For cloud databases, check if they allow external connections

