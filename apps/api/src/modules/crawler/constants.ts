export const CRAWL_QUEUE = 'crawl';

export const CRAWL_JOB_TYPES = {
  FULL_STORE: 'full_store',     // crawl all active listings for a store
  TARGETED: 'targeted',         // crawl a specific set of listing IDs
  DISCOVERY: 'discovery',       // discover new products from category pages
} as const;

export type CrawlJobType = (typeof CRAWL_JOB_TYPES)[keyof typeof CRAWL_JOB_TYPES];

// Bull job options per job type
export const CRAWL_JOB_OPTIONS = {
  [CRAWL_JOB_TYPES.FULL_STORE]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 15_000 }, // 15s, 30s, 60s
    removeOnComplete: 50,
    removeOnFail: 100,
  },
  [CRAWL_JOB_TYPES.TARGETED]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
  [CRAWL_JOB_TYPES.DISCOVERY]: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 20,
    removeOnFail: 50,
  },
} as const;

// Categories supported for discovery
export const DISCOVERY_CATEGORIES = [
  'gpu',
  'cpu',
  'ram',
  'ssd',
  'motherboard',
  'psu',
  'cooler',
  'case',
] as const;
export type DiscoveryCategory = (typeof DISCOVERY_CATEGORIES)[number];

// Maximum consecutive failures before a listing is deactivated
export const MAX_LISTING_FAILURES = 5;

// Circuit breaker thresholds per store
export const CB_FAILURE_THRESHOLD = 10;   // failures in window to open
export const CB_SUCCESS_THRESHOLD = 3;    // successes in half-open to close
export const CB_WINDOW_SECONDS = 600;     // 10-minute rolling window
export const CB_OPEN_TIMEOUT_SECONDS = 300; // 5 min before trying half-open

export const REDIS_CB_PREFIX = 'cb:store:';
