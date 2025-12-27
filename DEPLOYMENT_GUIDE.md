# Deployment Guide - Kuwait Re Dashboard

## 🚀 Quick Deployment Options

### Option 1: Railway (Recommended - Same Platform as Database)

Railway is perfect since you're already using it for your database!

#### Steps:

1. **Install Railway CLI** (optional, but helpful):
   ```powershell
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo" (if you have GitHub) OR "Empty Project"

3. **Connect Your Code**:
   - **Option A: GitHub** (Recommended)
     - Push your code to GitHub
     - In Railway, click "New Project" → "Deploy from GitHub repo"
     - Select your repository
   
   - **Option B: Railway CLI**
     ```powershell
     cd "C:\Users\USER\Desktop\ReView\ReView"
     railway login
     railway init
     railway up
     ```

4. **Set Environment Variables in Railway**:
   - Go to your project → Click on your service
   - Go to "Variables" tab
   - Add these variables:
     ```
     DATABASE_URL=postgresql://postgres:XenBBaaFFFRufRfjMdlLVWfunJZYdqIO@centerbeam.proxy.rlwy.net:37333/railway
     SESSION_SECRET=zOtuPjhRqJ7gyp2VEOrZKF0Gdi0aiIKMZ5zR6aSZuhI=
     NODE_ENV=production
     DEFAULT_ADMIN_USERNAME=mainadmin
     DEFAULT_ADMIN_EMAIL=admin@kuwaitre.com
     DEFAULT_ADMIN_PASSWORD=KuwaitRe2024!Secure
     ```

5. **Deploy**:
   - Railway will automatically detect Next.js and deploy
   - Wait for deployment to complete
   - Get your public URL from Railway dashboard

---

### Option 2: Vercel (Best for Next.js - Free Tier Available)

Vercel is made by the Next.js team and offers excellent performance.

#### Steps:

1. **Sign up for Vercel**:
   - Go to https://vercel.com
   - Sign up with GitHub (recommended) or email

2. **Push Code to GitHub** (if not already):
   ```powershell
   # Initialize git if needed
   cd "C:\Users\USER\Desktop\ReView\ReView"
   git init
   git add .
   git commit -m "Initial commit"
   
   # Create repo on GitHub and push
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

3. **Deploy to Vercel**:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

4. **Set Environment Variables in Vercel**:
   - Go to Project Settings → Environment Variables
   - Add:
     ```
     DATABASE_URL=postgresql://postgres:XenBBaaFFFRufRfjMdlLVWfunJZYdqIO@centerbeam.proxy.rlwy.net:37333/railway
     SESSION_SECRET=zOtuPjhRqJ7gyp2VEOrZKF0Gdi0aiIKMZ5zR6aSZuhI=
     NODE_ENV=production
     DEFAULT_ADMIN_USERNAME=mainadmin
     DEFAULT_ADMIN_EMAIL=admin@kuwaitre.com
     DEFAULT_ADMIN_PASSWORD=KuwaitRe2024!Secure
     ```

5. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - You'll get a URL like: `your-app.vercel.app`

---

## 🔒 Security Checklist Before Deployment

- [ ] Change default admin password after first login
- [ ] Use strong `SESSION_SECRET` (already done ✅)
- [ ] Database connection uses SSL (Railway handles this ✅)
- [ ] Environment variables are set in hosting platform
- [ ] `.env` file is in `.gitignore` (already done ✅)

---

## 📝 Post-Deployment Steps

1. **Test the deployed site**:
   - Visit the URL provided by Railway/Vercel
   - Login with admin credentials
   - Verify data loads correctly

2. **Create user account for your boss**:
   - Login as admin
   - Go to Admin → Users
   - Create a new user account
   - Assign appropriate roles

3. **Share access**:
   - Send the deployment URL to your boss
   - Share login credentials (or have them create their own account)

---

## 🔄 Updating the Deployment

### Railway:
- Push changes to GitHub → Railway auto-deploys
- OR use `railway up` command

### Vercel:
- Push changes to GitHub → Vercel auto-deploys
- OR use Vercel CLI: `vercel --prod`

---

## 💰 Pricing

**Railway:**
- Free tier: $5 credit/month
- Pay-as-you-go after that
- ~$5-10/month for small apps

**Vercel:**
- Free tier: Unlimited personal projects
- Hobby plan: $0/month (good for most use cases)
- Pro plan: $20/month (for teams)

---

## 🆘 Troubleshooting

**"Database connection failed"**:
- Verify `DATABASE_URL` is correct in environment variables
- Check Railway database is running
- Ensure SSL is enabled (Railway handles this automatically)

**"Session secret error"**:
- Verify `SESSION_SECRET` is set in environment variables
- Must be the same value you used locally

**"Build failed"**:
- Check build logs in Railway/Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

---

## 📞 Need Help?

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment

