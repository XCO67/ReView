# Kuwait Re - Analytics Dashboard

A comprehensive business intelligence dashboard for Kuwait Reinsurance Company built with Next.js 15, TypeScript, and PostgreSQL.

## Prerequisites

- **Node.js** 18+ (you have v22.16.0 ✓)
- **npm** (you have 11.4.2 ✓)
- **PostgreSQL** database (local or cloud)

## Quick Start

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   copy .env.example .env
   ```
   (On Linux/Mac: `cp .env.example .env`)

2. Edit `.env` and configure:
   - **Database connection**: Set `DATABASE_URL` or individual `DB_*` variables
   - **SESSION_SECRET**: Generate a secure random string (required for authentication)
   - **Admin credentials**: Optionally customize default admin user

### 3. Set Up PostgreSQL Database

#### Option A: Local PostgreSQL

1. Install PostgreSQL if not already installed
2. Create a database:
   ```sql
   CREATE DATABASE kuwaitre_db;
   ```
3. Update `.env` with your local database credentials

#### Option B: Railway PostgreSQL

1. Create a PostgreSQL database on Railway
2. Get the connection string from Railway → PostgreSQL service → Variables
3. Update `.env` with your Railway database connection string

### 4. Generate Session Secret

Generate a secure session secret:

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Linux/Mac:**
```bash
openssl rand -base64 32
```

Add the generated value to `.env` as `SESSION_SECRET`.

### 5. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 6. First Login

On first run, the application will automatically:
- Initialize the database tables
- Create default roles
- Set up a default admin user

**Default Admin Credentials:**
- Username: `mainadmin`
- Email: `admin@kuwaitre.com`
- Password: `KuwaitRe2024!Secure`

⚠️ **Important**: Change the default admin password after first login!

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Type check without building

## Project Structure

```
ReView/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/        # React components
│   ├── lib/              # Utilities and business logic
│   ├── contexts/         # React contexts
│   └── hooks/            # Custom React hooks
├── public/               # Static assets
└── scripts/              # Utility scripts
```

## Features

- 🔐 Role-based authentication and authorization
- 📊 Interactive analytics dashboards
- 🗺️ World map visualizations
- 📈 Multiple chart types (bar, scatter, quadrant, etc.)
- 🎨 Dark/light theme support
- 👥 User and role management
- 📝 Audit logging
- 🔒 Security features (rate limiting, session management)

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists
- For cloud databases, verify network access and SSL settings

### Session Secret Error

- Ensure `SESSION_SECRET` is set in `.env`
- Use a secure random string (at least 32 characters)

### Port Already in Use

If port 3000 is in use, Next.js will automatically try the next available port.

## Support

For issues or questions, please contact the development team.


