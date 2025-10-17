/**
 * Navigation-related constants
 */
const NAVIGATION_CONSTANTS = {
  WAIT_UNTIL: 'domcontentloaded',
  TIMEOUT: 30000,        // Reduced from 60s to 30s
  SELECTOR_TIMEOUT: 15000, // Reduced from 30s to 15s
  SCROLL_WAIT: 1000,     // Reduced from 2s to 1s
};

/**
 * Extraction-related constants
 */
const EXTRACTION_CONSTANTS = {
  APPLIED_MATERIALS_LIMIT: 10,
};

/**
 * Pagination-related constants
 */
const PAGINATION_CONSTANTS = {
  DEFAULT_MAX_PAGES: 3,    // Reduced from 4 to 3 pages
  SCROLL_DELAY: 500,       // Reduced from 1s to 0.5s
  CLICK_DELAY: 1000,       // Reduced from 2s to 1s
};

/**
 * Pagination types
 */
const PAGINATION_TYPES = {
  CHEVRON_CLICK: 'chevron-click',
  URL_PAGE: 'url-page',
  INFINITE_SCROLL: 'infinite-scroll',
  SHOW_MORE_BUTTON: 'show-more-button',
};

/**
 * Company names with special handling requirements
 */
const SPECIAL_COMPANIES = {
  APPLIED_MATERIALS: 'Applied Materials',
  HONEYWELL: 'Honeywell',
  JPMORGAN_CHASE: 'JPMorgan Chase',
  TEXAS_INSTRUMENTS: 'Texas Instruments',
  TEN_X_GENOMICS: '10x Genomics',
};

/**
 * Default job data structure
 */
const JOB_DEFAULTS = {
  POSTED_DATE: 'Recently',
  EMPTY_STRING: '',
};

module.exports = {
  NAVIGATION_CONSTANTS,
  EXTRACTION_CONSTANTS,
  PAGINATION_CONSTANTS,
  PAGINATION_TYPES,
  SPECIAL_COMPANIES,
  JOB_DEFAULTS,
};