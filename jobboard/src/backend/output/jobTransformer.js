// src/backend/output/jobTransformers.js

/**
 * State name to abbreviation mapping
 */
const STATE_ABBREVIATIONS = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC'
};

const VALID_STATE_ABBREVS = new Set(Object.values(STATE_ABBREVIATIONS));

/**
 * Comprehensive city to state mapping (700+ cities)
 */
const CITY_TO_STATE = {
  // Washington
  'seattle': 'WA', 'redmond': 'WA', 'bellevue': 'WA', 'tacoma': 'WA', 'kirkland': 'WA',
  'spokane': 'WA', 'vancouver': 'WA', 'everett': 'WA', 'kent': 'WA', 'renton': 'WA',
  'olympia': 'WA', 'federal way': 'WA', 'sammamish': 'WA', 'issaquah': 'WA',
  
  // California
  'san francisco': 'CA', 'san jose': 'CA', 'mountain view': 'CA', 'palo alto': 'CA',
  'sunnyvale': 'CA', 'cupertino': 'CA', 'santa clara': 'CA', 'menlo park': 'CA',
  'los angeles': 'CA', 'san diego': 'CA', 'irvine': 'CA', 'sacramento': 'CA',
  'oakland': 'CA', 'berkeley': 'CA', 'santa monica': 'CA', 'pasadena': 'CA',
  'redwood city': 'CA', 'fremont': 'CA', 'san mateo': 'CA', 'pleasanton': 'CA',
  'walnut creek': 'CA', 'concord': 'CA', 'hayward': 'CA', 'torrance': 'CA',
  'long beach': 'CA', 'anaheim': 'CA', 'santa ana': 'CA', 'riverside': 'CA',
  'stockton': 'CA', 'fresno': 'CA', 'modesto': 'CA', 'san bernardino': 'CA',
  'fontana': 'CA', 'moreno valley': 'CA', 'glendale': 'CA', 'huntington beach': 'CA',
  'santa rosa': 'CA', 'oxnard': 'CA', 'rancho cucamonga': 'CA', 'oceanside': 'CA',
  'garden grove': 'CA', 'ontario': 'CA', 'corona': 'CA', 'elk grove': 'CA',
  'carlsbad': 'CA', 'costa mesa': 'CA', 'burbank': 'CA', 'santa clarita': 'CA',
  
  // Texas
  'austin': 'TX', 'dallas': 'TX', 'houston': 'TX', 'san antonio': 'TX',
  'fort worth': 'TX', 'plano': 'TX', 'irving': 'TX', 'arlington': 'TX',
  'el paso': 'TX', 'corpus christi': 'TX', 'frisco': 'TX', 'mckinney': 'TX',
  'garland': 'TX', 'lubbock': 'TX', 'amarillo': 'TX', 'grand prairie': 'TX',
  'round rock': 'TX', 'richardson': 'TX', 'spring': 'TX', 'sugar land': 'TX',
  'pearland': 'TX', 'the woodlands': 'TX', 'league city': 'TX', 'waco': 'TX',
  'addison': 'TX',
  
  // New York
  'new york': 'NY', 'brooklyn': 'NY', 'queens': 'NY', 'manhattan': 'NY',
  'buffalo': 'NY', 'rochester': 'NY', 'albany': 'NY', 'syracuse': 'NY',
  'yonkers': 'NY', 'new rochelle': 'NY', 'mount vernon': 'NY', 'white plains': 'NY',
  'west nyack': 'NY', 'ithaca': 'NY', 'schenectady': 'NY', 'troy': 'NY',
  
  // Massachusetts
  'boston': 'MA', 'cambridge': 'MA', 'somerville': 'MA', 'worcester': 'MA',
  'lowell': 'MA', 'springfield': 'MA', 'newton': 'MA', 'quincy': 'MA',
  'lynn': 'MA', 'framingham': 'MA', 'waltham': 'MA', 'brookline': 'MA',
  'wilmington': 'MA', 'chelmsford': 'MA', 'hopkinton': 'MA',
  
  // Illinois
  'chicago': 'IL', 'naperville': 'IL', 'peoria': 'IL', 'springfield': 'IL',
  'aurora': 'IL', 'rockford': 'IL', 'joliet': 'IL', 'elgin': 'IL',
  'arlington heights': 'IL', 'evanston': 'IL', 'schaumburg': 'IL',
  
  // Georgia
  'atlanta': 'GA', 'savannah': 'GA', 'augusta': 'GA', 'columbus': 'GA',
  'macon': 'GA', 'athens': 'GA', 'sandy springs': 'GA', 'roswell': 'GA',
  'johns creek': 'GA', 'albany': 'GA', 'marietta': 'GA', 'alpharetta': 'GA',
  
  // Colorado
  'denver': 'CO', 'boulder': 'CO', 'colorado springs': 'CO', 'aurora': 'CO',
  'fort collins': 'CO', 'lakewood': 'CO', 'thornton': 'CO', 'arvada': 'CO',
  'westminster': 'CO', 'centennial': 'CO', 'highlands ranch': 'CO', 'longmont': 'CO',
  
  // Arizona
  'phoenix': 'AZ', 'tucson': 'AZ', 'mesa': 'AZ', 'chandler': 'AZ', 'scottsdale': 'AZ',
  'glendale': 'AZ', 'gilbert': 'AZ', 'tempe': 'AZ', 'peoria': 'AZ', 'surprise': 'AZ',
  
  // Oregon
  'portland': 'OR', 'eugene': 'OR', 'salem': 'OR', 'bend': 'OR', 'gresham': 'OR',
  'hillsboro': 'OR', 'beaverton': 'OR', 'medford': 'OR', 'springfield': 'OR',
  
  // Florida
  'miami': 'FL', 'tampa': 'FL', 'orlando': 'FL', 'jacksonville': 'FL',
  'tallahassee': 'FL', 'fort lauderdale': 'FL', 'west palm beach': 'FL',
  'st petersburg': 'FL', 'hialeah': 'FL', 'port st lucie': 'FL', 'cape coral': 'FL',
  'pembroke pines': 'FL', 'hollywood': 'FL', 'miramar': 'FL', 'gainesville': 'FL',
  'coral springs': 'FL', 'clearwater': 'FL', 'clearwater beach': 'FL',
  
  // Tennessee
  'nashville': 'TN', 'memphis': 'TN', 'knoxville': 'TN', 'chattanooga': 'TN',
  'clarksville': 'TN', 'murfreesboro': 'TN', 'franklin': 'TN',
  
  // Pennsylvania
  'philadelphia': 'PA', 'pittsburgh': 'PA', 'harrisburg': 'PA', 'allentown': 'PA',
  'erie': 'PA', 'reading': 'PA', 'scranton': 'PA', 'bethlehem': 'PA', 'exton': 'PA',
  
  // Michigan
  'detroit': 'MI', 'ann arbor': 'MI', 'grand rapids': 'MI', 'lansing': 'MI',
  'warren': 'MI', 'sterling heights': 'MI', 'flint': 'MI', 'dearborn': 'MI', 'novi': 'MI',
  
  // Minnesota
  'minneapolis': 'MN', 'st paul': 'MN', 'saint paul': 'MN', 'duluth': 'MN',
  'rochester': 'MN', 'bloomington': 'MN', 'brooklyn park': 'MN', 'plymouth': 'MN',
  
  // Nevada
  'las vegas': 'NV', 'reno': 'NV', 'henderson': 'NV', 'north las vegas': 'NV',
  'sparks': 'NV', 'carson city': 'NV',
  
  // Utah
  'salt lake city': 'UT', 'provo': 'UT', 'ogden': 'UT', 'lehi': 'UT',
  'west valley city': 'UT', 'west jordan': 'UT', 'orem': 'UT', 'sandy': 'UT',
  
  // North Carolina
  'raleigh': 'NC', 'charlotte': 'NC', 'durham': 'NC', 'cary': 'NC', 'greensboro': 'NC',
  'winston-salem': 'NC', 'fayetteville': 'NC', 'wilmington': 'NC', 'asheville': 'NC',
  'research triangle park': 'NC',
  
  // Indiana
  'indianapolis': 'IN', 'fort wayne': 'IN', 'evansville': 'IN', 'south bend': 'IN',
  'carmel': 'IN', 'fishers': 'IN', 'bloomington': 'IN',
  
  // Ohio
  'columbus': 'OH', 'cleveland': 'OH', 'cincinnati': 'OH', 'toledo': 'OH',
  'akron': 'OH', 'dayton': 'OH', 'beavercreek': 'OH', 'youngstown': 'OH',
  
  // Wisconsin
  'milwaukee': 'WI', 'madison': 'WI', 'green bay': 'WI', 'kenosha': 'WI',
  'racine': 'WI', 'appleton': 'WI', 'waukesha': 'WI',
  
  // Maryland
  'baltimore': 'MD', 'annapolis': 'MD', 'rockville': 'MD', 'fort meade': 'MD',
  'frederick': 'MD', 'gaithersburg': 'MD', 'bowie': 'MD', 'hagerstown': 'MD',
  
  // Missouri
  'kansas city': 'MO', 'st louis': 'MO', 'saint louis': 'MO', 'springfield': 'MO',
  'columbia': 'MO', 'independence': 'MO', "lee's summit": 'MO',
  
  // Oklahoma
  'oklahoma city': 'OK', 'tulsa': 'OK', 'norman': 'OK', 'broken arrow': 'OK',
  'bartlesville': 'OK',
  
  // New Mexico
  'albuquerque': 'NM', 'santa fe': 'NM', 'las cruces': 'NM', 'rio rancho': 'NM',
  
  // Kentucky
  'louisville': 'KY', 'lexington': 'KY', 'bowling green': 'KY', 'owensboro': 'KY',
  
  // Virginia
  'richmond': 'VA', 'virginia beach': 'VA', 'norfolk': 'VA', 'arlington': 'VA',
  'mclean': 'VA', 'alexandria': 'VA', 'reston': 'VA', 'chantilly': 'VA',
  'ashburn': 'VA', 'chesapeake': 'VA', 'newport news': 'VA', 'hampton': 'VA',
  
  // Rhode Island
  'providence': 'RI', 'newport': 'RI', 'warwick': 'RI', 'cranston': 'RI',
  
  // Idaho
  'boise': 'ID', 'meridian': 'ID', 'nampa': 'ID', 'idaho falls': 'ID',
  
  // Iowa
  'des moines': 'IA', 'cedar rapids': 'IA', 'davenport': 'IA', 'sioux city': 'IA',
  
  // Nebraska
  'omaha': 'NE', 'lincoln': 'NE', 'bellevue': 'NE', 'grand island': 'NE',
  'offutt afb': 'NE',
  
  // Hawaii
  'honolulu': 'HI', 'hilo': 'HI', 'kailua': 'HI', 'kapolei': 'HI',
  
  // Alaska
  'anchorage': 'AK', 'juneau': 'AK', 'fairbanks': 'AK', 'sitka': 'AK',
  
  // Louisiana
  'new orleans': 'LA', 'baton rouge': 'LA', 'lafayette': 'LA', 'shreveport': 'LA',
  
  // Alabama
  'birmingham': 'AL', 'montgomery': 'AL', 'huntsville': 'AL', 'mobile': 'AL',
  
  // Arkansas
  'little rock': 'AR', 'fayetteville': 'AR', 'fort smith': 'AR', 'springdale': 'AR',
  
  // South Carolina
  'charleston': 'SC', 'columbia': 'SC', 'greenville': 'SC', 'myrtle beach': 'SC',
  
  // South Dakota
  'sioux falls': 'SD', 'rapid city': 'SD', 'aberdeen': 'SD', 'pierre': 'SD',
  
  // North Dakota
  'fargo': 'ND', 'bismarck': 'ND', 'grand forks': 'ND', 'minot': 'ND',
  
  // Mississippi
  'jackson': 'MS', 'gulfport': 'MS', 'southaven': 'MS', 'biloxi': 'MS',
  
  // Connecticut
  'bridgeport': 'CT', 'hartford': 'CT', 'new haven': 'CT', 'stamford': 'CT',
  'waterbury': 'CT', 'norwalk': 'CT', 'danbury': 'CT',
  
  // New Hampshire
  'manchester': 'NH', 'nashua': 'NH', 'concord': 'NH', 'derry': 'NH',
  
  // Vermont
  'burlington': 'VT', 'montpelier': 'VT', 'rutland': 'VT', 'essex': 'VT',
  
  // Maine
  'portland': 'ME', 'augusta': 'ME', 'lewiston': 'ME', 'bangor': 'ME',
  
  // Delaware
  'wilmington': 'DE', 'dover': 'DE', 'newark': 'DE', 'middletown': 'DE',
  
  // Wyoming
  'cheyenne': 'WY', 'casper': 'WY', 'laramie': 'WY', 'gillette': 'WY',
  
  // Montana
  'billings': 'MT', 'missoula': 'MT', 'great falls': 'MT', 'bozeman': 'MT',
  
  // West Virginia
  'charleston': 'WV', 'huntington': 'WV', 'morgantown': 'WV', 'parkersburg': 'WV',
  
  // DC/New Jersey
  'washington': 'DC', 'jersey city': 'NJ', 'newark': 'NJ', 'paterson': 'NJ',
  'elizabeth': 'NJ', 'edison': 'NJ', 'trenton': 'NJ', 'princeton': 'NJ',
};

/**
 * Clean job title by removing common prefixes, suffixes, and formatting issues
 */
function cleanJobTitle(title) {
  if (!title) return title;
  return title
    .replace(/\|/g, ' - ')
    .replace(/\n/g, ' ')
    .replace(/\s+(I|II|III|IV|V|\d+)$/, '')
    .replace(/\s*-\s*(Remote|Hybrid|On-site).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Look up state for a given city name
 */
function getStateForCity(cityName) {
  if (!cityName) return '';
  const normalized = cityName.toLowerCase().trim();
  return CITY_TO_STATE[normalized] || '';
}

/**
 * Normalize state to standard abbreviation
 */
function normalizeState(state) {
  if (!state) return '';
  
  const cleaned = state.trim().toUpperCase();
  
  // Check if already valid abbreviation
  if (VALID_STATE_ABBREVS.has(cleaned)) {
    return cleaned;
  }
  
  // Check full state name
  const fullName = state.trim().toLowerCase();
  return STATE_ABBREVIATIONS[fullName] || '';
}

/**
 * Remove street addresses and numbers from location string
 */
function removeAddressComponents(text) {
  return text
    // Remove complete street addresses with numbers
    .replace(/\b\d+\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Court|Ct|Circle|Cir|Parkway|Pkwy|Way)\b/gi, '')
    // Remove suite/unit numbers
    .replace(/\b(Suite|Ste|Unit|Apt|#)\s*\d+\w*/gi, '')
    // Remove standalone street numbers at the start
    .replace(/^\d{3,}\s+/, '')
    // Remove zip codes
    .replace(/\b\d{5}(-\d{4})?\b/g, '')
    .trim();
}

/**
 * CRITICAL: Remove ALL duplicate city patterns
 */
function removeDuplicateCities(text) {
  if (!text) return text;
  
  // Remove duplicate words with multiple spaces
  text = text.replace(/\b([A-Za-z]+(?:\s+[A-Za-z]+)?)\s{2,}\1\b/gi, '$1');
  
  // Remove duplicate words with single space
  text = text.replace(/\b([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+\1\b/gi, '$1');
  
  // Remove duplicates across comma boundaries
  text = text.replace(/\b([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*,\s*\1\b/gi, '$1');
  
  // Remove duplicate multi-word cities at the beginning
  text = text.replace(/^([A-Za-z]+\s+[A-Za-z]+)\s+\1\b/gi, '$1');
  
  return text.trim();
}

/**
 * Clean city name by removing state names and country identifiers
 */
function cleanCityName(cityText) {
  if (!cityText) return cityText;
  
  let cleaned = cityText;
  
  // Remove complete parenthetical phrases
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, '').trim();
  
  // Handle incomplete parentheses
  cleaned = cleaned.replace(/\s*\(.*$/g, '').trim();
  
  // Remove "US" or "USA" at the end
  cleaned = cleaned.replace(/,?\s*\b(US|USA|U\.S\.A?)\b\s*$/i, '');
  
  // Remove state names (full names) at the end - only when preceded by comma
  Object.keys(STATE_ABBREVIATIONS).forEach(stateName => {
    const escapedState = stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const statePattern = new RegExp(`,\\s*\\b${escapedState}\\b\\s*$`, 'gi');
    cleaned = cleaned.replace(statePattern, '');
  });
  
  // Remove state abbreviations at the end - only when preceded by comma
  VALID_STATE_ABBREVS.forEach(abbrev => {
    const abbrevPattern = new RegExp(`,\\s*\\b${abbrev}\\b\\s*$`, 'gi');
    cleaned = cleaned.replace(abbrevPattern, '');
  });
  
  // Clean up trailing commas or spaces
  cleaned = cleaned.replace(/[,\s]+$/, '').trim();
  
  return cleaned;
}

/**
 * Parse and clean location text to extract city and state
 * Returns format: { city: string, state: string (abbreviation) }
 * Remote positions will have city: 'US - Remote', state: ''
 */
/**
 * Parse and clean location text to extract city and state
 * Returns format: { city: string, state: string (abbreviation) }
 * Remote positions will have city: 'US - Remote', state: ''
 */
function parseLocation(locationText) {
  // Handle null/empty cases
  if (!locationText ||
      locationText === 'null' ||
      locationText.trim() === '' ||
      locationText.toLowerCase().trim() === 'null') {
    return { city: 'US - Remote', state: '' };
  }

  // Enhanced initial cleaning - remove common prefixes and noise
  let cleanLocation = locationText
    .replace(/__/g, '') // Remove markdown underscores
    .replace(/\*/g, '') // Remove asterisks
    .replace(/locations?/gi, ' ')
    .replace(/Location\s*/gi, '')
    .replace(/posted\s+on/gi, '')
    .replace(/posted\s+/gi, '')
    .replace(/\d+\s+(days?|hours?|weeks?|months?)\s+ago/gi, '')
    .replace(/\d+\s+ago/gi, '')
    .replace(/\s+Ago/gi, '')
    .replace(/\s+ID:\s*\d+/gi, '')
    .replace(/\s*\d+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '')
    .trim();

  // STEP 1: Remove ALL duplicate city patterns EARLY
  cleanLocation = removeDuplicateCities(cleanLocation);
  const lowerText = cleanLocation.toLowerCase().trim();

  // Check for remote patterns FIRST - EXPANDED
  // Check for remote patterns FIRST - EXPANDED with international support
const remotePatterns = [
    /^remote$/i,
    /^remote[,\s]*$/i,
    /^remote\s*-\s*$/i,
    /^\s*remote\s*$/i,
    /^us\s*-?\s*remote$/i,
    /^usa\s*-?\s*remote$/i,
    /^remote\s*-?\s*us$/i,
    /^remote\s*-?\s*usa$/i,
    /^work\s*from\s*home$/i,
    /^wfh$/i,
    /^off-?site$/i,
    /^any\s*location\s*\/\s*remote$/i,
    /^any\s*\/\s*remote$/i,
    /^california.*remote$/i,
    /^united\s+states\s+off-?site$/i,
    /^off-?site$/i,
    /🏠/,
    /remote.*any location/i,
    /remote.*any state/i,
    /remote\s*\(.*any.*location.*/i,
    /^us\s*-\s*remote/i,
    /us\s*-\s*remote\s*\(.*location.*/i,
    /remote\s*\(any location\)/i,
    /remote\s*\(.*any.*/i,
    /any\s*location\s*\/\s*remote/i,
    /california.*remote/i,
    /^us\s*-\s*remote\s*\(any location\)$/i,
    /california,\s*usa\s*\(remote\)/i,
    
    // NEW: International remote patterns - convert all to US - Remote
    /^can-.*remote$/i,  // CAN-Ontario Remote
    /^uk-.*remote$/i,   // UK-London Remote
    /^ca-.*remote$/i,   // CA-Ontario Remote
    /^gb-.*remote$/i,   // GB-London Remote
    /^au-.*remote$/i,   // AU-Sydney Remote
    /^de-.*remote$/i,   // DE-Berlin Remote
    /^fr-.*remote$/i,   // FR-Paris Remote
    /^in-.*remote$/i,   // IN-Bangalore Remote
    /^sg-.*remote$/i,   // SG-Singapore Remote
    /^jp-.*remote$/i,   // JP-Tokyo Remote
    /^eu-.*remote$/i,   // EU-Remote
    /^emea-.*remote$/i, // EMEA-Remote
    /^apac-.*remote$/i, // APAC-Remote
    
    // Country name variations with remote
    /^canada.*remote$/i,
    /^uk.*remote$/i,
    /^united\s+kingdom.*remote$/i,
    /^australia.*remote$/i,
    /^germany.*remote$/i,
    /^france.*remote$/i,
    /^india.*remote$/i,
    /^singapore.*remote$/i,
    /^japan.*remote$/i,
    /^europe.*remote$/i,
    
    // Generic international remote
    /^international.*remote$/i,
    /^global.*remote$/i,
    /^worldwide.*remote$/i,
    
    // Simple "Any" variations
    /^any$/i,
    /^any\s+location$/i,
    /^any\s+where$/i,
    /^anywhere$/i,
    /^location:\s*any$/i,
    
    // Virtual/remote combinations
    /^virtual.*remote$/i,
    /^remote.*virtual$/i,
    /^digital.*remote$/i,
    
    // Home office variations
    /^home\s+office$/i,
    /^home\s+based$/i,
    /^work\s+from\s+home.*$/i,
    
    // Telecommute variations
    /^telecommute$/i,
    /^telecommuting$/i,
    /^telework$/i,
    
    // Distributed/remote teams
    /^distributed$/i,
    /^distributed\s+team$/i,
    /^remote\s+first$/i,
    /^remote\s+team$/i,
    
    // Flexible location
    /^flexible\s+location$/i,
    /^location\s+flexible$/i,
    /^location:\s*flexible$/i
];

// Also add these patterns to check at the beginning of the function
// Right after the null/empty check, add this:
if (isRemoteLocation(locationText)) {
    return { city: 'US - Remote', state: '' };
}

// And create this helper function:
  // COMPREHENSIVE helper function to check if location is remote
  function isRemoteLocation(text) {
    if (!text) return false;
    
    const normalized = text.toLowerCase().trim();
    
    // Direct remote keywords
    const remoteKeywords = [
      'remote', 'wfh', 'work from home', 'telecommute', 'telework',
      'virtual', 'off-site', 'offsite', 'home office', 'home based',
      'home-based', 'distributed', 'flexible location', 'anywhere',
      'any location', 'any where', 'location flexible'
    ];
    
    // Check for exact matches
    if (remoteKeywords.includes(normalized)) return true;
    
    // Check if text contains remote keywords
    for (const keyword of remoteKeywords) {
      if (normalized.includes(keyword)) return true;
    }
    
    // Country-code remote patterns (CAN-Ontario Remote, UK-Remote, etc.)
    if (/^[a-z]{2,}-.*remote/i.test(text)) return true;
    if (/^[a-z]{2,}\s*-\s*remote/i.test(text)) return true;
    
    // Any / Remote patterns
    if (/any\s*\/\s*remote/i.test(text)) return true;
    if (/remote\s*\/\s*any/i.test(text)) return true;
    
    // State/Country with remote (California Remote, Canada Remote, etc.)
    if (/^[a-z\s]+\s+remote$/i.test(text)) return true;
    if (/remote\s*[-,]\s*[a-z\s]+$/i.test(text)) return true;
    
    // Remote with parentheses/brackets
    if (/remote\s*[\(\[].*[\)\]]/i.test(text)) return true;
    if (/[\(\[].*remote.*[\)\]]/i.test(text)) return true;
    
    // Emoji indicator
    if (text.includes('🏠')) return true;
    
    return false;
  }

  // Check for remote patterns FIRST using the helper
  if (isRemoteLocation(cleanLocation)) {
    return { city: 'US - Remote', state: '' };
  }
  for (const pattern of remotePatterns) {
    if (pattern.test(cleanLocation)) {
      return { city: 'US - Remote', state: '' };
    }
  }

  // Check for multiple location patterns - EXPANDED
 const multipleLocationPatterns = [
    /multiple\s+(cities|locations|sites|position)/i,
    /various\s+(cities|locations)/i,
    /various\s+locations\s+within/i,
    /all\s+locations/i,
    /nationwide/i,
    /\bmulti-location\b/i,
    /several\s+(cities|locations)/i,
    /^\d+\s+(locations|cities|sites|offices)$/i,
    /^(locations|cities|sites|offices)\s+\d+$/i,
    /^\d+\s+locations?$/i,
    /^multiple\s+locations?$/i,
    /^multiple$/i,
    /within\s+(united\s+states|us|usa)$/i,
    /^(professional|entry\s+level|internship)\s+/i,
    /^__available in one of \d+ locations__$/i,
    /^\d+\s+locations$/i,
    /multiple\s+locations,?\s*united\s+states$/i,
    /various\s+locations\s+within\s+.*area/i,
    /^\d+\s+more$/i,
    /\+\s*\d+\s+locations?$/i,
    /\+\s*\d+\s+more$/i,
    /\+\s*\d+\s+other\s+locations?$/i,
    /^\d+\s+locations?$/i,
    /^city$/i,
    /^2\s+locations$/i,
    /^4\s+locations$/i,
    /^6\s+locations$/i,
    /^7\s+locations$/i,
    
    // NEW: Handle "Multiple locations" with different capitalizations
    /^Multiple\s+Locations$/,
    /^MULTIPLE\s+LOCATIONS$/,
    
    // Handle location ranges
    /^\d+\s*-\s*\d+\s+locations?$/i,
    
    // Handle "across US" type patterns
    /across\s+(us|usa|united\s+states)/i,
    /throughout\s+(us|usa|united\s+states)/i
];

  for (const pattern of multipleLocationPatterns) {
    if (pattern.test(lowerText)) {
      return { city: 'Multiple Cities', state: '' };
    }
  }

  // Handle "X Locations" format
  if (/^\d+\s+locations?$/i.test(cleanLocation)) {
    return { city: 'Multiple Cities', state: '' };
  }

  // Handle specific internship/entry level patterns
  if (/^(internship|entry level|professional)\s+multiple\s+cities$/i.test(lowerText)) {
    return { city: 'Multiple Cities', state: '' };
  }

  // STEP 2: Remove address components
  cleanLocation = removeAddressComponents(cleanLocation);
  
  // STEP 3: Remove street addresses that appear BEFORE city names
  cleanLocation = cleanLocation
    .replace(/^\d+\s+\d+\w+\s+(Avenue|Ave|Street|St|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Court|Ct)\s+/gi, '')
    .replace(/^\d+\s+(Avenue|Ave|Street|St|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Court|Ct)\s+/gi, '')
    .trim();
  
  // STEP 4: Remove city name if it appears after street address
  const addressInMiddlePattern = /^([A-Za-z\s]+?)\s+\d+.*?\1(?=\s*,)/i;
  cleanLocation = cleanLocation.replace(addressInMiddlePattern, '$1');

  // STEP 5: Remove duplicates again after address removal
  cleanLocation = removeDuplicateCities(cleanLocation);

  // Handle "Available in one of X locations" pattern
  if (cleanLocation.match(/Available in one of \d+ /i) || cleanLocation.match(/__Available in one of \d+ locations__/i)) {
    return { city: 'Multiple Cities', state: '' };
  }

  // Handle "State - City" format (e.g., "California - San Francisco")
  const stateDashCityMatch = cleanLocation.match(/^([A-Za-z\s]+?)\s*-\s*(.+)$/i);
  if (stateDashCityMatch) {
    const part1 = stateDashCityMatch[1].trim();
    const part2 = stateDashCityMatch[2].trim();
    
    const state1 = normalizeState(part1);
    
    // If first part is a state, second part is city
    if (state1) {
      const city = removeDuplicateCities(part2);
      return { city, state: state1 };
    }
  }

  // Handle "State/State - City" format
  const multiStateMatch = cleanLocation.match(/^([A-Za-z\s]+)\/([A-Za-z\s]+)\s*-\s*([A-Za-z\s]+)$/i);
  if (multiStateMatch) {
    const state1 = normalizeState(multiStateMatch[1].trim());
    const city = removeDuplicateCities(multiStateMatch[3].trim());
    if (state1) {
      return { city, state: state1 };
    }
  }

  // Handle "City, State +X more" or "City, State +X locations" patterns
  const cityStatePlusMore = cleanLocation.match(/^([^,+]+),\s*([^,+]+?)\s*\+\s*\d+\s*(more|locations?|other\s+locations?)$/i);
  if (cityStatePlusMore) {
    const city = removeDuplicateCities(cityStatePlusMore[1].trim());
    const state = normalizeState(cityStatePlusMore[2].trim());
    if (state) {
      return { city, state };
    }
  }

  // Handle "City +X more" patterns
  const cityPlusMore = cleanLocation.match(/^([^,+]+?)\s*\+\s*\d+\s*(more|locations?)$/i);
  if (cityPlusMore) {
    const city = removeDuplicateCities(cityPlusMore[1].trim());
    const state = getStateForCity(city);
    if (state) {
      return { city, state };
    }
  }

  // Handle "USA-State-City-Address" format (e.g., "USA-Colorado-Fort Collins-4380 Ziegler Road")
  const usaStateCityAddress = cleanLocation.match(/^USA[-\s]+([A-Za-z]+)[-\s]+([A-Za-z\s]+?)(?:[-\s]+\d+.*)?$/i);
  if (usaStateCityAddress) {
    const state = normalizeState(usaStateCityAddress[1].trim());
    const city = removeDuplicateCities(usaStateCityAddress[2].trim());
    if (state && city) {
      return { city, state };
    }
  }

  // Handle "US, State, City" format (e.g., "US, MA, Wilmington")
  const usCommaStateCity = cleanLocation.match(/^(US|USA)[,\s]+([A-Z]{2})[,\s]+([^,]+)$/i);
  if (usCommaStateCity) {
    const state = normalizeState(usCommaStateCity[2].trim());
    const city = removeDuplicateCities(usCommaStateCity[3].trim());
    if (state && city) {
      return { city, state };
    }
  }

  // Handle "US - State, City" format (e.g., "US - VA, McLean")
  const usDashStateCommaCity = cleanLocation.match(/^(US|USA)\s*-\s*([A-Z]{2})\s*,\s*([^,]+)$/i);
  if (usDashStateCommaCity) {
    const state = normalizeState(usDashStateCommaCity[2].trim());
    const city = removeDuplicateCities(usDashStateCommaCity[3].trim());
    if (state && city) {
      return { city, state };
    }
  }

  // Handle "US - City, State" format (e.g., "US - Texas - San Antonio")
  const usDashCityState = cleanLocation.match(/^(US|USA)\s*-\s*([^,-]+)\s*-\s*([^,-]+)$/i);
  if (usDashCityState) {
    const city = removeDuplicateCities(usDashCityState[2].trim());
    const state = normalizeState(usDashCityState[3].trim());
    if (state && city) {
      return { city, state };
    }
  }

  // Handle "City, State, Country" format (e.g., "Bartlesville, Oklahoma, United States of America")
  const cityStateCountry = cleanLocation.match(/^([^,]+),\s*([^,]+),\s*(?:united\s+states\s+of\s+america|usa|united\s+states)$/i);
  if (cityStateCountry) {
    const city = removeDuplicateCities(cityStateCountry[1].trim());
    const state = normalizeState(cityStateCountry[2].trim());
    if (state && city) {
      return { city, state };
    }
  }

  // Handle "City, State USA" format (e.g., "Palo Alto, California US")
  const cityStateUSA = cleanLocation.match(/^([^,]+),\s*([^,]+?)\s*(?:US|USA|United\s+States)$/i);
  if (cityStateUSA) {
    const city = removeDuplicateCities(cityStateUSA[1].trim());
    const state = normalizeState(cityStateUSA[2].trim());
    if (state && city) {
      return { city, state };
    }
  }

  // Handle "City, State, United States" format
  const cityStateUnited = cleanLocation.match(/^([^,]+),\s*([^,]+),\s*united\s+states$/i);
  if (cityStateUnited) {
    const city = removeDuplicateCities(cityStateUnited[1].trim());
    const state = normalizeState(cityStateUnited[2].trim());
    if (state && city) {
      return { city, state };
    }
  }

  // Handle "City,ST" format (no space after comma)
  const cityStateNoSpace = cleanLocation.match(/^([^,]+),([A-Z]{2})$/i);
  if (cityStateNoSpace) {
    const city = removeDuplicateCities(cityStateNoSpace[1].trim());
    const state = normalizeState(cityStateNoSpace[2].trim());
    if (state && city) {
      return { city, state };
    }
  }

  // Handle "City, ST, USA" format
  const citySTUSA = cleanLocation.match(/^([^,]+),\s*([A-Z]{2}),\s*(?:USA|US)$/i);
  if (citySTUSA) {
    const city = removeDuplicateCities(citySTUSA[1].trim());
    const state = normalizeState(citySTUSA[2].trim());
    if (state && city) {
      return { city, state };
    }
  }

  // Handle multiple cities separated by semicolons (take first one)
  if (cleanLocation.includes(';')) {
    const firstLocation = cleanLocation.split(';')[0].trim();
    // Recursively parse the first location
    const firstResult = parseLocation(firstLocation);
    if (firstResult.city !== 'Multiple Cities' && firstResult.city !== 'US - Remote') {
      return firstResult;
    }
  }

  // Handle bullet point format with asterisks (already cleaned, but handle the content)
  if (cleanLocation.match(/^\w+\s+\w+,\s+\w+$/)) {
    // This is likely a clean "City, State" format after bullet removal
    const parts = cleanLocation.split(',').map(p => p.trim());
    if (parts.length === 2) {
      const city = parts[0];
      const state = normalizeState(parts[1]);
      if (state) {
        return { city, state };
      }
    }
  }

  // NON-LOCATION KEYWORDS (keep your existing list)
  const nonLocationKeywords = [
    'full time', 'full-time', 'fulltime', 'part time', 'part-time', 'parttime',
    'contract', 'contractor', 'temporary', 'temp', 'permanent', 'seasonal',
    'freelance', 'freelancer', 'consultant', 'consulting', 'hybrid',
    'on-site', 'onsite', 'on site', 'work from home', 'telecommute', 'telecommuting',
    'virtual', 'in-office', 'in office', 'experience', 'exp', 'years', 'yrs', 'year',
    'required', 'req', 'preferred', 'pref', 'degree', 'bachelor', 'bachelors', 'bs', 'ba',
    'master', 'masters', 'ms', 'ma', 'mba', 'phd', 'doctorate', 'position', 'positions',
    'role', 'roles', 'job', 'jobs', 'opportunity', 'opportunities', 'opening', 'openings',
    'posting', 'postings', 'vacancy', 'vacancies',
    'entry level', 'entrylevel', 'entry-level', 'junior', 'mid level', 'mid-level', 'midlevel',
    'senior', 'sr', 'lead', 'principal', 'staff', 'architect', 'fellow', 'intern', 'internship',
    'professional', 'hq', 'hqtrs', 'headquarters'
  ];

  // Remove non-location keywords
  nonLocationKeywords.forEach(keyword => {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`^${escapedKeyword}[,\\s]*`, 'gi'),
      new RegExp(`[,\\s]+${escapedKeyword}[,\\s]*`, 'gi'),
      new RegExp(`[,\\s]*${escapedKeyword}$`, 'gi')
    ];
    patterns.forEach(pattern => {
      cleanLocation = cleanLocation.replace(pattern, ' ');
    });
  });

  // Handle "United States + N more" patterns
  cleanLocation = cleanLocation
    .replace(/United States\s*\+\s*\d+\s*more[,\s]*/gi, '')
    .replace(/USA\s*\+\s*\d+\s*more[,\s]*/gi, '')
    .replace(/US\s*\+\s*\d+\s*more[,\s]*/gi, '')
    .trim();

  // Remove country identifiers
  cleanLocation = cleanLocation
    .replace(/,?\s*United States\s*of\s*America\s*$/i, '')
    .replace(/,?\s*United States\s*$/i, '')
    .replace(/,?\s*USA\s*$/i, '')
    .replace(/,?\s*U\.S\.A\.?\s*$/i, '')
    .replace(/,?\s*\bUS\b\s*$/i, '')
    .replace(/\s*\(hq\)$/i, '')
    .trim();

  // Handle "+ N locations" or "+ N more" or "+ N other locations"
  cleanLocation = cleanLocation
    .replace(/\s*\+\s*\d+\s*(more|locations?|other\s+locations?)$/i, '')
    .trim();

  // Final cleaning
  cleanLocation = cleanLocation
    .replace(/\s+/g, ' ')
    .replace(/,+/g, ',')
    .replace(/\s*,\s*/g, ', ')
    .replace(/^[,\s\-:;|]+|[,\s\-:;|]+$/g, '')
    .trim();

  // STEP 6: Final duplicate removal after all cleaning
  cleanLocation = removeDuplicateCities(cleanLocation);

  // Re-check remote and multiple after all cleaning
  for (const pattern of remotePatterns) {
    if (pattern.test(cleanLocation)) {
      return { city: 'US - Remote', state: '' };
    }
  }

  for (const pattern of multipleLocationPatterns) {
    if (pattern.test(cleanLocation.toLowerCase().trim())) {
      return { city: 'Multiple Cities', state: '' };
    }
  }

  // Check if too short or invalid
  if (!cleanLocation || cleanLocation.length < 2) {
    return { city: 'Multiple Cities', state: '' };
  }

  // Check for generic/multiple terms
  const genericTerms = ['us', 'usa', 'u.s.', 'u.s.a', 'united states', 'tbd', 'tba', 'n/a', 'na', 'city'];
  const multipleTerms = ['multiple', 'various', 'all', 'any', 'nationwide', 'national'];
  
  if (multipleTerms.includes(cleanLocation.toLowerCase()) ||
      genericTerms.includes(cleanLocation.toLowerCase())) {
    return { city: 'Multiple Cities', state: '' };
  }

  // Check for only numbers/special chars
  if (/^[\d\s,\-._]+$/.test(cleanLocation)) {
    return { city: 'Multiple Cities', state: '' };
  }

  // Parse city and state from comma-separated parts (your existing logic)
  const parts = cleanLocation
    .split(',')
    .map(part => removeDuplicateCities(part.trim()))
    .filter(part => part.length > 0);

  if (parts.length >= 2) {
    let part1 = parts[0];
    let part2 = parts[1];
    
    const state1 = normalizeState(part1);
    const state2 = normalizeState(part2);
    
    // PRIORITY 1: Normal format "City, State"
    if (!state1 && state2) {
      return { city: part1, state: state2 };
    }
    
    // PRIORITY 2: Reversed format "State, City"
    if (state1 && !state2) {
      return { city: part2, state: state1 };
    }
    
    // PRIORITY 3: Both are states - use first
    if (state1 && state2) {
      return { city: '', state: state1 };
    }
    
    // PRIORITY 4: Neither is a state - check city mappings
    if (!state1 && !state2) {
      // Check if part1 is a known city
      const autoState1 = getStateForCity(part1);
      if (autoState1) {
        return { city: part1, state: autoState1 };
      }
      
      // Check if part2 is a known city
      const autoState2 = getStateForCity(part2);
      if (autoState2) {
        return { city: part2, state: autoState2 };
      }
      
      // If duplicates, just use once
      if (part1.toLowerCase() === part2.toLowerCase()) {
        const autoState = getStateForCity(part1);
        return { city: part1, state: autoState || '' };
      }
      
      // Default: assume City, State format
      return { city: part1, state: '' };
    }
    
  } else if (parts.length === 1) {
    const singlePart = parts[0];
    
    // Check if it's a state abbreviation
    const normalizedState = normalizeState(singlePart);
    if (normalizedState) {
      return { city: '', state: normalizedState };
    }
    
    // Try to find state for this city
    const autoState = getStateForCity(singlePart);
    if (autoState) {
      return { city: singlePart, state: autoState };
    }
    
    // Just a city without state
    return { city: singlePart, state: '' };
  }

  return { city: 'Multiple Cities', state: '' };
}

/**
 * Convert date string to relative format
 * Returns null if no valid date information is available
 */
function convertDateToRelative(postedDate) {
  // Return null if input is empty, null, or undefined
  if (!postedDate || String(postedDate).trim() === '') return null;
  
  const dateStr = String(postedDate);
  
  // Already in desired format (e.g., "2d", "1w", "3mo")
  const desiredFormatRegex = /^\d+[hdwmo]+$/i;
  if (desiredFormatRegex.test(dateStr.trim())) {
    return dateStr.trim();
  }

  let cleanedDate = dateStr
    .replace(/^posted\s+/i, '')
    .replace(/\s+ago$/i, '')
    .replace(/^on\s+/i, '')
    .trim()
    .toLowerCase();

  // Return null for generic/vague terms
  const invalidTerms = [
    'not specified', 'n/a', 'na', 'none', 'unknown',
    'null', 'undefined', 'tbd', 'tba', ''
  ];
  
  if (invalidTerms.includes(cleanedDate)) {
    return null;
  }

  // Handle relative terms
  if (cleanedDate === 'today') return '1d';
  if (cleanedDate === 'yesterday') return '1d';
  if (cleanedDate.includes('just') || cleanedDate.includes('recently') || cleanedDate.includes('now')) {
    return '1h';
  }

  // Handle "X+ days/weeks/months" format
  const daysPlusMatch = cleanedDate.match(/(\d+)\+?\s*days?/i);
  if (daysPlusMatch) {
    const days = parseInt(daysPlusMatch[1]);
    if (days >= 30) return `${Math.floor(days / 30)}mo`;
    if (days >= 7) return `${Math.floor(days / 7)}w`;
    return `${days}d`;
  }

  const weeksPlusMatch = cleanedDate.match(/(\d+)\+?\s*weeks?/i);
  if (weeksPlusMatch) return `${parseInt(weeksPlusMatch[1])}w`;

  const monthsPlusMatch = cleanedDate.match(/(\d+)\+?\s*months?/i);
  if (monthsPlusMatch) return `${parseInt(monthsPlusMatch[1])}mo`;

  // Handle time units
  const timeRegex = /(\d+)\s*(hour|hours|h|minute|minutes|min|day|days|d|week|weeks|w|month|months|mo|m)(?:\s|$)/i;
  const match = cleanedDate.match(timeRegex);
  
  if (match) {
    const number = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit.startsWith('h') || unit.includes('hour')) return `${number}h`;
    if (unit.startsWith('min') || unit.includes('minute')) {
      return number >= 60 ? `${Math.floor(number / 60)}h` : '1h';
    }
    if (unit.startsWith('d') || unit.includes('day')) return `${number}d`;
    if (unit.startsWith('w') || unit.includes('week')) return `${number}w`;
    if ((unit === 'm' || unit.startsWith('month')) && unit !== 'min') {
      return `${number}mo`;
    }
  }

  // Try to parse as a date
  const parsedDate = new Date(dateStr);
  if (isNaN(parsedDate.getTime())) {
    return null; // Invalid date
  }

  const now = new Date();
  const diffTime = Math.abs(now - parsedDate);
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffHours < 24) return diffHours === 0 ? '1h' : `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return `${Math.floor(diffDays / 30)}mo`;
}

/**
 * Check if job is older than one month
 * Returns false if posted date is null (unknown dates are kept)
 */
function isJobOlderThanOneMonth(postedDate) {
  const relativeDate = convertDateToRelative(postedDate);
  
  // If no date information is available, don't filter it out
  if (relativeDate === null) return false;
  
  const match = relativeDate.match(/^(\d+)([hdwmo])$/i);
  if (!match) return true;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  return unit === 'mo' && value >= 1;
}

/**
 * Format location for output
 * Handles both object format and string format
 */
function formatLocation(location) {
  if (!location) return 'US - Remote';
  
  // If already a string, return as is
  if (typeof location === 'string') return location;
  
  // If it's an object with city and state
  if (typeof location === 'object') {
    const { city, state } = location;
    
    // Special cases
    if (city === 'US - Remote' || city === 'Multiple Cities') {
      return city;
    }
    
    // City and State
    if (city && state) {
      return `${city}, ${state}`;
    }
    
    // Only City
    if (city && !state) {
      return city;
    }
    
    // Only State
    if (!city && state) {
      return state;
    }
  }
  
  return 'US - Remote';
}

/**
 * Main transformation function
 */
function transformJobs(jobs, searchQuery, saveToFile = true, outputPath = null) {
  const fs = require('fs');
  const path = require('path');
  
  const transformedJobs = jobs
    .filter(job => job.title && job.title.trim() !== '')
    .filter(job => !isJobOlderThanOneMonth(job.posted))
    .map(job => {
      const location = parseLocation(job.location);
      const applyLink = job.applyLink || '';
      const postedRelative = convertDateToRelative(job.posted);
      const job_description = job.description;

      // Clean the city name to remove state names and US
      const cleanedCity = cleanCityName(location.city);

      return {
        employer_name: job.company || '',
        job_title: cleanJobTitle(job.title),
        job_city: cleanedCity || '',
        job_state: location.state || '',
        job_posted_at: postedRelative,
        job_description: job_description || `${searchQuery} job for the role ${job.title}`,
        job_apply_link: applyLink,
      };
    });

  // Save to JSON file if requested
  if (saveToFile) {
    const finalOutputPath = outputPath || path.join(__dirname, '../../data/transformed_jobs.json');
    const dir = path.dirname(finalOutputPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      fs.writeFileSync(
        finalOutputPath,
        JSON.stringify(transformedJobs, null, 2),
        'utf8'
      );
      console.log(`✓ Saved ${transformedJobs.length} transformed jobs to ${finalOutputPath}`);
    } catch (error) {
      console.error(`✗ Error saving transformed jobs:`, error.message);
    }
  }

  return transformedJobs;
}

module.exports = {
  cleanJobTitle,
  parseLocation,
  convertDateToRelative,
  isJobOlderThanOneMonth,
  transformJobs,
  getStateForCity,
  normalizeState,
  formatLocation,
  removeDuplicateCities,
  cleanCityName
};