// utils/jobTransformers.js

// Helper function to clean job title
function cleanJobTitle(title) {
  if (!title) return title;
  
  // Remove common prefixes and suffixes
  return title
    .replace(/\s+(I|II|III|IV|V|\d+)$/, '')
    .replace(/\s*-\s*(Remote|Hybrid|On-site).*$/i, '')
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
  if (!postedDate) return "Recently";
  
  // Check if it's already in the desired format (like "2 months", "1 week", etc.)
  const desiredFormatRegex = /^\d+\s+(day|days|week|weeks|month|months|hour|hours|minute|minutes)$|^(today|recently)$/i;
  if (desiredFormatRegex.test(postedDate.trim())) {
    return postedDate.trim(); // Return as-is if already in correct format
  }
  
  // If it contains "ago", clean it up by removing "posted" and "ago"
  if (postedDate.toLowerCase().includes('ago')) {
    return postedDate
      .replace(/^posted\s+/i, '') // Remove "posted" from beginning
      .replace(/\s+ago$/i, '')    // Remove "ago" from end
      .trim();
  }
  
  // If it contains other relative time words but not "ago", check if we should process it
  const relativeTimeWords = ['day', 'week', 'month', 'hour', 'minute', 'second', 'just now', 'recently'];
  if (relativeTimeWords.some(word => postedDate.toLowerCase().includes(word))) {
    // If it's already a relative format without "ago", return as-is
    return postedDate.trim();
  }
  
  // Try to parse various date formats
  let parsedDate;
  
  // Common date formats from job sites
  const dateFormats = [
    'MM/DD/YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD', 
    'MMMM DD, YYYY', 'MMM DD, YYYY', 'DD MMM YYYY'
  ];
  
  for (const format of dateFormats) {
    parsedDate = new Date(postedDate);
    if (!isNaN(parsedDate.getTime())) break;
  }
  
  // If we couldn't parse the date, return the original string
  if (isNaN(parsedDate.getTime())) {
    return postedDate;
  }
  
  // Calculate difference in days
  const now = new Date();
  const diffTime = Math.abs(now - parsedDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Convert to relative time (without "ago")
  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "1 day";
  } else if (diffDays < 7) {
    return `${diffDays} days`;
  } else if (diffDays < 14) {
    return "1 week";
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} weeks`;
  } else if (diffDays < 60) {
    return "1 month";
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months} months`;
  }
}

// Main transformation function
function transformJobs(jobs, searchQuery) {
  return jobs
    .filter(job => job.title && job.title.trim() !== '') // Filter out jobs without titles
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