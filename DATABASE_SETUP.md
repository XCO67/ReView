# Database Setup Guide

This guide explains how to set up and manage the PostgreSQL database for the Kuwait Reinsurance Dashboard.

## Prerequisites

- PostgreSQL 14+ installed and running
- Database user with appropriate permissions
- `.env` file configured with database connection

## Quick Start

### 1. Create Database

```sql
CREATE DATABASE kuwait_dashboard;
```

### 2. Update Schema

```bash
npm run schema:update
```

This creates all necessary tables, indexes, and default roles.

### 3. Import Data

```bash
npm run import:csv "path/to/Kuwait Re - Clean Data - 02.12.2025.csv"
```

## Database Structure

### Main Tables

- **`policies`** - Main policy/reinsurance data (47,071+ records)
- **`users`** - User accounts
- **`roles`** - User roles (admin, Super User, business roles)
- **`user_roles`** - User-role assignments
- **`audit_logs`** - Audit trail

### Verification Queries

See `scripts/sql/verify-data.sql` for verification queries you can run in pgAdmin4.

## Maintenance

### Update Schema

```bash
npm run schema:update
```

### Re-import Data

```bash
npm run import:csv "path/to/csv/file.csv"
```

**Note:** This will add new records. To replace all data, truncate the table first:

```sql
TRUNCATE TABLE policies RESTART IDENTITY CASCADE;
```

## pgAdmin4 Verification

1. Open pgAdmin4
2. Connect to your PostgreSQL server
3. Navigate to: `Servers` → `PostgreSQL 18` → `Databases` → `kuwait_dashboard` → `Schemas` → `public` → `Tables`
4. Right-click on `policies` → `View/Edit Data` → `All Rows`
5. Run queries from `scripts/sql/verify-data.sql` to verify data integrity

## Troubleshooting

### Connection Issues

- Verify PostgreSQL is running: `Get-Service -Name postgresql*`
- Check `.env` file has correct `DATABASE_URL`
- Test connection: `psql -U dashboard_admin -d kuwait_dashboard -c "SELECT 1;"`

### Data Issues

- Check record count: `SELECT COUNT(*) FROM policies;`
- Verify sample data: `SELECT * FROM policies LIMIT 10;`
- Check for null values in critical fields

