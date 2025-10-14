// src/backend/output/jobTransformers.js

/**
 * Clean job title by removing common prefixes, suffixes, and formatting issues
 * @param {string} title - Raw job title
 * @returns {string} Cleaned job title
 */
function cleanJobTitle(title) {
  if (!title) return title;

  // Remove common prefixes and suffixes AND handle pipe characters
  return title
    .replace(/\|/g, ' - ') // Replace pipes with dashes to prevent table breaking
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\s+(I|II|III|IV|V|\d+)$/, '') // Remove Roman numerals and numbers at end
    .replace(/\s*-\s*(Remote|Hybrid|On-site).*$/i, '') // Remove work arrangement suffixes
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
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
    // Escape special regex characters
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create multiple patterns to catch different scenarios
    const patterns = [
      // At the beginning with optional whitespace/comma after
      new RegExp(`^${escapedKeyword}[,\\s]*`, 'gi'),
      // In the middle with word boundaries
      new RegExp(`\\b${escapedKeyword}\\b[,\\s]*`, 'gi'),
      // At the end with optional whitespace/comma before
      new RegExp(`[,\\s]*${escapedKeyword}$`, 'gi'),
      // Standalone with surrounding whitespace
      new RegExp(`\\s+${escapedKeyword}\\s+`, 'gi')
    ];
    
    // Apply all patterns
    patterns.forEach(pattern => {
      cleanLocation = cleanLocation.replace(pattern, ' ');
    });
  });

  // STEP 5: Aggressive cleanup of remaining artifacts
  cleanLocation = cleanLocation
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Remove multiple commas
    .replace(/,+/g, ',')
    // Remove spaces before/after commas
    .replace(/\s*,\s*/g, ', ')
    // Remove leading/trailing commas, spaces, dashes, and other punctuation
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
    return { city: '', state: '' };
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

  // STEP 9: Check if the cleaned location is just numbers or special characters
  if (/^[\d\s,\-._]+$/.test(cleanLocation)) {
    return { city: '', state: '' };
  }

  // STEP 10: Split by comma and parse
  const parts = cleanLocation
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0);

  // Common US state abbreviations
  const stateAbbreviations = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  // Common US state full names
  const stateNames = [
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
    'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
    'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
    'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
    'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
    'new hampshire', 'new jersey', 'new mexico', 'new york',
    'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon',
    'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
    'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
    'west virginia', 'wisconsin', 'wyoming'
  ];

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
    
    // Final check: if it contains job-related terms, filter it out
    const hasJobTerms = nonLocationKeywords.some(keyword => 
      singlePart.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasJobTerms) {
      return { city: '', state: '' };
    }
    
    // Assume it's a city if it's not a recognized state
    return { city: singlePart, state: '' };
  }

  return { city: '', state: '' };
}

/**
 * Convert date string to relative format (e.g., "1h", "2d", "1w", "1mo")
 * @param {string} postedDate - Raw posted date string
 * @returns {string} Relative date format
 */
function convertDateToRelative(postedDate) {
  const dateStr = String(postedDate);

  // Check if it's already in the desired format
  const desiredFormatRegex = /^\d+[hdwmo]+$/i;
  if (desiredFormatRegex.test(dateStr.trim())) {
    return dateStr.trim();
  }

  // Clean and normalize the input
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

  // Calculate difference
  const now = new Date();
  const diffTime = Math.abs(now - parsedDate);
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffHours < 24) {
    return diffHours === 0 ? "1h" : `${diffHours}h`;
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months}mo`;
  }
}

/**
 * Check if job is older than one month
 * @param {string} postedDate - Raw posted date string
 * @returns {boolean} True if job is older than 1 month
 */
function isJobOlderThanOneMonth(postedDate) {
  const relativeDate = convertDateToRelative(postedDate);
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
function transformJobs(jobs, searchQuery) {
  return jobs
    .filter(job => job.title && job.title.trim() !== '')
    .filter(job => !isJobOlderThanOneMonth(job.posted))
    .map(job => {
      const { city, state } = parseLocation(job.location);
      const applyLink = job.applyLink || "";
      const postedRelative = convertDateToRelative(job.posted);
      const job_description = job.description;

      return {
        employer_name: job.company || "",
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
