// utils/jobTransformers.js

// Helper function to clean job title
function cleanJobTitle(title) {
  if (!title) return title;

  // Remove common prefixes and suffixes AND handle pipe characters
  return title
    .replace(/\|/g, ' - ') // Replace pipes with dashes to prevent table breaking
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\s+(I|II|III|IV|V|\d+)$/, '')
    .replace(/\s*-\s*(Remote|Hybrid|On-site).*$/i, '')
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

// Helper function to parse location
function parseLocation(locationText) {
  if (!locationText) {
    return { city: '', state: 'US' };
  }

  // Keywords to remove from location text (job level, employment type, etc.)
  const nonLocationKeywords = [
    'entry level', 'entry-level', 'senior', 'junior', 'mid-level', 'intern',
    'full time', 'full-time', 'part time', 'part-time', 'contract', 'temporary',
    'remote', 'hybrid', 'on-site', 'onsite', 'work from home', 'wfh',
    'multiple locations', 'multiple cities', 'various locations', 'nationwide',
    'experience', 'years', 'required', 'preferred', 'degree', 'bachelor',
    'master', 'phd', 'position', 'role', 'job', 'opportunity'
  ];

  // Clean up the location text
  let cleanLocation = locationText
    .replace(/,?\s*United States$/i, '') // Remove "United States" suffix
    .trim();

  // Remove non-location keywords (case insensitive)
  nonLocationKeywords.forEach(keyword => {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    cleanLocation = cleanLocation.replace(regex, '').trim();
  });

  // Clean up extra spaces and punctuation
  cleanLocation = cleanLocation
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/^[,\s]+|[,\s]+$/g, '') // Remove leading/trailing commas and spaces
    .replace(/,+/g, ',') // Multiple commas to single comma
    .trim();

  if (!cleanLocation) {
    return { city: '', state: 'United States' };
  }

  // Split by comma and trim
  const parts = cleanLocation.split(',').map(part => part.trim()).filter(part => part.length > 0);

  if (parts.length >= 2) {
    // Format: "Westborough, MA" or "City, State"
    return {
      city: parts[0],
      state: parts[1]
    };
  } else if (parts.length === 1) {
    // Could be just a state or just a city
    const singlePart = parts[0];

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

    if (stateAbbreviations.includes(singlePart.toUpperCase())) {
      return { city: '', state: singlePart.toUpperCase() };
    } else if (stateNames.includes(singlePart.toLowerCase())) {
      return { city: '', state: singlePart };
    } else {
      // Assume it's a city if it's not a recognized state
      return { city: singlePart, state: '' };
    }
  }

  return { city: '', state: '' };
}

// Helper function to convert date string to relative format (without "ago")
function convertDateToRelative(postedDate) {
  // Ensure postedDate is a string
  const dateStr = String(postedDate);

  // Check if it's already in the desired format (like "1h", "2d", "1w", "1mo")
  const desiredFormatRegex = /^\d+[hdwmo]+$/i;
  if (desiredFormatRegex.test(dateStr.trim())) {
    return dateStr.trim(); // Return as-is if already in correct format
  }

  // Clean and normalize the input
  let cleanedDate = dateStr
    .replace(/^posted\s+/i, '') // Remove "posted" from beginning
    .replace(/\s+ago$/i, '') // Remove "ago" from end
    .replace(/^on\s+/i, '') // Remove "on" from beginning
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

  // Parse relative time expressions and convert to desired format
  const timeRegex = /(\d+)\s*(hour|hours|h|minute|minutes|min|day|days|d|week|weeks|w|month|months|mo|m)(?:\s|$)/i;
  const match = cleanedDate.match(timeRegex);

  if (match) {
    const number = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    // Convert to desired format
    if (unit.startsWith('h') || unit.includes('hour')) {
      return `${number}h`;
    } else if (unit.startsWith('min') || unit.includes('minute')) {
      // Convert minutes to hours if >= 60, otherwise show as 1h minimum
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

  // If we couldn't parse the date, return default
  if (isNaN(parsedDate.getTime())) {
    return "1d";
  }

  // Calculate difference
  const now = new Date();
  const diffTime = Math.abs(now - parsedDate);
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Convert to desired format
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

// Helper function to check if job is older than one month
function isJobOlderThanOneMonth(postedDate) {
  const relativeDate = convertDateToRelative(postedDate);
  const match = relativeDate.match(/^(\d+)([hdwmo])$/i);
  if (!match) return true; // Default to remove if date is invalid

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 'mo' && value >= 1) {
    return true; // Job is 1 month or older
  }
  return false; // Job is less than 1 month old
}

// Main transformation function
function transformJobs(jobs, searchQuery) {
  return jobs
    .filter(job => job.title && job.title.trim() !== '') // Filter out jobs without titles
    .filter(job => !isJobOlderThanOneMonth(job.posted)) // Filter out jobs older than 1 month
    .map(job => {
      const { city, state } = parseLocation(job.location);
      const applyLink = job.applyLink || "";
      const postedRelative = convertDateToRelative(job.posted);
      const job_description = job.description;

      return {
        employer_name: job.company || "",
        job_title: cleanJobTitle(job.title),
        job_city: city || '',
        job_state: state || "US",
        job_posted_at: postedRelative || "Recently",
        job_description: job_description || `${searchQuery} job for the role ${job.title}`,
        job_apply_link: applyLink,
      };
    });
}

module.exports = {
  cleanJobTitle,
  parseLocation,
  convertDateToRelative,
  transformJobs
};