-- Add expired column to the announcements table
ALTER TABLE diario_republica.announcements 
ADD COLUMN IF NOT EXISTS expired BOOLEAN;

-- Create a function to parse DD-MM-YYYY HH:MM format and check if expired
CREATE OR REPLACE FUNCTION diario_republica.update_announcements_expired()
RETURNS void AS $$
BEGIN
  -- Update expired status for all records
  UPDATE diario_republica.announcements
  SET expired = CASE
    -- If application_deadline is NULL or empty, set expired to NULL
    WHEN application_deadline IS NULL THEN NULL
    
    -- Compare timestamp with NOW()
    ELSE
      application_deadline < NOW()
  END;
END;
$$ LANGUAGE plpgsql;

-- Run the function once to populate the column
SELECT diario_republica.update_announcements_expired();

-- Create index on expired column for better query performance
CREATE INDEX IF NOT EXISTS idx_announcements_expired ON diario_republica.announcements(expired);

-- Create index on application_deadline for the scheduled updates
CREATE INDEX IF NOT EXISTS idx_announcements_application_deadline ON diario_republica.announcements(application_deadline);

COMMENT ON COLUMN diario_republica.announcements.expired IS 'Boolean indicating if the announcement has expired based on application_deadline. NULL if application_deadline is NULL or invalid.';
COMMENT ON FUNCTION diario_republica.update_announcements_expired() IS 'Updates the expired column for all records in the announcements table based on application_deadline vs current timestamp.';
