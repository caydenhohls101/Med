-- ============================================================
-- MediBook SA — Prospect Pipeline
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE prospects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_id       text UNIQUE,                    -- OpenStreetMap element ID (null = manual)
  name         text NOT NULL,
  address      text,
  phone        text,
  website      text,                            -- null = no website = high priority
  latitude     double precision,
  longitude    double precision,
  city         text,
  province     text,
  status       text NOT NULL DEFAULT 'new'
               CHECK (status IN ('new','contacted','interested','setup','declined')),
  notes        text,
  added_by     uuid,                            -- platform admin user_id
  practice_id  uuid REFERENCES practices(id),  -- linked once they join MediBook
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_prospects_status   ON prospects(status);
CREATE INDEX idx_prospects_city     ON prospects(city);
CREATE INDEX idx_prospects_osm_id   ON prospects(osm_id) WHERE osm_id IS NOT NULL;
