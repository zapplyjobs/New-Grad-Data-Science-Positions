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
  
  // New York
  'new york': 'NY', 'brooklyn': 'NY', 'queens': 'NY', 'manhattan': 'NY',
  'buffalo': 'NY', 'rochester': 'NY', 'albany': 'NY', 'syracuse': 'NY',
  'yonkers': 'NY', 'new rochelle': 'NY', 'mount vernon': 'NY', 'white plains': 'NY',
  'west nyack': 'NY', 'ithaca': 'NY', 'schenectady': 'NY', 'troy': 'NY',
  
  // Massachusetts
  'boston': 'MA', 'cambridge': 'MA', 'somerville': 'MA', 'worcester': 'MA',
  'lowell': 'MA', 'springfield': 'MA', 'newton': 'MA', 'quincy': 'MA',
  'lynn': 'MA', 'framingham': 'MA', 'waltham': 'MA', 'brookline': 'MA',
  'wilmington': 'MA',
  
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
  'westminster': 'CO', 'centennial': 'CO', 'highlands ranch': 'CO',
  
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
  'warren': 'MI', 'sterling heights': 'MI', 'flint': 'MI', 'dearborn': 'MI',
  
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
    .replace(/\|/g, ' - ') // Replace pipes with dashes to prevent table breaking
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\s+(I|II|III|IV|V|\d+)$/, '') // Remove Roman numerals and numbers at end
    .replace(/\s*-\s*(Remote|Hybrid|On-site).*$/i, '') // Remove work arrangement suffixes
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

/**
 * CRITICAL: Remove ALL duplicate city patterns
 * Handles: "Orlando Orlando", "San Jose  San Jose", "Austin, Austin"
 */
function removeDuplicateCities(text) {
  if (!text) return text;
  
  // Remove duplicate words with multiple spaces between them
  // Matches: "San Jose  San Jose" -> "San Jose"
  text = text.replace(/\b([A-Za-z]+(?:\s+[A-Za-z]+)?)\s{2,}\1\b/gi, '$1');
  
  // Remove duplicate words with single space between them
  // Matches: "Orlando Orlando" -> "Orlando"
  text = text.replace(/\b([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+\1\b/gi, '$1');
  
  // Remove duplicates across comma boundaries
  // Matches: "Austin, Austin" -> "Austin"
  text = text.replace(/\b([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*,\s*\1\b/gi, '$1');
  
  // Remove duplicate multi-word cities at the beginning
  // Matches: "San Jose San Jose, CA" -> "San Jose, CA"
  text = text.replace(/^([A-Za-z]+\s+[A-Za-z]+)\s+\1\b/gi, '$1');
  
  return text.trim();
}

/**
 * Clean city name by removing state names and country identifiers
 * Handles: "San Jose, California US" -> "San Jose"
 *          "Orlando, Florida US" -> "Orlando"
 *          "Bellevue 2002 156th Avenue Bellevue, Washington US" -> "Bellevue"
 */
function cleanCityName(cityText) {
  if (!cityText) return cityText;
  
  let cleaned = cityText;
  
  // Remove complete parenthetical phrases
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, '').trim();
  
  // NEW: Handle incomplete parentheses by removing from '(' to end
  cleaned = cleaned.replace(/\s*\(.*$/g, '').trim();
  
  // Remove "US" or "USA" at the end (only when they appear as separate words)
  cleaned = cleaned.replace(/,?\s*\b(US|USA|U\.S\.A?)\b\s*$/i, '');
  
  // Remove state names (full names) at the end - only when preceded by comma
  Object.keys(STATE_ABBREVIATIONS).forEach(stateName => {
    const escapedState = stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Only match state names when they are separate words after a comma
    const statePattern = new RegExp(`,\\s*\\b${escapedState}\\b\\s*$`, 'gi');
    cleaned = cleaned.replace(statePattern, '');
  });
  
  // Remove state abbreviations at the end - only when preceded by comma
  VALID_STATE_ABBREVS.forEach(abbrev => {
    // Only match state abbreviations when they are separate words after a comma
    const abbrevPattern = new RegExp(`,\\s*\\b${abbrev}\\b\\s*$`, 'gi');
    cleaned = cleaned.replace(abbrevPattern, '');
  });
  
  // Clean up any trailing commas or spaces
  cleaned = cleaned.replace(/[,\s]+$/, '').trim();
  
  return cleaned;
}

/**
 * Parse and clean location text to extract city and state
 * @param {string} locationText - Raw location text
 * @returns {Object} Object with city and state properties
 */
function parseLocation(locationText) {
  if (!locationText) {
    return { city: '', state: '' };
  }

  // Comprehensive job-related keywords to remove - ENHANCED
  const nonLocationKeywords = [
    // Job levels - most problematic ones
    'entry level', 'entry-level', 'entrylevel',
    'senior', 'junior', 
    'mid-level', 'mid level', 'midlevel',
    'intern', 'internship', 'internships',
    'co-op', 'coop',
    'trainee', 'graduate', 'fellowship',
    
    // Employment types
    'full time', 'full-time', 'fulltime',
    'part time', 'part-time', 'parttime',
    'contract', 'contractor',
    'temporary', 'temp',
    'permanent',
    'seasonal',
    'freelance', 'freelancer',
    'consultant', 'consulting',
    
    // Work arrangements
    'hybrid',
    'on-site', 'onsite', 'on site',
    'work from home', 'wfh',
    'telecommute', 'telecommuting',
    'virtual',
    'in-office', 'in office',
    
    // Location descriptors - CRITICAL
    'multiple locations', 'multiple cities', 'multiple sites',
    'various locations', 'various cities',
    'all locations',
    'nationwide', 'national',
    'multiple', 'various', 'all', 'any',
    
    // Job descriptors
    'experience', 'exp',
    'years', 'yrs', 'year',
    'required', 'req',
    'preferred', 'pref',
    'degree',
    'bachelor', 'bachelors', 'bs', 'ba',
    'master', 'masters', 'ms', 'ma', 'mba',
    'phd', 'doctorate',
    'position', 'positions',
    'role', 'roles',
    'job', 'jobs',
    'opportunity', 'opportunities',
    'opening', 'openings',
    'posting', 'postings',
    'vacancy', 'vacancies'
  ];

  // STEP 1: Initial normalization
  let cleanLocation = locationText.trim();

  // STEP 2: Check for remote FIRST (special handling before cleaning)
  const lowerLocation = cleanLocation.toLowerCase();
  const remotePatterns = [
    /^remote$/i,
    /^remote[,\s]*$/i,
    /^remote\s*-\s*$/i,
    /^\s*remote\s*$/i
  ];
  
  for (const pattern of remotePatterns) {
    if (pattern.test(cleanLocation)) {
      return { city: 'Remote', state: '' };
    }
  }

  // STEP 3: Remove country suffixes
  cleanLocation = cleanLocation
    .replace(/,?\s*United States\s*$/i, '')
    .replace(/,?\s*USA\s*$/i, '')
    .replace(/,?\s*U\.S\.A\.?\s*$/i, '')
    .replace(/,?\s*US\s*$/i, '')
    .trim();

  // STEP 4: Remove non-location keywords with ENHANCED regex
  // This is the critical section - using word boundaries and case-insensitive matching
  nonLocationKeywords.forEach(keyword => {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`^${escapedKeyword}[,\\s]*`, 'gi'),
      // In the middle with word boundaries
      new RegExp(`\\b${escapedKeyword}\\b[,\\s]*`, 'gi'),
      // At the end with optional whitespace/comma before
      new RegExp(`[,\\s]*${escapedKeyword}$`, 'gi'),
      // Standalone with surrounding whitespace
      new RegExp(`\\s+${escapedKeyword}\\s+`, 'gi')
    ];
    patterns.forEach(pattern => {
      cleanLocation = cleanLocation.replace(pattern, ' ');
    });
  });

  // STEP 5: Aggressive cleanup of remaining artifacts
  cleanLocation = cleanLocation
    .replace(/\s+/g, ' ')
    .replace(/,+/g, ',')
    .replace(/\s*,\s*/g, ', ')
    .replace(/^[,\s\-:;|]+|[,\s\-:;|]+$/g, '')
    // Remove standalone dashes with spaces
    .replace(/\s+-\s+/g, ' ')
    // Remove any remaining double spaces
    .replace(/\s+/g, ' ')
    .trim();

  // STEP 6: Additional pattern-based cleaning for specific cases
  // Remove patterns like "InternshipCity" or "Entry LevelCity"
  cleanLocation = cleanLocation
    .replace(/^(internship|intern|entrylevel|entry|senior|junior)/i, '')
    .trim();

  // STEP 7: Filter out empty or too short results
  if (!cleanLocation || cleanLocation.length < 2) {
    return { city: 'Multiple Cities', state: '' };
  }

  // STEP 8: Filter out generic/placeholder terms
  const genericTerms = [
    'us', 'usa', 'u.s.', 'u.s.a', 'u.s', 'us.', 
    'united states', 'unitedstates',
    'multiple', 'various', 'all', 'any',
    'nationwide', 'national',
    'tbd', 'tba', 'n/a', 'na',
    'location', 'locations'
  ];
  
  if (genericTerms.includes(cleanLocation.toLowerCase())) {
    return { city: '', state: '' };
  }

  // Check for only numbers/special chars
  if (/^[\d\s,\-._]+$/.test(cleanLocation)) {
    return { city: 'Multiple Cities', state: '' };
  }

  // STEP 10: Split by comma and parse
  const parts = cleanLocation
    .split(',')
    .map(part => removeDuplicateCities(part.trim()))
    .filter(part => part.length > 0);

  if (parts.length >= 2) {
    // Format: "Mountain View, California" or "Austin, TX"
    return {
      city: parts[0],
      state: parts[1]
    };
  } else if (parts.length === 1) {
    const singlePart = parts[0];

    // Check if it's a state abbreviation
    if (stateAbbreviations.includes(singlePart.toUpperCase())) {
      return { city: '', state: singlePart.toUpperCase() };
    }
    
    // Check if it's a state full name
    if (stateNames.includes(singlePart.toLowerCase())) {
      // Capitalize first letter of each word
      const capitalizedState = singlePart
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return { city: '', state: capitalizedState };
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
 * Convert date string to relative format (e.g., "1h", "2d", "1w", "1mo")
 * @param {string} postedDate - Raw posted date string
 * @returns {string} Relative date format
 */
function convertDateToRelative(postedDate) {
  // Return null if input is empty, null, or undefined
  if (!postedDate || String(postedDate).trim() === '') return null;
  
  const dateStr = String(postedDate);

  // Check if it's already in the desired format
  const desiredFormatRegex = /^\d+[hdwmo]+$/i;
  if (desiredFormatRegex.test(dateStr.trim())) return dateStr.trim();

  let cleanedDate = dateStr
    .replace(/^posted\s+/i, '')
    .replace(/\s+ago$/i, '')
    .replace(/^on\s+/i, '')
    .trim()
    .toLowerCase();

  // Handle special cases first
  if (cleanedDate === 'today' || cleanedDate === 'yesterday') {
    return "1d";
  }
  if (cleanedDate.includes('just') || cleanedDate.includes('recently') || cleanedDate.includes('now')) {
    return "1h";
  }

  // Handle "30+ days" or similar patterns
  const daysPlusRegex = /(\d+)\+?\s*days?/i;
  const daysPlusMatch = cleanedDate.match(daysPlusRegex);
  if (daysPlusMatch) {
    const days = parseInt(daysPlusMatch[1]);
    if (days >= 30) {
      const months = Math.floor(days / 30);
      return `${months}mo`;
    } else if (days >= 7) {
      const weeks = Math.floor(days / 7);
      return `${weeks}w`;
    } else {
      return `${days}d`;
    }
  }

  // Handle "X+ weeks", "X+ months" patterns
  const weeksPlusRegex = /(\d+)\+?\s*weeks?/i;
  const weeksPlusMatch = cleanedDate.match(weeksPlusRegex);
  if (weeksPlusMatch) {
    const weeks = parseInt(weeksPlusMatch[1]);
    return `${weeks}w`;
  }

  const monthsPlusRegex = /(\d+)\+?\s*months?/i;
  const monthsPlusMatch = cleanedDate.match(monthsPlusRegex);
  if (monthsPlusMatch) {
    const months = parseInt(monthsPlusMatch[1]);
    return `${months}mo`;
  }

  // Parse relative time expressions
  const timeRegex = /(\d+)\s*(hour|hours|h|minute|minutes|min|day|days|d|week|weeks|w|month|months|mo|m)(?:\s|$)/i;
  const match = cleanedDate.match(timeRegex);

  if (match) {
    const number = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    if (unit.startsWith('h') || unit.includes('hour')) {
      return `${number}h`;
    } else if (unit.startsWith('min') || unit.includes('minute')) {
      return number >= 60 ? `${Math.floor(number / 60)}h` : "1h";
    } else if (unit.startsWith('d') || unit.includes('day')) {
      return `${number}d`;
    } else if (unit.startsWith('w') || unit.includes('week')) {
      return `${number}w`;
    } else if ((unit === 'm' || unit.startsWith('month')) && unit !== 'min') {
      return `${number}mo`;
    }
  }

  // Try to parse absolute dates as fallback
  const parsedDate = new Date(dateStr);
  if (isNaN(parsedDate.getTime())) {
    return "1d";
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
 * @param {string} postedDate - Raw posted date string
 * @returns {boolean} True if job is older than 1 month
 */
function isJobOlderThanOneMonth(postedDate) {
  const relativeDate = convertDateToRelative(postedDate);
  
  // If no date information is available, don't filter it out
  if (relativeDate === null) return false;
  
  const match = relativeDate.match(/^(\d+)([hdwmo])$/i);
  if (!match) return true;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 'mo' && value >= 1) {
    return true;
  }
  
  return false;
}

/**
 * Main transformation function - converts raw job data to standardized format
 * @param {Array} jobs - Array of raw job objects
 * @param {string} searchQuery - Search query used for job search
 * @returns {Array} Array of transformed job objects
 */
function transformJobs(jobs, searchQuery, saveToFile = true, outputPath = null) {
  const fs = require('fs');
  const path = require('path');
  
  const transformedJobs = jobs
    .filter(job => job.title && job.title.trim() !== '')
    .filter(job => !isJobOlderThanOneMonth(job.posted))
    .map(job => {
      const { city, state } = parseLocation(job.location);
      const applyLink = job.applyLink || "";
      const postedRelative = convertDateToRelative(job.posted);
      const job_description = job.description;

      // Clean the city name to remove state names and US
      const cleanedCity = cleanCityName(location.city);

      return {
        employer_name: job.company || '',
        job_title: cleanJobTitle(job.title),
        job_city: city || '',
        job_state: state || '',
        job_posted_at: postedRelative || "Recently",
        job_description: job_description || `${searchQuery} job for the role ${job.title}`,
        job_apply_link: applyLink,
      };
    });
}

// Export all functions
module.exports = {
  cleanJobTitle,
  parseLocation,
  convertDateToRelative,
  isJobOlderThanOneMonth,
  transformJobs
};