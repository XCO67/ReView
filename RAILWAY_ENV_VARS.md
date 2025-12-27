# Railway Environment Variables - Current Configuration

## ✅ Required Variables (Set These in Railway)

When setting these in Railway's **Variables** tab, **DO NOT include quotes** around the values. Railway will handle them automatically.

### 1. DATABASE_URL (Supabase)
```
postgresql://postgres.pvboydyzaczrkeeexiyl:Kuwaitreviewpassword1967%5E%26@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres
```

**Important:** 
- The `%5E%26` is URL-encoded `^&` - this is correct
- Copy the ENTIRE string above (including the URL-encoded password)
- Do NOT add quotes around it in Railway

### 2. SESSION_SECRET
```
92caebe9844703a2887089221d1e65df
```

### 3. NODE_ENV
```
production
```

### 4. DEFAULT_ADMIN_USERNAME
```
admin
```

### 5. DEFAULT_ADMIN_EMAIL
```
admin@kuwaitre.com
```

### 6. DEFAULT_ADMIN_PASSWORD
```
KuwaitRe2024!Secure
```

### 7. NO_CACHE (Optional)
```
1
```

## 🔍 How to Verify in Railway

1. Go to your service → **Variables** tab
2. Check that each variable is set **without quotes**
3. The value should match exactly what's shown above

## ⚠️ Common Mistakes

- ❌ **WRONG:** `DATABASE_URL="postgresql://..."` (with quotes)
- ✅ **CORRECT:** `DATABASE_URL=postgresql://...` (no quotes)

- ❌ **WRONG:** `SESSION_SECRET="92caebe9844703a2887089221d1e65df"` (with quotes)
- ✅ **CORRECT:** `SESSION_SECRET=92caebe9844703a2887089221d1e65df` (no quotes)

## 🧪 Testing Database Connection

If you want to test the database connection, you can add a temporary health check endpoint or check the Deploy Logs for connection errors.

## 📝 Notes

- Your database is on **Supabase** (not Railway PostgreSQL) - this is fine!
- The connection string uses Supabase's pooler on port **6543**
- SSL is automatically enabled for production connections

