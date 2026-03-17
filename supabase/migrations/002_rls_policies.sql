-- ============================================================
-- TixHound: Row Level Security Policies
-- ============================================================

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tracked_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_limits           ENABLE ROW LEVEL SECURITY;

-- PROFILES: users see/edit only their own row
CREATE POLICY "profiles: own row select"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: own row update"
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- PUBLIC READ: events, venues, platforms, snapshots, tier_limits
CREATE POLICY "events: public read"
  ON public.events FOR SELECT USING (true);
CREATE POLICY "venues: public read"
  ON public.venues FOR SELECT USING (true);
CREATE POLICY "platforms: public read"
  ON public.platforms FOR SELECT USING (true);
CREATE POLICY "price_snapshots: public read"
  ON public.price_snapshots FOR SELECT USING (true);
CREATE POLICY "tier_limits: public read"
  ON public.tier_limits FOR SELECT USING (true);
CREATE POLICY "affiliate_links: public read"
  ON public.affiliate_links FOR SELECT USING (is_active = true);
CREATE POLICY "listings: public read current"
  ON public.ticket_listings FOR SELECT USING (is_current = true);

-- USER TRACKED EVENTS: own rows only
CREATE POLICY "tracked: own select"
  ON public.user_tracked_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tracked: own insert"
  ON public.user_tracked_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tracked: own delete"
  ON public.user_tracked_events FOR DELETE USING (auth.uid() = user_id);

-- PRICE ALERTS: own rows only
CREATE POLICY "alerts: own select"
  ON public.price_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "alerts: own insert"
  ON public.price_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alerts: own update"
  ON public.price_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "alerts: own delete"
  ON public.price_alerts FOR DELETE USING (auth.uid() = user_id);

-- ALERT NOTIFICATIONS: own rows only
CREATE POLICY "notifications: own select"
  ON public.alert_notifications FOR SELECT USING (auth.uid() = user_id);

-- AFFILIATE CLICKS: anyone can insert, users see own
CREATE POLICY "clicks: insert anon"
  ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "clicks: own select"
  ON public.affiliate_clicks FOR SELECT USING (auth.uid() = user_id);
