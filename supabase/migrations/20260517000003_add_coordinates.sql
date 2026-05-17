    -- Add geocoordinates to practices for map display
    -- Run in Supabase Dashboard → SQL Editor after reset_and_migrate.sql

    ALTER TABLE practices
      ADD COLUMN IF NOT EXISTS latitude  double precision,
      ADD COLUMN IF NOT EXISTS longitude double precision;
