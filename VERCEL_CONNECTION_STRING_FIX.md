# Fix: "Tenant or user not found" Error

## The Problem

The error "Tenant or user not found" occurs when:
1. Special characters in the password (`^&`) are not URL-encoded
2. The connection string format is incorrect for Supabase pooler

## Solution: URL-Encode the Password

Your password `Kuwaitreviewpassword1967^&` contains special characters that need to be URL-encoded:
- `^` becomes `%5E`
- `&` becomes `%26`

## Correct Connection String

### Option 1: Use URL-Encoded Password (Recommended)

**Original password:** `Kuwaitreviewpassword1967^&`  
**URL-encoded password:** `Kuwaitreviewpassword1967%5E%26`

**Correct DATABASE_URL:**
```
postgresql://postgres.pvboydyzaczrkeeexiyl:Kuwaitreviewpassword1967%5E%26@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Option 2: Get Connection String from Supabase (Easiest)

1. Go to **Supabase Dashboard** → Your Project
2. Go to **Settings** → **Database**
3. Scroll to **Connection string**
4. Select **Pooler** tab
5. Select **Session mode** (try this if Transaction mode doesn't work)
6. Copy the connection string - Supabase will automatically URL-encode it
7. Paste it into Vercel

## Steps to Fix in Vercel

1. **Go to Vercel** → Your Project → **Settings** → **Environment Variables**

2. **Find `DATABASE_URL`** and click **Edit**

3. **Update the value** to use URL-encoded password:
   ```
   postgresql://postgres.pvboydyzaczrkeeexiyl:Kuwaitreviewpassword1967%5E%26@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

4. **OR** get the connection string directly from Supabase (recommended):
   - Go to Supabase → Settings → Database → Connection string → Pooler
   - Copy the connection string (it will have the password already encoded)
   - Paste it into Vercel

5. **Click Save**

6. **Redeploy:**
   - Go to **Deployments**
   - Click **⋯** on latest deployment
   - Click **Redeploy**

## Alternative: Reset Database Password

If URL encoding doesn't work, you can reset your Supabase database password to one without special characters:

1. Go to **Supabase** → **Settings** → **Database**
2. Click **"Reset database password"**
3. Set a new password **without special characters** (e.g., `KuwaitReviewPassword1967`)
4. Copy the new connection string from Supabase
5. Update `DATABASE_URL` in Vercel with the new connection string
6. Redeploy

## Quick URL Encoding Reference

| Character | URL-Encoded |
|-----------|-------------|
| `^` | `%5E` |
| `&` | `%26` |
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `+` | `%2B` |
| `=` | `%3D` |
| `?` | `%3F` |
| `/` | `%2F` |
| `:` | `%3A` |

## Verify Connection String Format

Your connection string should look like:
```
postgresql://[USERNAME]:[URL-ENCODED-PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

Example:
```
postgresql://postgres.pvboydyzaczrkeeexiyl:Kuwaitreviewpassword1967%5E%26@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

