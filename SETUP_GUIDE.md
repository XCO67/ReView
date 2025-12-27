# Setup Guide - Kuwait Re Dashboard

## ✅ Current Status

- ✅ Node.js v22.16.0 installed
- ✅ npm 11.4.2 installed
- ✅ Dependencies installed (node_modules exists)
- ✅ .env file exists
- ✅ Development server starting...

## Required Environment Variables

Your `.env` file should contain:

### 1. Database Configuration (REQUIRED)

**Option A - Full Connection String:**
```
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

**Option B - Individual Variables:**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kuwaitre_db
DB_USER=your_username
DB_PASSWORD=your_password
```

### 2. Session Secret (REQUIRED)

```
SESSION_SECRET=your-secure-random-string-here
```

**To generate a secure secret on Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 3. Optional Admin Configuration

```
DEFAULT_ADMIN_USERNAME=mainadmin
DEFAULT_ADMIN_EMAIL=admin@kuwaitre.com
DEFAULT_ADMIN_PASSWORD=KuwaitRe2024!Secure
```

## Running the Application

### Start Development Server

```bash
npm run dev
```

The server should start on `http://localhost:3000` (or next available port).

### First-Time Setup

1. **Ensure PostgreSQL is running** and accessible
2. **Verify your `.env` file** has all required variables
3. **Start the dev server** - it will automatically:
   - Initialize database tables
   - Create default roles
   - Set up admin user

### Default Login Credentials

- **Username:** `mainadmin`
- **Email:** `admin@kuwaitre.com`
- **Password:** `KuwaitRe2024!Secure`

⚠️ **Change this password immediately after first login!**

## Troubleshooting

### "DATABASE_URL or DB_* variables must be set"
- Check your `.env` file has database configuration
- Verify PostgreSQL is running
- Test connection: `psql -h localhost -U your_username -d your_database`

### "SESSION_SECRET is not set"
- Add `SESSION_SECRET` to your `.env` file
- Generate a secure random string (see above)

### Port Already in Use
- Next.js will automatically try the next available port
- Check the terminal output for the actual port number

### Database Connection Failed
- Verify PostgreSQL service is running
- Check database credentials
- For cloud databases, verify network access and SSL settings

## Available Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linter
npm run type-check   # Type check TypeScript
```

## Next Steps

1. ✅ Verify `.env` configuration
2. ✅ Ensure PostgreSQL is running
3. ✅ Start dev server: `npm run dev`
4. ✅ Open browser to `http://localhost:3000`
5. ✅ Login with default admin credentials
6. ✅ Change admin password
7. ✅ Explore the dashboard!

## Project Features

- 🔐 Role-based authentication
- 📊 Analytics dashboards
- 🗺️ World map visualizations
- 📈 Multiple chart types
- 🎨 Dark/light themes
- 👥 User management
- 📝 Audit logging


