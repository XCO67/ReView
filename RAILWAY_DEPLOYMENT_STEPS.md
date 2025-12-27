# 🚀 Railway Deployment Steps - Quick Guide

## ✅ Pre-Deployment Checklist

- [x] Code pushed to GitHub: `https://github.com/XCO67/ReView.git`
- [x] Railway database already set up
- [x] Database tables created
- [x] CSV data imported (47,071 policies)
- [ ] Deploy Next.js app to Railway
- [ ] Set environment variables
- [ ] Test deployment

---

## 📋 Step-by-Step Deployment

### Step 1: Create New Service in Railway

1. Go to https://railway.app
2. Open your existing project (the one with PostgreSQL database)
3. Click **"+ New"** button (top right)
4. Select **"GitHub Repo"**
5. Search for and select: **`XCO67/ReView`**
6. Railway will automatically detect it's a Next.js project

### Step 2: Set Environment Variables

1. Click on your new **Next.js service** in Railway
2. Go to **"Variables"** tab
3. Click **"+ New Variable"** and add each of these:

```
DATABASE_URL = postgresql://postgres:XenBBaaFFFRufRfjMdlLVWfunJZYdqIO@centerbeam.proxy.rlwy.net:37333/railway
```

```
SESSION_SECRET = zOtuPjhRqJ7gyp2VEOrZKF0Gdi0aiIKMZ5zR6aSZuhI=
```

```
NODE_ENV = production
```

```
DEFAULT_ADMIN_USERNAME = mainadmin
```

```
DEFAULT_ADMIN_EMAIL = admin@kuwaitre.com
```

```
DEFAULT_ADMIN_PASSWORD = KuwaitRe2024!Secure
```

**Important:** Copy these EXACTLY as shown (no extra spaces, quotes, etc.)

### Step 3: Deploy

1. Railway will automatically start building once you connect the repo
2. Watch the **"Deployments"** tab for build progress
3. Build typically takes 2-5 minutes
4. Once deployed, you'll see "Deployed successfully" ✅

### Step 4: Get Public URL

1. Go to your Next.js service **"Settings"** tab
2. Scroll to **"Domains"** section
3. Click **"Generate Domain"**
4. Railway will create a URL like: `your-app-production.up.railway.app`
5. **Copy this URL** - this is your live website!

### Step 5: Test the Deployment

1. Open the Railway URL in your browser
2. You should see the login page
3. Login with:
   - **Username:** `mainadmin`
   - **Email:** `admin@kuwaitre.com`
   - **Password:** `KuwaitRe2024!Secure`
4. Verify the dashboard loads with your data

---

## 🔧 Troubleshooting

### Build Fails
- Check **"Deployments"** tab → Click on failed deployment → View logs
- Common issues:
  - Missing environment variables → Add them in "Variables" tab
  - Build errors → Check logs for specific error messages

### Database Connection Error
- Verify `DATABASE_URL` is set correctly in Variables
- Check Railway database is running (should show "Online")
- Ensure the connection string matches exactly

### App Won't Start
- Check **"Logs"** tab for error messages
- Verify all environment variables are set
- Ensure `NODE_ENV=production` is set

### Can't Access Website
- Verify domain is generated in Settings → Domains
- Check service status is "Deployed"
- Try the Railway-provided URL (not localhost)

---

## 📝 Post-Deployment

### Create User for Your Boss

1. Login as admin on the deployed site
2. Go to **Admin** → **Users**
3. Click **"Create User"**
4. Fill in:
   - Username
   - Email
   - Name
   - Password
   - Assign appropriate roles
5. Save and share credentials with your boss

### Share Access

Send your boss:
- **Website URL:** `your-app-production.up.railway.app`
- **Login credentials** (or have them create their own account)

---

## 🔄 Updating the Deployment

Whenever you push changes to GitHub:
1. Railway automatically detects the push
2. Starts a new deployment
3. Deploys the updated version
4. Your boss will see the latest version automatically!

---

## 💰 Railway Pricing

- **Free tier:** $5 credit/month
- **After free tier:** Pay-as-you-go (~$5-10/month for small apps)
- Database + App: Usually stays within free tier for development/testing

---

## ✅ Success Checklist

- [ ] Next.js service created in Railway
- [ ] GitHub repo connected
- [ ] All environment variables set
- [ ] Build completed successfully
- [ ] Public domain generated
- [ ] Website accessible
- [ ] Login works
- [ ] Data loads correctly
- [ ] Boss can access the site

---

## 🆘 Need Help?

If you encounter issues:
1. Check Railway **"Logs"** tab for error messages
2. Verify all environment variables are set correctly
3. Ensure database service is running
4. Check Railway status page: https://status.railway.app

---

**Your GitHub Repo:** https://github.com/XCO67/ReView.git  
**Ready to deploy!** 🚀

