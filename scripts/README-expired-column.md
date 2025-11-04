# Database Setup for Expired Column

This guide explains how to add and maintain the `expired` column in the `test` table.

## Step 1: Run the SQL Script

Connect to your PostgreSQL database and run the script:

Or copy the contents of `scripts/add-expired-column.sql` and execute in your database client.

This will:
- Add the `expired` boolean column to the `test` table
- Create a function `update_test_expired()` that updates all expired values
- Create indexes for better performance
- Run the function once to populate the column

## Step 2: Update Prisma Schema

The schema has already been updated to include the `expired` field. Generate the Prisma client:

```bash
npx prisma generate
```

## Step 3: Set Up Daily Updates (Optional but Recommended)

### Option A: Using pg_cron (Recommended for Production)

If your PostgreSQL server has the `pg_cron` extension:

1. Enable the extension:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2. Run the schedule script:
```bash
psql -h <your-host> -U <your-user> -d <your-database> -f scripts/schedule-expired-update.sql
```

This will update the expired status daily at 1:00 AM.

### Option B: Using a Cron Job or Task Scheduler

Create a cron job (Linux/Mac) or scheduled task (Windows) to run:

```bash
psql -h <your-host> -U <your-user> -d <your-database> -c "SELECT diario_republica.update_test_expired()"
```

Schedule this to run daily.

### Option C: Manual Updates

Run this command whenever you need to update the expired status:

```sql
SELECT diario_republica.update_test_expired();
```

## How It Works

The `expired` column has three possible values:

- `true`: The announcement has expired (application_deadline < NOW())
- `false`: The announcement is still active (application_deadline >= NOW())
- `null`: No application deadline set (N/A)

The function parses the `application_deadline` field which is stored as a string in format:
- DD-MM-YYYY HH:MM (e.g., "31-12-2025 23:59")
- Or standard ISO timestamp format

## Filtering Logic

The API now uses the `expired` column for filtering:

- **Default behavior** (includeExpired=false): Shows only active announcements (`expired = false`) and N/A announcements (`expired = null`)
- **Show expired** (includeExpired=true): Shows all announcements regardless of expired status

The frontend checkboxes:
- **"Mostrar Anúncios Expirados"**: When checked, shows ONLY expired announcements
- **"Mostrar Anúncios N/A"**: When checked, shows announcements with no deadline (expired = null)

## Verification

To check if the column was added successfully:

```sql
-- Check the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'diario_republica' 
  AND table_name = 'test' 
  AND column_name = 'expired';

-- Check the distribution of values
SELECT 
  expired,
  COUNT(*) as count
FROM diario_republica.test
GROUP BY expired;

-- Check scheduled jobs (if using pg_cron)
SELECT * FROM cron.job;
```

## Troubleshooting

**Problem**: Expired status not updating
- **Solution**: Run `SELECT diario_republica.update_test_expired();` manually

**Problem**: pg_cron extension not available
- **Solution**: Use Option B (external cron job) or Option C (manual updates)

**Problem**: Some dates not parsing correctly
- **Solution**: Check the format of `application_deadline` in affected records. The function handles DD-MM-YYYY HH:MM and ISO formats.
