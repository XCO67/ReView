# Deployment Check Scripts

Scripts to check Railway deployment status and view errors.

## Quick Start

### Simple Deployment Check (No API Token Required)

Check if your deployed site is accessible:

```bash
# Using npm script
npm run check:deployment:simple <your-railway-url>

# Or directly
npx tsx scripts/check-deployment-simple.ts <your-railway-url>

# Or with environment variable
DEPLOYMENT_URL=https://your-app.railway.app npm run check:deployment:simple
```

**Example:**
```bash
npm run check:deployment:simple https://your-app.railway.app
```

### Full Railway Deployment Check (Requires API Token)

Get detailed deployment information including build logs and errors:

```bash
# Using npm script
RAILWAY_TOKEN=your_token npm run check:deployment

# Or directly
RAILWAY_TOKEN=your_token npx tsx scripts/check-railway-deployment.ts
```

**Getting Your Railway API Token:**
1. Go to https://railway.app/account/tokens
2. Create a new token
3. Copy the token and use it as `RAILWAY_TOKEN`

**Optional Environment Variables:**
- `RAILWAY_PROJECT_ID` - Your Railway project ID (auto-detected if not set)
- `RAILWAY_SERVICE_ID` - Your Railway service ID (auto-detected if not set)

## What Each Script Does

### `check-deployment-simple.ts`
- ✅ Checks if your deployed site is accessible
- ✅ Shows HTTP status code
- ✅ No API token required
- ✅ Quick and easy to use

### `check-railway-deployment.ts`
- ✅ Shows recent deployments (last 5)
- ✅ Shows deployment status (success/failed/building)
- ✅ Shows build logs for failed deployments
- ✅ Shows deployment timestamps
- ⚠️ Requires Railway API token

## Troubleshooting

### "RAILWAY_TOKEN environment variable is not set"
- Get your token from https://railway.app/account/tokens
- Set it as: `export RAILWAY_TOKEN=your_token_here` (Linux/Mac)
- Or: `$env:RAILWAY_TOKEN="your_token_here"` (PowerShell)

### "No projects found"
- Make sure your Railway API token has the correct permissions
- Check that you're logged into the correct Railway account

### "Deployment is not accessible"
- Check if your Railway service is running
- Verify the URL is correct
- Check Railway dashboard for service status

## Examples

### Check if deployment is live:
```bash
npm run check:deployment:simple https://myapp.railway.app
```

### Check detailed deployment status:
```bash
RAILWAY_TOKEN=token_here npm run check:deployment
```

### Check specific deployment URL:
```bash
DEPLOYMENT_URL=https://myapp.railway.app npm run check:deployment:simple
```


