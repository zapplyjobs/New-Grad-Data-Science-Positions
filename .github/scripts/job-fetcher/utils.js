const fs = require("fs");
const path = require("path");

// Load company database
const companies = JSON.parse(
  fs.readFileSync(path.join(__dirname, "companies.json"), "utf8")
);

// Flatten all companies for easy access
const ALL_COMPANIES = Object.values(companies).flat();
const COMPANY_BY_NAME = {};
ALL_COMPANIES.forEach((company) => {
  COMPANY_BY_NAME[company.name.toLowerCase()] = company;
  // Add safety check for api_names
  if (company.api_names && Array.isArray(company.api_names)) {
    company.api_names.forEach((name) => {
      COMPANY_BY_NAME[name.toLowerCase()] = company;
    });
  }
});

/**
 * Utility functions for job processing
 */

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}



/**
 * Generate a standardized job ID for consistent deduplication across systems
 * This ensures the same job gets the same ID in both the scraper and Discord posting
 */
function generateJobId(job) {
  const title = (job.job_title || "").toLowerCase().trim().replace(/\s+/g, "-");
  const company = (job.employer_name || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
  const city = (job.job_city || "").toLowerCase().trim().replace(/\s+/g, "-");

  // Remove special characters and normalize
  const normalize = (str) =>
    str
      .replace(/[^\w-]/g, "-") // Replace special chars with dashes
      .replace(/-+/g, "-") // Collapse multiple dashes
      .replace(/^-|-$/g, ""); // Remove leading/trailing dashes

  return `${normalize(company)}-${normalize(title)}-${normalize(city)}`;
}

/**
 * Convert old job ID format to new standardized format
 * This helps with migration from the old inconsistent ID system
 */
function migrateOldJobId(oldId) {
  // Old format was: company-title-city with inconsistent normalization
  // We can't perfectly reverse it, but we can normalize what we have
  const normalized = oldId
    .replace(/[^\w-]/g, "-") // Replace special chars with dashes
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, ""); // Remove leading/trailing dashes

  return normalized;
}

function normalizeCompanyName(companyName) {
  const company = COMPANY_BY_NAME[companyName.toLowerCase()];
  return company ? company.name : companyName;
}

function getCompanyEmoji(companyName) {
  const company = COMPANY_BY_NAME[companyName.toLowerCase()];
  return company ? company.emoji : "🏢";
}

function getCompanyCareerUrl(companyName) {
  const company = COMPANY_BY_NAME[companyName.toLowerCase()];
  return company ? company.career_url : "#";
}

function formatTimeAgo(dateString) {
  if (!dateString) return "Recently";

  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1d ago";
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    return `${Math.floor(diffInDays / 30)}mo ago`;
  }
}

function isJobOlderThanWeek(dateString) {
  if (!dateString) return false;

  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  return diffInDays >= 7;
}

function filterJobsByLevel(jobs) {
  console.log(`🔍 Starting job level filtering for ${jobs.length} jobs...`);
  
  // Enhanced keywords that indicate senior/advanced level positions (to EXCLUDE)
  const seniorKeywords = [
    'senior', 'sr.', 'sr ', 'lead', 'principal', 'staff', 'architect', 
    'director', 'manager', 'head of', 'chief', 'vp', 'vice president',
    'expert', 'specialist', 'consultant', 'advanced', 'executive',
    'tech lead', 'technical lead', 'team lead', 'team leader',
    'supervisor', 'coordinator', 'program manager', 'project manager',
    'engineering manager', 'senior director', 'executive director', 
    'group leader', 'division head', 'department head', 'fellow', 
    'guru', 'master', 'senior specialist', 'principal consultant', 
    'distinguished', 'senior architect', 'lead architect', 'chief architect', 
    'senior scientist', 'strategy', 'strategic', 'portfolio manager', 
    'senior advisor', 'principal advisor', 'veteran', 'seasoned', 
    'senior consultant', 'lead consultant', 'senior lead'
  ];
  
  // Enhanced keywords that indicate entry/junior level positions (to INCLUDE)
  const juniorKeywords = [
    'junior', 'jr.', 'jr ', 'entry', 'entry-level', 'entry level',
    'graduate', 'new grad', 'new graduate', 'recent graduate', 
    'college graduate', 'university graduate', 'fresh graduate',
    'intern', 'internship', 'trainee', 'apprentice', 'rotational',
    'graduate program', 'training program', 'development program',
    'associate', 'fresh', 'beginner', 'starting', 'early career',
    'level 1', 'level i', 'grade 1', 'tier 1', '0-2 years'
  ];
  
  // Enhanced experience patterns to check in descriptions
  const experiencePatterns = [
    /(\d+)\s*[-+to]\s*(\d+)?\s*years?\s*(?:of\s*)?(?:experience|exp|work)/gi,
    /(?:minimum|min|at least|require[ds]?|need|must have)\s*(\d+)\s*years?\s*(?:of\s*)?(?:experience|exp)/gi,
    /(\d+)\s*\+\s*years?\s*(?:of\s*)?(?:experience|exp)/gi,
    /(\d+)\s*or\s*more\s*years?\s*(?:of\s*)?(?:experience|exp)/gi,
    /(?:with|having)\s*(\d+)\s*years?\s*(?:of\s*)?(?:experience|exp)/gi,
    /(\d+)\s*years?\s*(?:of\s*)?(?:professional|relevant|related)\s*(?:experience|exp)/gi,
    /(?:minimum|at least)\s*(\d+)\s*years?\s*in/gi,
    /(\d+)\s*years?\s*(?:background|history)/gi,
    /(?:experience|background|history|track record).*?(\d+)\s*years?/gi,
    /(?:skilled|experienced|seasoned|veteran).*?(\d+)\s*years?/gi,
    /(?:portfolio|work|projects).*?(\d+)\s*years?/gi,
    /(?:must|should|need|require).*?(\d+)\s*years?/gi,
  ];
  
  // Advanced education requirements (to EXCLUDE)
  const advancedEducation = [
    'phd', 'ph.d.', 'doctorate', 'doctoral', 'postgraduate required'
  ];

  // Pattern to detect search query formatted descriptions
  function isSearchQueryDescription(description) {
    if (!description) return false;
    
    const searchQueryPattern = /\b\w+\s+job\s+for\s+the\s+role\s+\w+/i;
    const isSearchQuery = searchQueryPattern.test(description);
    
    if (isSearchQuery) {
      console.log(`   🔍 Detected search query format description - will ignore for experience filtering`);
    }
    
    return isSearchQuery;
  }

  function extractYearsFromDescription(description) {
    if (!description) return [];
    
    if (isSearchQueryDescription(description)) {
      console.log(`   ⚠️  Skipping experience extraction from search query format description`);
      return [];
    }
    
    const years = [];
    const lowerDesc = description.toLowerCase();
    
    // Clean description to handle multiple spaces and line breaks
    const cleanDesc = lowerDesc.replace(/\s+/g, ' ').trim();
    
    console.log(`   🔍 Analyzing description for experience patterns...`);
    
    experiencePatterns.forEach((pattern, index) => {
      const matches = [...cleanDesc.matchAll(pattern)];
      matches.forEach(match => {
        // Handle different capture groups based on pattern
        if (match[1] && !isNaN(parseInt(match[1]))) {
          const year1 = parseInt(match[1]);
          years.push(year1);
          console.log(`   📊 Pattern ${index + 1} found: ${year1} years (from: "${match[0].trim()}")`);
        }
        
        if (match[2] && !isNaN(parseInt(match[2]))) {
          const year2 = parseInt(match[2]);
          years.push(year2);
          console.log(`   📊 Pattern ${index + 1} found: ${year2} years (from: "${match[0].trim()}")`);
        }
      });
    });
    
    // Additional contextual checks for common phrases that might indicate experience
    const contextualChecks = [
      { pattern: /(?:experience|background|history|track record).*?(\d+)\s*years?/gi, context: 'general experience' },
      { pattern: /(?:skilled|experienced|seasoned|veteran).*?(\d+)\s*years?/gi, context: 'skill level' },
      { pattern: /(?:portfolio|work|projects).*?(\d+)\s*years?/gi, context: 'work history' },
      { pattern: /(?:must|should|need|require).*?(\d+)\s*years?/gi, context: 'requirements' }
    ];
    
    contextualChecks.forEach(check => {
      const matches = [...cleanDesc.matchAll(check.pattern)];
      matches.forEach(match => {
        if (match[1] && !isNaN(parseInt(match[1]))) {
          const contextYears = parseInt(match[1]);
          if (!years.includes(contextYears)) {
            years.push(contextYears);
            console.log(`   🎯 Contextual pattern (${check.context}) found: ${contextYears} years (from: "${match[0].trim()}")`);
          }
        }
      });
    });
    
    // Remove duplicates and sort
    const uniqueYears = [...new Set(years)].sort((a, b) => a - b);
    
    if (uniqueYears.length > 0) {
      console.log(`   📈 Total years extracted: [${uniqueYears.join(', ')}]`);
    } else {
      console.log(`   ℹ️  No experience requirements found in description`);
    }
    
    return uniqueYears;
  }

  function checkTitleLevel(title) {
    if (!title) return { level: 'unknown', matchedKeyword: '' };
    
    const lowerTitle = title.toLowerCase();
    
    // Check for senior-level indicators FIRST (EXCLUDE)
    for (const keyword of seniorKeywords) {
      if (lowerTitle.includes(keyword.toLowerCase())) {
        return { level: 'senior', matchedKeyword: keyword };
      }
    }
    
    // Check for junior-level indicators SECOND (INCLUDE)
    for (const keyword of juniorKeywords) {
      if (lowerTitle.includes(keyword.toLowerCase())) {
        return { level: 'junior', matchedKeyword: keyword };
      }
    }
    
    return { level: 'unclear', matchedKeyword: '' };
  }

  function checkEducationRequirements(description) {
    if (!description) return { level: 'acceptable', matchedRequirement: '' };
    
    if (isSearchQueryDescription(description)) {
      console.log(`   📚 Skipping education requirement check for search query format description`);
      return { level: 'acceptable', matchedRequirement: 'search_query_format' };
    }
    
    const lowerDesc = description.toLowerCase();
    
    for (const edu of advancedEducation) {
      if (lowerDesc.includes(edu.toLowerCase())) {
        if (lowerDesc.includes('preferred') || lowerDesc.includes('nice to have') || 
            lowerDesc.includes('plus') || lowerDesc.includes('bonus') || 
            lowerDesc.includes('optional') || lowerDesc.includes('desired')) {
          continue;
        }
        return { level: 'too_advanced', matchedRequirement: edu };
      }
    }
    
    return { level: 'acceptable', matchedRequirement: '' };
  }

  // Filter jobs with improved hierarchy
  const filteredJobs = [];
  const removedJobs = [];
  
  jobs.forEach((job, index) => {
    let shouldInclude = true;
    let reason = '';
    let category = '';
    
    const titleAnalysis = checkTitleLevel(job.job_title);
    const yearsRequired = extractYearsFromDescription(job.job_description);
    const educationAnalysis = checkEducationRequirements(job.job_description);
    const isSearchQueryFormat = isSearchQueryDescription(job.job_description);
    
    console.log(`\n🔍 Job ${index + 1}/${jobs.length}: "${job.job_title}" at ${job.employer_name}`);
    
    // STEP 1: Check senior-level titles FIRST (EXCLUDE immediately)
    if (titleAnalysis.level === 'senior') {
      shouldInclude = false;
      reason = `Senior-level title detected`;
      category = `EXCLUDED - Title contains "${titleAnalysis.matchedKeyword}"`;
      console.log(`   ❌ STEP 1 - ${category}`);
    }
    
    // STEP 2: Check junior-level titles SECOND (INCLUDE immediately)
    else if (titleAnalysis.level === 'junior') {
      shouldInclude = true;
      reason = `Junior-level title confirmed`;
      category = `INCLUDED - Entry-level title contains "${titleAnalysis.matchedKeyword}"`;
      console.log(`   ✅ STEP 2 - ${category}`);
    }
    
    // STEP 3: Check description for experience requirements THIRD
    else {
      if (yearsRequired.length > 0) {
        const maxYears = Math.max(...yearsRequired);
        console.log(`   📊 STEP 3 - Experience required: ${yearsRequired.join(', ')} years (max: ${maxYears})`);
        
        if (maxYears >= 5) {
          shouldInclude = false;
          reason = `Requires ${maxYears}+ years experience`;
          category = `EXCLUDED - Too much experience required (${maxYears}+ years)`;
          console.log(`   ❌ STEP 3 - ${category}`);
        } else {
          shouldInclude = true;
          category = `INCLUDED - Acceptable experience requirement (${maxYears} years)`;
          console.log(`   ✅ STEP 3 - ${category}`);
        }
      }
      
      // STEP 4: If no clear description or years mentioned, mark as unclear (INCLUDE by default)
      else {
        shouldInclude = true;
        if (isSearchQueryFormat) {
          category = `INCLUDED - Search query format, no filtering applied`;
          reason = `Search query generated description`;
        } else if (titleAnalysis.level === 'unclear') {
          category = `INCLUDED - Unclear level, no experience requirements (assuming entry-friendly)`;
          reason = `No clear barriers identified`;
        }
        console.log(`   ✅ STEP 4 - ${category}`);
      }
    }
    
    // STEP 5: Check education requirements (if still included)
    if (shouldInclude && educationAnalysis.level === 'too_advanced') {
      shouldInclude = false;
      reason = `Requires advanced degree (${educationAnalysis.matchedRequirement})`;
      category = `EXCLUDED - Advanced degree required: ${educationAnalysis.matchedRequirement}`;
      console.log(`   ❌ STEP 5 - Education: ${category}`);
    }
    
    // Final decision
    if (shouldInclude) {
      console.log(`   ✅ FINAL DECISION: INCLUDED`);
      filteredJobs.push(job);
    } else {
      console.log(`   ❌ FINAL DECISION: EXCLUDED - ${reason}`);
      removedJobs.push({ ...job, removal_reason: reason, category: category });
    }
  });
  
  // Summary logging
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🎯 JOB LEVEL FILTERING SUMMARY`);
  console.log(`${'='.repeat(50)}`);
  console.log(`📊 Original jobs: ${jobs.length}`);
  console.log(`✅ Suitable jobs (entry/mid-level): ${filteredJobs.length} (${((filteredJobs.length/jobs.length)*100).toFixed(1)}%)`);
  console.log(`❌ Removed jobs (senior/advanced): ${removedJobs.length} (${((removedJobs.length/jobs.length)*100).toFixed(1)}%)`);
  
  const searchQueryJobs = jobs.filter(job => isSearchQueryDescription(job.job_description));
  if (searchQueryJobs.length > 0) {
    console.log(`🎯 Search query format jobs found: ${searchQueryJobs.length} (protected from description-based filtering)`);
  }
  
  const removalReasons = {};
  removedJobs.forEach(job => {
    const reason = job.removal_reason;
    removalReasons[reason] = (removalReasons[reason] || 0) + 1;
  });
  
  console.log(`\n📈 REMOVAL REASONS BREAKDOWN:`);
  Object.entries(removalReasons).forEach(([reason, count]) => {
    const percentage = ((count / removedJobs.length) * 100).toFixed(1);
    console.log(`   • ${reason}: ${count} jobs (${percentage}%)`);
  });
  
  console.log(`\n${'='.repeat(50)}`);
  
  return filteredJobs;
}


function isUSOnlyJob(job) {
    // Note: There's no job_country field, but country info sometimes appears in job_state
    const state = (job.job_state || '').toLowerCase().trim();
    const city = (job.job_city || '').toLowerCase().trim();
    
    // Normalize location string by removing extra spaces and punctuation
    const cleanCity = city.replace(/[,\s]+/g, ' ').trim();
    const cleanState = state.replace(/[,\s]+/g, ' ').trim();
    
    // Expanded list of non-US countries (including variations)
    const nonUSCountries = [
        'estonia', 'canada', 'uk', 'united kingdom', 'great britain', 'britain',
        'germany', 'deutschland', 'france', 'netherlands', 'holland',
        'sweden', 'norway', 'denmark', 'finland', 'australia', 'india', 'singapore',
        'japan', 'south korea', 'korea', 'brazil', 'mexico', 'spain', 'italy', 'poland',
        'ireland', 'israel', 'switzerland', 'austria', 'belgium', 'czech republic',
        'russia', 'china', 'ukraine', 'serbia', 'romania', 'bulgaria', 'hungary',
        'portugal', 'greece', 'turkey', 'croatia', 'slovakia', 'slovenia', 'lithuania',
        'latvia', 'luxembourg', 'malta', 'cyprus', 'iceland', 'new zealand', 'thailand',
        'vietnam', 'philippines', 'indonesia', 'malaysia', 'taiwan', 'hong kong'
    ];
    
    // Check if state field contains non-US countries (this is the main filter since country appears in state)
    if (nonUSCountries.some(nonUSCountry => cleanState.includes(nonUSCountry))) {
        return false;
    }
    
    // Expanded non-US cities (including variations and major cities)
    const nonUSCities = [
        'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary', 'edmonton',
        'london', 'manchester', 'birmingham', 'glasgow', 'liverpool', 'bristol',
        'berlin', 'munich', 'hamburg', 'cologne', 'frankfurt',
        'amsterdam', 'rotterdam', 'the hague',
        'stockholm', 'gothenburg', 'malmo',
        'copenhagen', 'aarhus', 'odense',
        'helsinki', 'espoo', 'tampere',
        'oslo', 'bergen', 'trondheim',
        'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide',
        'bangalore', 'bengaluru', 'mumbai', 'bombay', 'delhi', 'new delhi',
        'hyderabad', 'pune', 'chennai', 'madras', 'kolkata', 'calcutta',
        'ahmedabad', 'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur',
        'singapore', 'tokyo', 'osaka', 'kyoto', 'yokohama', 'nagoya',
        'seoul', 'busan', 'incheon', 'daegu', 'daejeon',
        'tel aviv', 'jerusalem', 'haifa', 'beer sheva',
        'zurich', 'geneva', 'basel', 'bern',
        'dublin', 'cork', 'galway', 'limerick',
        'tallinn', 'tartu', 'riga', 'vilnius', 'kaunas',
        'prague', 'brno', 'ostrava', 'budapest', 'debrecen',
        'paris', 'marseille', 'lyon', 'toulouse', 'nice',
        'madrid', 'barcelona', 'valencia', 'seville', 'bilbao',
        'rome', 'milan', 'naples', 'turin', 'palermo',
        'warsaw', 'krakow', 'gdansk', 'wroclaw', 'poznan',
        'moscow', 'st petersburg', 'novosibirsk', 'yekaterinburg',
        'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu',
        'kyiv', 'kiev', 'kharkiv', 'odesa', 'dnipro',
        'belgrade', 'novi sad', 'nis'
    ];
    
    // Check if city contains any non-US cities
    if (nonUSCities.some(nonUSCity => cleanCity.includes(nonUSCity))) {
        return false;
    }
    
    // Handle "Remote - [Country]" patterns
    if (cleanCity.includes('remote') && nonUSCountries.some(country => cleanCity.includes(country))) {
        return false;
    }
    
    if (cleanState.includes('remote') && nonUSCountries.some(country => cleanState.includes(country))) {
        return false;
    }
    
    // US country indicators in state field (since country info appears in state)
    const usCountryIndicators = [
        'us', 'usa', 'united states', 'united states of america', 'america'
    ];
    
    // If state contains US indicators
    if (usCountryIndicators.some(indicator => cleanState.includes(indicator))) {
        return true;
    }
    
    // US state codes and full names
    const usStates = [
        // State codes
        'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia',
        'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj',
        'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt',
        'va', 'wa', 'wv', 'wi', 'wy', 'dc',
        // Full state names
        'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut',
        'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
        'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
        'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire',
        'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
        'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
        'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia',
        'wisconsin', 'wyoming', 'district of columbia'
    ];
    
    // Check if state matches US states
    if (usStates.some(usState => cleanState === usState || cleanState.includes(usState))) {
        return true;
    }
    
    // Major US cities (to catch cases where state might be missing or incorrect)
    const majorUSCities = [
        'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia',
        'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'jacksonville',
        'fort worth', 'columbus', 'charlotte', 'san francisco', 'indianapolis',
        'seattle', 'denver', 'washington', 'boston', 'el paso', 'detroit', 'nashville',
        'portland', 'memphis', 'oklahoma city', 'las vegas', 'louisville', 'baltimore',
        'milwaukee', 'albuquerque', 'tucson', 'fresno', 'sacramento', 'kansas city',
        'mesa', 'atlanta', 'colorado springs', 'raleigh', 'omaha', 'miami', 'oakland',
        'tulsa', 'cleveland', 'wichita', 'arlington', 'new orleans', 'bakersfield',
        'tampa', 'honolulu', 'aurora', 'anaheim', 'santa ana', 'corpus christi',
        'riverside', 'lexington', 'stockton', 'toledo', 'saint paul', 'newark',
        'greensboro', 'plano', 'henderson', 'lincoln', 'buffalo', 'jersey city',
        'chula vista', 'fort wayne', 'orlando', 'st petersburg', 'chandler',
        'laredo', 'norfolk', 'durham', 'madison', 'lubbock', 'irvine', 'winston salem',
        'glendale', 'garland', 'hialeah', 'reno', 'chesapeake', 'gilbert', 'baton rouge',
        'irving', 'scottsdale', 'north las vegas', 'fremont', 'boise', 'richmond',
        'san bernardino', 'birmingham', 'spokane', 'rochester', 'des moines', 'modesto',
        'fayetteville', 'tacoma', 'oxnard', 'fontana', 'columbus', 'montgomery',
        'moreno valley', 'shreveport', 'aurora', 'yonkers', 'akron', 'huntington beach',
        'little rock', 'augusta', 'amarillo', 'glendale', 'mobile', 'grand rapids',
        'salt lake city', 'tallahassee', 'huntsville', 'grand prairie', 'knoxville',
        'worcester', 'newport news', 'brownsville', 'santa clarita', 'providence',
        'fort lauderdale', 'chattanooga', 'oceanside', 'jackson', 'garden grove',
        'rancho cucamonga', 'port st lucie', 'tempe', 'ontario', 'vancouver',
        'cape coral', 'sioux falls', 'springfield', 'peoria', 'pembroke pines',
        'elk grove', 'salem', 'lancaster', 'corona', 'eugene', 'palmdale', 'salinas',
        'springfield', 'pasadena', 'fort collins', 'hayward', 'pomona', 'cary',
        'rockford', 'alexandria', 'escondido', 'mckinney', 'kansas city', 'joliet',
        'sunnyvale', 'torrance', 'bridgeport', 'lakewood', 'hollywood', 'paterson',
        'naperville', 'syracuse', 'mesquite', 'dayton', 'savannah', 'clarksville',
        'orange', 'pasadena', 'fullerton', 'killeen', 'frisco', 'hampton',
        'mcallen', 'warren', 'bellevue', 'west valley city', 'columbia', 'olathe',
        'sterling heights', 'new haven', 'miramar', 'waco', 'thousand oaks',
        'cedar rapids', 'charleston', 'visalia', 'topeka', 'elizabeth', 'gainesville',
        'thornton', 'roseville', 'carrollton', 'coral springs', 'stamford', 'simi valley',
        'concord', 'hartford', 'kent', 'lafayette', 'midland', 'surprise', 'denton',
        'victorville', 'evansville', 'santa clara', 'abilene', 'athens', 'vallejo',
        'allentown', 'norman', 'beaumont', 'independence', 'murfreesboro', 'ann arbor',
        'fargo', 'wilmington', 'golden valley', 'pearland', 'richardson', 'broken arrow',
        'richmond', 'college station', 'league city', 'sugar land', 'lakeland',
        'duluth', 'woodbridge', 'charleston'
    ];
    
    // Check if city matches major US cities
    if (majorUSCities.some(usCity => cleanCity.includes(usCity))) {
        return true;
    }
    
    // Handle remote jobs - assume US remote unless specified otherwise
    if (cleanCity.includes('remote') && !cleanCity.includes('-') && !cleanState.includes('-')) {
        return true;
    }
    
    if (cleanState.includes('remote') && !cleanState.includes('-')) {
        return true;
    }
    
    // Handle "United States" variations in state field (main case since country info is in state)
    if (cleanState.includes('united states')) {
        return true;
    }
    
    // If both city and state are empty, can't determine - exclude for safety
    if (!cleanCity && !cleanState) {
        return false;
    }
    
    // Default to exclude if we can't determine (changed from include to be more selective)
    return false;
}

function getExperienceLevel(title, description = "") {
  const text = `${title} ${description}`.toLowerCase();

  // Senior level indicators
  if (
    text.includes("senior") ||
    text.includes("sr.") ||
    text.includes("lead") ||
    text.includes("principal") ||
    text.includes("staff") ||
    text.includes("architect")
  ) {
    return "Senior";
  }

  // Entry level indicators
  if (
    text.includes("entry") ||
    text.includes("junior") ||
    text.includes("jr.") ||
    text.includes("new grad") ||
    text.includes("graduate") ||
    text.includes("university grad") ||
    text.includes("college grad") ||
    text.includes(" grad ") ||
    text.includes("recent grad") ||
    text.includes("intern") ||
    text.includes("associate") ||
    text.includes("level 1") ||
    text.includes("l1") ||
    text.includes("campus") ||
    text.includes("student") ||
    text.includes("early career") ||
    text.includes("0-2 years")
  ) {
    return "Entry-Level";
  }

  return "Mid-Level";
}

function getJobCategory(title, description = "") {
  const text = `${title} ${description}`.toLowerCase();

  if (
    text.includes("ios") ||
    text.includes("android") ||
    text.includes("mobile") ||
    text.includes("react native")
  ) {
    return "Mobile Development";
  }
  if (
    text.includes("frontend") ||
    text.includes("front-end") ||
    text.includes("react") ||
    text.includes("vue") ||
    text.includes("ui")
  ) {
    return "Frontend Development";
  }
  if (
    text.includes("backend") ||
    text.includes("back-end") ||
    text.includes("api") ||
    text.includes("server")
  ) {
    return "Backend Development";
  }
  if (
    text.includes("machine learning") ||
    text.includes("ml ") ||
    text.includes("ai ") ||
    text.includes("artificial intelligence") ||
    text.includes("deep learning")
  ) {
    return "Machine Learning & AI";
  }
  if (
    text.includes("data scientist") ||
    text.includes("data analyst") ||
    text.includes("analytics") ||
    text.includes("data engineer")
  ) {
    return "Data Science & Analytics";
  }
  if (
    text.includes("devops") ||
    text.includes("infrastructure") ||
    text.includes("cloud") ||
    text.includes("platform")
  ) {
    return "DevOps & Infrastructure";
  }
  if (
    text.includes("security") ||
    text.includes("cybersecurity") ||
    text.includes("infosec")
  ) {
    return "Security Engineering";
  }
  if (
    text.includes("product manager") ||
    text.includes("product owner") ||
    text.includes("pm ")
  ) {
    return "Product Management";
  }
  if (text.includes("design") || text.includes("ux") || text.includes("ui")) {
    return "Design";
  }
  if (text.includes("full stack") || text.includes("fullstack")) {
    return "Full Stack Development";
  }

  return "Software Engineering";
}

function formatLocation(city, state) {
  if (!city && !state) return "Remote";
  if (!city) return state;
  if (!state) return city;
  if (city.toLowerCase() === "remote") return "Remote 🏠";
  return `${city}, ${state}`;
}

// Fetch internship data from popular sources
async function fetchInternshipData() {
  console.log("🎓 Fetching 2025/2026 internship opportunities...");

  const internships = [];

  // Popular internship tracking repositories and sources
  const internshipSources = [
    {
      name: "AngelList Internships",
      emogi: "👼",
      url: "https://wellfound.com/jobs#internships",
      type: "Job Board",
      description: "Trending startup internships and entry-level roles",
    },
    {
      name: "LinkedIn Student Jobs",
      emogi: "🔗",
      url: "https://www.linkedin.com/jobs/search/?currentJobId=4292794755&geoId=103644278&keywords=data%20science%20intern&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true",
      type: "Platform",
      description: "New Jobs and professional networking for students",
    },
    {
      name: "Indeed Internships",
      emogi: "🔵",
      url: "https://www.indeed.com/jobs?q=data%20science%20intern&l=United%20States&from=searchOnDesktopSerp%2Cwhereautocomplete&cf-turnstile-response=0.ZJCZbNXcxcvufJaZndsqVZt_cKlKAHi24tPPk6n9v399nZHXwzLOL8P43R6ir2fKfa6BvndTrPbW_cSnPqQyLnard6MNWqZbqAcRe5Xk6qhevasj90JYORHAWNaztKmx71uUniLoCEo_csEXBvZ8awZ5F6IhXpAJC8gF-R44ir09b9w3x16auEKJdPpnf5UyLmhezEgeMSGRUwbmFNrs5iDWupecoRzbvKgf8EBnzD4k8SJIERx3rCt92k0OksFz7C_X2N4lUEjqiLSb9ZI2J7wUmUMQf2l7keXpf2uMdbIuBkxpUj3cpyiK87Wj5fi-v9yDE9U1Sd8sm-jD6TASVUgF_6KvV3SwMMLErS8fhWNCuiGu3Tk-zk354ovM_cskTBRnaCLVHeUucoHiLJGE61X9NYHCIY4HJMxXlR6BcLdMwSgAIlPqtQVzolpCsrOHWrAD3SAiD7OKFX2rtm3YGTk7pRjDURwg-uia-yoLCWrqOyTI8cfPes4J5VxguGJGqb2A7KVow3x54UjuVBxHPljJ4a_rKTd5qzshvas4FqM35um5CmVTVrQJfuzAZBSp_72nOEwtVpwrfu_Ff39EPAb1c-IVifGhtpPq7ceWOM6_w4s96HAhHiCskNy8BbhcqHCOohxXYWw3o2VFEMdOIUp9SLWv19GpaZAU3rdE--GosWrdamyZ5-nwYRg_FJ3r7cmCCRi8CAKqp4uoTxgYYtSs_eTBleyPOdMU0v0iNskpU5T-hViWduBKcCr5ouXa82fRBt-9zw7aymZdwWVaJRcUiTDrdGtes53XJy2Ub1sAoCEI9UCeEhRJGeO2D1sp2crya84ADsBmSuk4Q0pplaRV_u2fc9gHKfW098qNVxTBcxhXgt8YKoRpVPkMPVLaHePlyHySFqV42xEqjLsMwz7eCb4OyAK-YO22C-V-T1Xg73nDf0fHRT2GAy5TXRdM.5QbZ9QPdwp8M71i25CqN1g.c4b098184b3143ef21e5dad9abb502f3444659952a73cbd8c95694153a14ae72",
      type: "Job Board",
      description: "Comprehensive internship search engine",
    },
    {
      name: "Glassdoor Internships",
      emogi: "🏢",
      url: "https://www.glassdoor.com/Job/united-states-data-Science-intern-jobs-SRCH_IL.0,13_IN1_KO14,38.htm",
      type: "Job Board",
      description: "Internships with company reviews and salary data",
    },
    {
      name: "University Career Centers",
      emogi: "🏫",
      url: "https://www.naceweb.org/tag/internships",
      type: "Resource",
      description: "National Association of Colleges and Employers",
    },
  ];

  // Add company-specific internship programs
  const companyInternshipPrograms = [
    {
      company: "Google",
      emogi: "🟢",
      program: "STEP Internship",
      url: "https://careers.google.com/students/",
      deadline: "Various",
    },
    {
      company: "Microsoft",
      emogi: "🟦",
      program: "Software Engineering Internship",
      url: "https://careers.microsoft.com/students",
      deadline: "Various",
    },
    {
      company: "Meta",
      emogi: "🔵",
      program: "Software Engineer Internship",
      url: "https://www.metacareers.com/careerprograms/students",
      deadline: "Various",
    },
    {
      company: "Amazon",
      emogi: "📦",
      program: "SDE Internship",
      url: "https://www.amazon.jobs/en/teams/internships-for-students",
      deadline: "Various",
    },
    {
      company: "Apple",
      emogi: "🍎",
      program: "Software Engineering Internship",
      url: "https://jobs.apple.com/en-us/search?search=Data+Science&sort=relevance&location=united-states-USA&team=internships-STDNT-INTRN",
      deadline: "Various",
    },
    {
      company: "Netflix",
      emogi: "🎬",
      program: "Software Engineering Internship",
      url: "https://explore.jobs.netflix.net/careers?query=DataScience%20internship&pid=790302560337&domain=netflix.com&sort_by=relevance&triggerGoButton=false",
      deadline: "Various",
    },
    {
      company: "Tesla",
      emogi: "⚡",
      program: "Software Engineering Internship",
      url: "https://www.tesla.com/careers/search/?query=DataScience%20intern&site=US",
      deadline: "Various",
    },
    {
      company: "Nvidia",
      emogi: "🎮",
      program: "Software Engineering Internship",
      url: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite?q=Data+Science+intern&locationHierarchy1=2fcb99c455831013ea52fb338f2932d8",
      deadline: "Various",
    },
    {
      company: "Stripe",
      emogi: "💳",
      program: "Software Engineering Internship",
      url: "https://stripe.com/jobs/search?query=Data+Science+intern&remote_locations=North+America--US+Remote&office_locations=North+America--New+York&office_locations=North+America--New+York+Privy+HQ&office_locations=North+America--San+Francisco+Bridge+HQ&office_locations=North+America--Seattle&office_locations=North+America--South+San+Francisco&office_locations=North+America--Washington+DC",
      deadline: "Various",
    },
    {
      company: "Coinbase",
      emogi: "₿",
      program: "Software Engineering Internship",
      url: "https://www.coinbase.com/careers/positions?search=DataScience%2520internship",
      deadline: "Various",
    },
  ];

  return {
    sources: internshipSources,
    companyPrograms: companyInternshipPrograms,
    lastUpdated: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

module.exports = {
  companies,
  ALL_COMPANIES,
  COMPANY_BY_NAME,
  delay,
  generateJobId,
  migrateOldJobId,
  normalizeCompanyName,
  getCompanyEmoji,
  getCompanyCareerUrl,
  formatTimeAgo,
  isJobOlderThanWeek,
  isUSOnlyJob,
  getExperienceLevel,
  getJobCategory,
  formatLocation,
  filterJobsByLevel,
  fetchInternshipData,
};