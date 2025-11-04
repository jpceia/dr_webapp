-- Create a cron job to update expired status daily
-- This requires the pg_cron extension to be installed
-- Run: CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the update to run daily at 1:00 AM
SELECT cron.schedule(
  'update-test-expired-daily',           -- Job name
  '0 1 * * *',                            -- Cron schedule: daily at 1:00 AM
  $$SELECT diario_republica.update_test_expired()$$
);

-- To check scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule the job (if needed):
-- SELECT cron.unschedule('update-test-expired-daily');
