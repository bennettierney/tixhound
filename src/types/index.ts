export type Tier = 'free' | 'premium'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  tier: Tier
  notify_email: boolean
  notify_push: boolean
  created_at: string
  updated_at: string
}

export interface Venue {
  id: string
  name: string
  city: string | null
  state: string | null
  country: string
  capacity: number | null
  slug: string | null
}

export interface Platform {
  id: string
  name: string
  base_url: string
  logo_url: string | null
  scraper_enabled: boolean
  api_enabled: boolean
}

export interface Event {
  id: string
  external_id: string | null
  platform_id: string | null
  venue_id: string | null
  name: string
  slug: string | null
  description: string | null
  category: string | null
  artist_name: string | null
  event_date: string
  doors_open: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  venue?: Venue
  platform?: Platform
  min_price?: number | null
}

export interface TicketListing {
  id: string
  event_id: string
  platform_id: string
  section: string | null
  row: string | null
  quantity: number | null
  price_usd: number
  fees_usd: number | null
  total_usd: number
  listing_url: string | null
  scraped_at: string
  is_current: boolean
  platform?: Platform
}

export interface PriceSnapshot {
  id: string
  event_id: string
  platform_id: string
  snapshot_time: string
  min_price_usd: number
  max_price_usd: number | null
  avg_price_usd: number | null
  listing_count: number
  platform?: Platform
}

export interface UserTrackedEvent {
  id: string
  user_id: string
  event_id: string
  tracked_at: string
  event?: Event
}

export interface PriceAlert {
  id: string
  user_id: string
  event_id: string
  platform_id: string | null
  target_price: number
  section_filter: string | null
  condition: 'below' | 'above' | 'any_change'
  is_active: boolean
  last_triggered: string | null
  trigger_count: number
  created_at: string
  event?: Event
  platform?: Platform
}

export interface AffiliateLink {
  id: string
  event_id: string
  platform_id: string
  url: string
  affiliate_tag: string | null
  is_active: boolean
  platform?: Platform
}

export interface TierLimits {
  tier: Tier
  max_tracked_events: number
  max_alerts: number
  price_history_days: number
  alert_frequency_minutes: number
}
