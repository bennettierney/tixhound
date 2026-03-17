-- ============================================================
-- TixHound: Initial Schema
-- ============================================================

-- PROFILES (extends auth.users 1:1)
CREATE TABLE public.profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT NOT NULL,
  full_name               TEXT,
  avatar_url              TEXT,
  tier                    TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  notify_email            BOOLEAN NOT NULL DEFAULT true,
  notify_push             BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- VENUES
CREATE TABLE public.venues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  city        TEXT,
  state       TEXT,
  country     TEXT NOT NULL DEFAULT 'US',
  capacity    INTEGER,
  slug        TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PLATFORMS
CREATE TABLE public.platforms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  base_url        TEXT NOT NULL,
  logo_url        TEXT,
  scraper_enabled BOOLEAN NOT NULL DEFAULT false,
  api_enabled     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVENTS
CREATE TABLE public.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id     TEXT,
  platform_id     UUID REFERENCES public.platforms(id),
  venue_id        UUID REFERENCES public.venues(id),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE,
  description     TEXT,
  category        TEXT,
  artist_name     TEXT,
  event_date      TIMESTAMPTZ NOT NULL,
  doors_open      TIMESTAMPTZ,
  image_url       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (external_id, platform_id)
);

CREATE INDEX idx_events_event_date ON public.events(event_date);
CREATE INDEX idx_events_category   ON public.events(category);
CREATE INDEX idx_events_artist     ON public.events(artist_name);

-- TICKET LISTINGS (raw price snapshots per scrape run)
CREATE TABLE public.ticket_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  platform_id     UUID NOT NULL REFERENCES public.platforms(id),
  section         TEXT,
  row             TEXT,
  quantity        INTEGER,
  price_usd       NUMERIC(10, 2) NOT NULL,
  face_value_usd  NUMERIC(10, 2),
  fees_usd        NUMERIC(10, 2),
  total_usd       NUMERIC(10, 2) GENERATED ALWAYS AS (price_usd + COALESCE(fees_usd, 0)) STORED,
  listing_url     TEXT,
  scraped_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current      BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_listings_event_platform ON public.ticket_listings(event_id, platform_id);
CREATE INDEX idx_listings_scraped_at     ON public.ticket_listings(scraped_at DESC);
CREATE INDEX idx_listings_is_current     ON public.ticket_listings(is_current) WHERE is_current = true;

-- PRICE SNAPSHOTS (aggregated per event/platform per run — used for charts)
CREATE TABLE public.price_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  platform_id     UUID NOT NULL REFERENCES public.platforms(id),
  snapshot_time   TIMESTAMPTZ NOT NULL DEFAULT now(),
  min_price_usd   NUMERIC(10, 2) NOT NULL,
  max_price_usd   NUMERIC(10, 2),
  avg_price_usd   NUMERIC(10, 2),
  listing_count   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (event_id, platform_id, snapshot_time)
);

CREATE INDEX idx_snapshots_event_time ON public.price_snapshots(event_id, snapshot_time DESC);

-- USER TRACKED EVENTS
CREATE TABLE public.user_tracked_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tracked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX idx_tracked_user  ON public.user_tracked_events(user_id);
CREATE INDEX idx_tracked_event ON public.user_tracked_events(event_id);

-- PRICE ALERTS
CREATE TABLE public.price_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  platform_id     UUID REFERENCES public.platforms(id),
  target_price    NUMERIC(10, 2) NOT NULL,
  section_filter  TEXT,
  condition       TEXT NOT NULL DEFAULT 'below' CHECK (condition IN ('below', 'above', 'any_change')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_triggered  TIMESTAMPTZ,
  trigger_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_user   ON public.price_alerts(user_id);
CREATE INDEX idx_alerts_event  ON public.price_alerts(event_id);
CREATE INDEX idx_alerts_active ON public.price_alerts(is_active) WHERE is_active = true;

-- ALERT NOTIFICATIONS LOG
CREATE TABLE public.alert_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id        UUID NOT NULL REFERENCES public.price_alerts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL CHECK (channel IN ('email', 'push', 'sms')),
  triggered_price NUMERIC(10, 2) NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed'))
);

-- AFFILIATE LINKS
CREATE TABLE public.affiliate_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  platform_id     UUID NOT NULL REFERENCES public.platforms(id),
  url             TEXT NOT NULL,
  affiliate_tag   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_event ON public.affiliate_links(event_id, platform_id);

-- AFFILIATE CLICKS
CREATE TABLE public.affiliate_clicks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id     UUID NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referrer    TEXT,
  user_agent  TEXT,
  ip_hash     TEXT,
  clicked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clicks_link ON public.affiliate_clicks(link_id);
CREATE INDEX idx_clicks_time ON public.affiliate_clicks(clicked_at DESC);

-- TIER LIMITS
CREATE TABLE public.tier_limits (
  tier                        TEXT PRIMARY KEY CHECK (tier IN ('free', 'premium')),
  max_tracked_events          INTEGER NOT NULL,
  max_alerts                  INTEGER NOT NULL,
  price_history_days          INTEGER NOT NULL,
  alert_frequency_minutes     INTEGER NOT NULL
);

INSERT INTO public.tier_limits VALUES
  ('free',    3,   2,  30,  1440),
  ('premium', 50, 25, 365,    60);

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enforce tier tracking limit
CREATE OR REPLACE FUNCTION check_tracked_event_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_allowed   INTEGER;
  user_tier     TEXT;
BEGIN
  SELECT tier INTO user_tier FROM public.profiles WHERE id = NEW.user_id;
  SELECT max_tracked_events INTO max_allowed FROM public.tier_limits WHERE tier = user_tier;
  SELECT COUNT(*) INTO current_count FROM public.user_tracked_events WHERE user_id = NEW.user_id;
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Tier limit reached: upgrade to premium to track more events';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_tracked_limit
  BEFORE INSERT ON public.user_tracked_events
  FOR EACH ROW EXECUTE FUNCTION check_tracked_event_limit();

-- ============================================================
-- SEED DATA: Platforms
-- ============================================================

INSERT INTO public.platforms (name, base_url, api_enabled) VALUES
  ('Ticketmaster', 'https://www.ticketmaster.com', true),
  ('StubHub',      'https://www.stubhub.com',      false),
  ('SeatGeek',     'https://seatgeek.com',         true),
  ('Vivid Seats',  'https://www.vividseats.com',   false),
  ('TickPick',     'https://www.tickpick.com',     false),
  ('Gametime',     'https://gametime.co',          false),
  ('AXS',          'https://www.axs.com',          false);
