const fs = require("fs");
const { generateJobId } = require("./job-fetcher/utils");
const {isUSOnlyJob} = require("./job-fetcher/utils");
const {filterJobsByLevel} =require("./job-fetcher/utils")
const { scrapeCompanyData } = require('../../jobboard/src/backend/core/scraper.js');
const { getCompanies } = require('../../jobboard/src/backend/config/companies.js');
const { transformJobs } = require('../../jobboard/src/backend/output/jobTransformer.js');


// Batch processing configuration
const BATCH_CONFIG = {
  batchSize: 10,                   // Increased from 5 to 10 for better parallelization
  delayBetweenBatches: 1000,       // Reduced from 2000ms to 1000ms
  maxRetries: 1,                   // Reduced from 2 to 1 (most failures are persistent)
  timeout: 120000,                 // Reduced from 900000ms (15min) to 120000ms (2min)
  enableProgressBar: true,         // Enable progress tracking
  enableDetailedLogging: true      // Enable detailed logging for each scraper
};

// Function to create custom batch configuration
function createBatchConfig(options = {}) {
  return {
    ...BATCH_CONFIG,
    ...options
  };
}

// Load company database
// const companies = JSON.parse(
//   fs.readFileSync("./companies.json", "utf8")
// );
// const ALL_COMPANIES = Object.values(companies).flat();

// Real career page endpoints for major companies
const CAREER_APIS = {
  // Greenhouse API Companies
  Stripe: {
    api: "https://api.greenhouse.io/v1/boards/stripe/jobs",
    method: "GET",
    parser: (data) => {
      if (!Array.isArray(data.jobs)) return [];
      return data.jobs
        .filter(
          (job) =>
            job.title.toLowerCase().includes("data") ||
            job.title.toLowerCase().includes("analyst") ||
            job.title.toLowerCase().includes("scientist") ||
            job.title.toLowerCase().includes("machine learning")
        )
        .map((job) => ({
          job_title: job.title,
          employer_name: "Stripe",
          job_city: job.location?.name?.split(", ")?.[0] || "San Francisco",
          job_state: job.location?.name?.split(", ")?.[1] || "CA",
          job_description:
            job.content ||
            "Join Stripe to help build the economic infrastructure for the internet.",
          job_apply_link: job.absolute_url,
          job_posted_at_datetime_utc: safeISOString(job.updated_at),
          job_employment_type: "FULLTIME",
        }));
    },
  },

  Coinbase: {
    api: "https://api.greenhouse.io/v1/boards/coinbase/jobs",
    method: "GET",
    parser: (data) => {
      if (!Array.isArray(data.jobs)) return [];
      return data.jobs
        .filter(
          (job) =>
            job.title.toLowerCase().includes("data") ||
            job.title.toLowerCase().includes("analyst") ||
            job.title.toLowerCase().includes("scientist") ||
            job.title.toLowerCase().includes("machine learning")
        )
        .map((job) => ({
          job_title: job.title,
          employer_name: "Coinbase",
          job_city: job.location?.name?.split(", ")?.[0] || "San Francisco",
          job_state: job.location?.name?.split(", ")?.[1] || "CA",
          job_description:
            job.content ||
            "Join Coinbase to build the future of cryptocurrency.",
          job_apply_link: job.absolute_url,
          job_posted_at_datetime_utc: safeISOString(job.updated_at),
          job_employment_type: "FULLTIME",
        }));
    },
  },

  Airbnb: {
    api: "https://api.greenhouse.io/v1/boards/airbnb/jobs",
    method: "GET",
    parser: (data) => {
      if (!Array.isArray(data.jobs)) return [];
      return data.jobs
        .filter(
          (job) =>
            job.title.toLowerCase().includes("data") ||
            job.title.toLowerCase().includes("analyst") ||
            job.title.toLowerCase().includes("scientist") ||
            job.title.toLowerCase().includes("machine learning")
        )
        .map((job) => ({
          job_title: job.title,
          employer_name: "Airbnb",
          job_city: job.location?.name?.split(", ")?.[0] || "San Francisco",
          job_state: job.location?.name?.split(", ")?.[1] || "CA",
          job_description:
            job.content ||
            "Join Airbnb to create a world where anyone can belong anywhere.",
          job_apply_link: job.absolute_url,
          job_posted_at_datetime_utc: safeISOString(job.updated_at),
          job_employment_type: "FULLTIME",
        }));
    },
  },

  Databricks: {
    api: "https://api.greenhouse.io/v1/boards/databricks/jobs",
    method: "GET",
    parser: (data) => {
      if (!Array.isArray(data.jobs)) return [];
      return data.jobs
        .filter(
          (job) =>
            job.title.toLowerCase().includes("data") ||
            job.title.toLowerCase().includes("analyst") ||
            job.title.toLowerCase().includes("scientist") ||
            job.title.toLowerCase().includes("machine learning")
        )
        .map((job) => ({
          job_title: job.title,
          employer_name: "Databricks",
          job_city: job.location?.name?.split(", ")?.[0] || "San Francisco",
          job_state: job.location?.name?.split(", ")?.[1] || "CA",
          job_description:
            job.content || "Join Databricks to unify analytics and AI.",
          job_apply_link: job.absolute_url,
          job_posted_at_datetime_utc: safeISOString(job.updated_at),
          job_employment_type: "FULLTIME",
        }));
    },
  },

  Figma: {
    api: "https://api.greenhouse.io/v1/boards/figma/jobs",
    method: "GET",
    parser: (data) => {
      if (!Array.isArray(data.jobs)) return [];
      return data.jobs
        .filter(
          (job) =>
            job.title.toLowerCase().includes("data") ||
            job.title.toLowerCase().includes("analyst") ||
            job.title.toLowerCase().includes("scientist") ||
            job.title.toLowerCase().includes("machine learning")
        )
        .map((job) => ({
          job_title: job.title,
          employer_name: "Figma",
          job_city: job.location?.name?.split(", ")?.[0] || "San Francisco",
          job_state: job.location?.name?.split(", ")?.[1] || "CA",
          job_description:
            job.content || "Join Figma to make design accessible to all.",
          job_apply_link: job.absolute_url,
          job_posted_at_datetime_utc: safeISOString(job.updated_at),
          job_employment_type: "FULLTIME",
        }));
    },
  },

  // Custom API Companies
  Apple: {
    api: "https://jobs.apple.com/api/v1/search",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: "engineer",
      filters: {
        locations: ["postLocation-USA"],
      },
      page: 1,
      locale: "en-us",
      sort: "newest",
      format: {
        longDate: "MMMM D, YYYY",
        mediumDate: "MMM D, YYYY",
      },
    }),
    parser: (data) => {
      if (!data.searchResults) return [];
      return data.searchResults.slice(0, 20).map((job) => ({
        job_title: job.postingTitle,
        employer_name: "Apple",
        job_city: job.locations?.[0]?.name?.split(", ")?.[0] || "Cupertino",
        job_state: job.locations?.[0]?.name?.split(", ")?.[1] || "CA",
        job_description:
          job.jobSummary || "Join Apple to create products that change lives.",
        job_apply_link: `https://jobs.apple.com/en-us/details/${job.positionId}`,
        job_posted_at_datetime_utc: safeISOString(job.postDateInGMT),
        job_employment_type: "FULLTIME",
      }));
    },
  },

  Microsoft: {
    api: "https://gcsservices.careers.microsoft.com/search/api/v1/search?l=en_us&pg=1&pgSz=20&o=Recent&flt=true",
    method: "GET",
    parser: (data) => {
      if (!data.operationResult?.result?.jobs) return [];
      return data.operationResult.result.jobs
        .filter(
          (job) =>
            job.title.toLowerCase().includes("data") ||
            job.title.toLowerCase().includes("analyst") ||
            job.title.toLowerCase().includes("scientist") ||
            job.title.toLowerCase().includes("machine learning")
        )
        .map((job) => ({
          job_title: job.title,
          employer_name: "Microsoft",
          job_city: job.primaryLocation?.city || "Redmond",
          job_state: job.primaryLocation?.state || "WA",
          job_description:
            job.description ||
            "Join Microsoft to empower every person and organization on the planet.",
          job_apply_link: `https://jobs.careers.microsoft.com/global/en/job/${job.jobId}`,
          job_posted_at_datetime_utc: safeISOString(job.postedDate),
          job_employment_type: "FULLTIME",
        }));
    },
  },

  // Amazon now uses dedicated scraper

  Netflix: {
    api: "https://explore.jobs.netflix.net/api/apply/v2/jobs?domain=netflix.com&query=data",
    method: "GET",
    pagination: true,
    parser: (data) => {
      if (!data.positions) return [];

      // Filter for fresh jobs from past week and data science roles
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      return data.positions
        .filter((job) => {
          const isDataScience =
            job.name.toLowerCase().includes("data") ||
            job.name.toLowerCase().includes("analyst") ||
            job.name.toLowerCase().includes("scientist") ||
            job.name.toLowerCase().includes("machine learning");
          const isFresh = job.t_create * 1000 > oneWeekAgo;
          return isDataScience && isFresh;
        })
        .map((job) => ({
          job_title: job.name,
          employer_name: "Netflix",
          job_city: job.location?.split(",")?.[0] || "Los Gatos",
          job_state: job.location?.split(", ")?.[1] || "CA",
          job_description:
            job.job_description || "Join Netflix to entertain the world.",
          job_apply_link: job.canonicalPositionUrl,
          job_posted_at_datetime_utc: safeISOString(job.t_create * 1000),
          job_employment_type: "FULLTIME",
        }));
    },
  },

  Qualcomm: {
    api: "https://careers.qualcomm.com/api/apply/v2/jobs?domain=qualcomm.com&num=20&query=USA&sort_by=relevance",
    method: "GET",
    parser: (data) => {
      if (!data.positions) return [];
      return data.positions
        .filter(
          (job) =>
            job.name.toLowerCase().includes("data") ||
            job.name.toLowerCase().includes("analyst") ||
            job.name.toLowerCase().includes("scientist") ||
            job.name.toLowerCase().includes("machine learning")
        )
        .map((job) => ({
          job_title: job.name,
          employer_name: "Qualcomm",
          job_city: job.location?.split(", ")?.[0] || "San Diego",
          job_state: job.location?.split(", ")?.[1] || "CA",
          job_description:
            job.description ||
            "Join Qualcomm to invent breakthrough technologies.",
          job_apply_link: job.canonicalPositionUrl,
          job_posted_at_datetime_utc: safeISOString(job.publishedDate),
          job_employment_type: "FULLTIME",
        }));
    },
  },

  PayPal: {
    api: "https://paypal.eightfold.ai/api/apply/v2/jobs?domain=paypal.com&num=20&location=USA&sort_by=relevance",
    method: "GET",
    parser: (data) => {
      if (!data.positions) return [];
      return data.positions
        .filter(
          (job) =>
            job.name.toLowerCase().includes("data") ||
            job.name.toLowerCase().includes("analyst") ||
            job.name.toLowerCase().includes("scientist") ||
            job.name.toLowerCase().includes("machine learning")
        )
        .map((job) => ({
          job_title: job.name,
          employer_name: "PayPal",
          job_city: job.location?.split(", ")?.[0] || "San Jose",
          job_state: job.location?.split(", ")?.[1] || "CA",
          job_description:
            job.description || "Join PayPal to democratize financial services.",
          job_apply_link: job.canonicalPositionUrl,
          job_posted_at_datetime_utc: safeISOString(job.publishedDate),
          job_employment_type: "FULLTIME",
        }));
    },
  },

  // Lever API Companies
  // Uber now uses dedicated scraper

  Discord: {
    api: "https://boards-api.greenhouse.io/v1/boards/discord/jobs",
    method: "GET",
    parser: (data) => {
      if (!Array.isArray(data.jobs)) return [];
      return data.jobs
        .filter(
          (job) =>
            job.title.toLowerCase().includes("data") ||
            job.title.toLowerCase().includes("analyst") ||
            job.title.toLowerCase().includes("scientist") ||
            job.title.toLowerCase().includes("machine learning")
        )
        .map((job) => ({
          job_title: job.title,
          employer_name: "Discord",
          job_city: job.location?.name?.split(", ")?.[0] || "San Francisco",
          job_state: job.location?.name?.split(", ")?.[1] || "CA",
          job_description: job.content || "Join Discord to build connections.",
          job_apply_link: job.absolute_url,
          job_posted_at_datetime_utc: safeISOString(job.updated_at),
          job_employment_type: "FULLTIME",
        }));
    },
  },

  Lyft: {
    api: "https://boards-api.greenhouse.io/v1/boards/lyft/jobs",
    method: "GET",
    parser: (data) => {
      if (!Array.isArray(data.jobs)) return [];
      return data.jobs
        .filter(
          (job) =>
            job.title.toLowerCase().includes("data") ||
            job.title.toLowerCase().includes("analyst") ||
            job.title.toLowerCase().includes("scientist") ||
            job.title.toLowerCase().includes("machine learning")
        )
        .map((job) => ({
          job_title: job.title,
          employer_name: "Lyft",
          job_city: job.location?.name?.split(", ")?.[0] || "San Francisco",
          job_state: job.location?.name?.split(", ")?.[1] || "CA",
          job_description:
            job.content ||
            "Join Lyft to improve people's lives with the world's best transportation.",
          job_apply_link: job.absolute_url,
          job_posted_at_datetime_utc: safeISOString(job.updated_at),
          job_employment_type: "FULLTIME",
        }));
    },
  },

  // Slack now uses dedicated scraper
};

// Utility functions
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeISOString(dateValue) {
  if (!dateValue) return new Date().toISOString();

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

// Fetch jobs from a specific company's career API
async function fetchCompanyJobs(companyName) {
  const config = CAREER_APIS[companyName];
  if (!config) {
    console.log(`⚠️ No API config for ${companyName}`);
    return [];
  }

  try {
    console.log(`🔍 Fetching jobs from ${companyName}...`);

    const options = {
      method: config.method,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        ...config.headers,
      },
    };

    if (config.body) {
      options.body = config.body;
    }

    const response = await fetch(config.api, options);

    if (!response.ok) {
      console.log(`❌ ${companyName} API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    const jobs = config.parser(data);

    console.log(`✅ Found ${jobs.length} jobs at ${companyName}`);
    return jobs;
  } catch (error) {
    console.error(`❌ Error fetching ${companyName} jobs:`, error.message);
    return [];
  }
}

// No sample jobs - only real API data

// Fetch jobs from SimplifyJobs public data
async function fetchSimplifyJobsData() {
  try {
    console.log("📡 Fetching data from public sources...");

    const newGradUrl =
      "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json";
    const response = await fetch(newGradUrl);

    if (!response.ok) {
      console.log(`⚠️ Could not fetch external data: ${response.status}`);
      return [];
    }

    const data = await response.json();

    const activeJobs = data
      .filter(
        (job) =>
          job.active &&
          job.url &&
          (job.title.toLowerCase().includes("data") ||
            job.title.toLowerCase().includes("analyst") ||
            job.title.toLowerCase().includes("scientist") ||
            job.title.toLowerCase().includes("machine learning"))
      )
      .map((job) => ({
        job_title: job.title,
        employer_name: job.company_name,
        job_city: job.locations?.[0]?.split(", ")?.[0] || "Multiple",
        job_state: job.locations?.[0]?.split(", ")?.[1] || "Locations",
        job_description: `Join ${job.company_name} in this exciting data science opportunity.`,
        job_apply_link: job.url,
        job_posted_at_datetime_utc: safeISOString(job.date_posted * 1000),
        job_employment_type: "FULLTIME",
      }));

    console.log(
      `📋 Found ${activeJobs.length} active data science positions from external sources`
    );
    return activeJobs;
  } catch (error) {
    console.error(`❌ Error fetching external data:`, error.message);
    return [];
  }
}

// Fetch jobs from all companies with real career APIs

async function fetchAllRealJobs(searchQuery = 'data science', maxPages = 3, batchConfig = BATCH_CONFIG) {
  console.log("🚀 Starting optimized job fetching pipeline...");

  let allJobs = [];
  const processedJobIds = new Set(); // Track all processed job IDs

  // Track job IDs for duplicate counting (not filtering)
  // We now return ALL jobs and let job-processor.js handle filtering
  const fs = require('fs');
  const path = require('path');
  try {
    const seenJobsPath = path.join(process.cwd(), '.github', 'data', 'seen_jobs.json');
    if (fs.existsSync(seenJobsPath)) {
      const seenJobs = JSON.parse(fs.readFileSync(seenJobsPath, 'utf8'));
      seenJobs.forEach(id => processedJobIds.add(id));
      console.log(`📚 Loaded ${processedJobIds.size} previously seen jobs for duplicate tracking (not filtering)`);
    }
  } catch (err) {
    console.log(`⚠️ Could not load seen jobs for tracking: ${err.message}`);
  }

  // ===== PHASE 1: API-BASED COMPANIES (NO PUPPETEER) =====
  console.log('\n📡 PHASE 1: Fetching from API-based companies (no browser needed)...');
  const companiesWithAPIs = Object.keys(CAREER_APIS);
  console.log(`   Found ${companiesWithAPIs.length} companies with direct API access`);

  let apiJobsCollected = 0;
  const apiStartTime = Date.now();

  for (const company of companiesWithAPIs) {
    try {
      const jobs = await fetchCompanyJobs(company);
      if (jobs && jobs.length > 0) {
        const transformedAPIJobs = transformJobs(jobs, searchQuery);

        // Track duplicates but add ALL jobs
        let newCount = 0;
        let dupeCount = 0;

        transformedAPIJobs.forEach(job => {
          const jobId = generateJobId(job);
          if (processedJobIds.has(jobId)) {
            dupeCount++;
          } else {
            processedJobIds.add(jobId);
            newCount++;
          }
        });

        // Add ALL jobs regardless of duplicate status
        allJobs.push(...transformedAPIJobs);
        apiJobsCollected += transformedAPIJobs.length;
        console.log(`   ✅ ${company}: ${transformedAPIJobs.length} jobs (${newCount} new, ${dupeCount} seen)`);
      }

      await delay(1000); // Shorter delay for API calls
    } catch (apiError) {
      console.error(`   ❌ ${company} failed: ${apiError.message}`);
    }
  }

  const apiDuration = ((Date.now() - apiStartTime) / 1000).toFixed(1);
  console.log(`✅ Phase 1 Complete: ${apiJobsCollected} jobs in ${apiDuration}s\n`);

  // ===== PHASE 2: EXTERNAL SOURCES =====
  console.log('📡 PHASE 2: Fetching from external sources...');
  let externalJobsCollected = 0;
  try {
    const externalJobs = await fetchSimplifyJobsData();
    if (externalJobs && externalJobs.length > 0) {
      const transformedExternalJobs = transformJobs(externalJobs, searchQuery);

      // Track duplicates but add ALL jobs
      let newCount = 0;
      let dupeCount = 0;

      transformedExternalJobs.forEach(job => {
        const jobId = generateJobId(job);
        if (processedJobIds.has(jobId)) {
          dupeCount++;
        } else {
          processedJobIds.add(jobId);
          newCount++;
        }
      });

      // Add ALL jobs regardless of duplicate status
      allJobs.push(...transformedExternalJobs);
      externalJobsCollected = transformedExternalJobs.length;
      console.log(`✅ Phase 2 Complete: ${transformedExternalJobs.length} external jobs (${newCount} new, ${dupeCount} seen)\n`);
    }
  } catch (externalError) {
    console.error('❌ External sources failed:', externalError.message);
  }

  // ===== PHASE 3: PUPPETEER-BASED SCRAPING =====
  console.log("🌐 PHASE 3: Starting Puppeteer-based scraping...");

  const companies = getCompanies(searchQuery);
  const companyKeys = Object.keys(companies);

  // Filter out companies that already have APIs
  const scrapingCompanies = companyKeys.filter(key =>
    !companiesWithAPIs.includes(companies[key].name)
  );

  console.log(`   ${scrapingCompanies.length} companies need Puppeteer scraping`);
  console.log(`   ${companiesWithAPIs.length} companies already processed via API`);

  // Define scraper configurations for batch processing
  const scraperConfigs = scrapingCompanies.map(companyKey => ({
    name: companies[companyKey].name,
    companyKey: companyKey,
    scraper: () => scrapeCompanyData(companyKey, searchQuery, maxPages),
    query: searchQuery
  }));

  // Enhanced batch processing function with comprehensive tracking and error handling
  async function processScrapersInBatches(configs, config = batchConfig) {
    const results = [];
    const totalBatches = Math.ceil(configs.length / config.batchSize);
    const processedCompanies = new Set(); // Track processed companies to prevent duplicates
    
    // Enhanced tracking objects
    const overallProgress = {
      totalCompanies: configs.length,
      processedCompanies: 0,
      successfulCompanies: 0,
      failedCompanies: 0,
      skippedCompanies: 0,
      totalJobsCollected: 0,
      startTime: Date.now(),
      batchResults: []
    };

    const companiesStatus = {
      successful: [],
      failed: [],
      skipped: []
    };
    
    console.log(`🚀 Starting optimized batch processing:`);
    console.log(`   📊 Total scrapers: ${configs.length}`);
    console.log(`   📦 Batch size: ${config.batchSize} companies per batch`);
    console.log(`   ⏱️  Total batches: ${totalBatches}`);
    console.log(`   ⏳ Delay between batches: ${config.delayBetweenBatches}ms`);
    console.log(`   🔄 Max retries: ${config.maxRetries}`);
    console.log(`   🕐 Started at: ${new Date().toLocaleTimeString()}`);
    
    for (let i = 0; i < configs.length; i += config.batchSize) {
      const batch = configs.slice(i, i + config.batchSize);
      const batchNumber = Math.floor(i / config.batchSize) + 1;
      const batchStartTime = Date.now();
      
      console.log(`\n📦 Processing Batch ${batchNumber}/${totalBatches}: ${batch.map(c => c.name).join(', ')}`);
      
      // Filter out already processed companies
      const filteredBatch = batch.filter(scraperConfig => {
        if (processedCompanies.has(scraperConfig.companyKey)) {
          console.log(`⚠️ Skipping already processed company: ${scraperConfig.name}`);
          companiesStatus.skipped.push(scraperConfig.name);
          overallProgress.skippedCompanies++;
          return false;
        }
        processedCompanies.add(scraperConfig.companyKey);
        return true;
      });

      if (filteredBatch.length === 0) {
        console.log(`⏭️ Skipping batch ${batchNumber} - all companies already processed`);
        continue;
      }

      // Batch-level tracking
      const batchProgress = {
        batchNumber,
        companies: filteredBatch.map(c => c.name),
        successful: [],
        failed: [],
        totalJobs: 0,
        duration: 0,
        startTime: batchStartTime
      };

      // Process current batch concurrently with retry logic
      const batchPromises = filteredBatch.map(async (scraperConfig) => {
        let lastError = null;
        let startTime = Date.now();
        
        for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
          try {
            // Update startTime for each attempt
            startTime = Date.now();
            
           
            let jobs;
            if (config.timeout > 0) {
              // Timeout enabled
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Scraper timeout')), config.timeout);
              });
              
              jobs = await Promise.race([
                scraperConfig.scraper(),
                timeoutPromise
              ]);
            } else {
              // No timeout - wait indefinitely for the scraper to complete
              jobs = await scraperConfig.scraper();
            }
            
            const duration = Date.now() - startTime;
            overallProgress.processedCompanies++;
            overallProgress.successfulCompanies++;
            overallProgress.totalJobsCollected += jobs?.length || 0;
            
            // Track successful company
            const successInfo = {
              name: scraperConfig.name,
              jobs: jobs?.length || 0,
              duration,
              attempts: attempt
            };
            companiesStatus.successful.push(successInfo);
            batchProgress.successful.push(successInfo);
            batchProgress.totalJobs += jobs?.length || 0;
            
            if (config.enableDetailedLogging) {
              console.log(`✅ ${scraperConfig.name}: ${jobs?.length || 0} jobs in ${duration}ms (Attempt ${attempt})`);
            }
            
            return { 
              name: scraperConfig.name,
              companyKey: scraperConfig.companyKey,
              jobs: jobs || [], 
              duration, 
              success: true, 
              attempts: attempt,
              error: null 
            };
            
          } catch (error) {
            lastError = error;
            if (config.enableDetailedLogging) {
              console.log(`⚠️  ${scraperConfig.name} attempt ${attempt} failed: ${error.message}`);
            }
            
            // If this is the last attempt, mark as failed
            if (attempt === config.maxRetries) {
              const duration = Date.now() - startTime;
              overallProgress.processedCompanies++;
              overallProgress.failedCompanies++;
              
              // Track failed company
              const failInfo = {
                name: scraperConfig.name,
                error: error.message,
                duration,
                attempts: attempt
              };
              companiesStatus.failed.push(failInfo);
              batchProgress.failed.push(failInfo);
              
              console.error(`❌ ${scraperConfig.name} failed after ${config.maxRetries} attempts: ${error.message}. Skipping company.`);
              
              return { 
                name: scraperConfig.name,
                companyKey: scraperConfig.companyKey,
                jobs: [], 
                duration: duration, 
                success: false, 
                attempts: attempt,
                error: error.message 
              };
            }
            
            // Exponential backoff with jitter for retry delay
            const baseDelay = 2000 * Math.pow(2, attempt - 1);
            const jitter = Math.random() * 1000; // Add jitter to avoid thundering herd
            const retryDelay = Math.min(baseDelay + jitter, 10000); // Max 10s
            if (config.enableDetailedLogging) {
              console.log(`⏳ Retrying ${scraperConfig.name} in ${retryDelay.toFixed(0)}ms...`);
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      });
      
      // Wait for current batch to complete, with error tolerance (continue on individual failures)
      let batchResults;
      try {
        batchResults = await Promise.all(batchPromises);
      } catch (batchError) {
        console.error(`❌ Batch ${batchNumber} had an unhandled error: ${batchError.message}. Continuing with available results.`);
        batchResults = []; // Or collect partial if using allSettled
      }
      results.push(...batchResults.filter(result => result)); // Filter nulls if any
      
      // Complete batch tracking
      batchProgress.duration = Date.now() - batchStartTime;
      overallProgress.batchResults.push(batchProgress);
      
      // Enhanced progress reporting after each batch
      const progressPercent = ((overallProgress.processedCompanies / overallProgress.totalCompanies) * 100).toFixed(1);
      const elapsedTime = Date.now() - overallProgress.startTime;
      const avgTimePerCompany = overallProgress.processedCompanies > 0 ? elapsedTime / overallProgress.processedCompanies : 0;
      const estimatedTimeRemaining = avgTimePerCompany * (overallProgress.totalCompanies - overallProgress.processedCompanies);
      
      console.log(`\n🏁 Batch ${batchNumber}/${totalBatches} Completed in ${(batchProgress.duration/1000).toFixed(1)}s:`);
      console.log(`   ✅ Successful: ${batchProgress.successful.length} companies`);
      console.log(`   ❌ Failed: ${batchProgress.failed.length} companies`);
      console.log(`   📊 Jobs collected in this batch: ${batchProgress.totalJobs}`);
      
      if (batchProgress.successful.length > 0) {
        console.log(`   🎯 Successful companies: ${batchProgress.successful.map(s => `${s.name}(${s.jobs})`).join(', ')}`);
      }
      
      if (batchProgress.failed.length > 0) {
        console.log(`   💥 Failed companies: ${batchProgress.failed.map(f => `${f.name}(${f.error.substring(0, 30)}...)`).join(', ')}`);
      }
      
      console.log(`\n📈 Overall Progress: ${overallProgress.processedCompanies}/${overallProgress.totalCompanies} (${progressPercent}%)`);
      console.log(`   ✅ Total Successful: ${overallProgress.successfulCompanies}`);
      console.log(`   ❌ Total Failed: ${overallProgress.failedCompanies}`);
      console.log(`   ⏭️  Total Skipped: ${overallProgress.skippedCompanies}`);
      console.log(`   📊 Total Jobs Collected: ${overallProgress.totalJobsCollected}`);
      console.log(`   ⏱️  Elapsed Time: ${(elapsedTime/1000).toFixed(1)}s`);
      console.log(`   🔮 Estimated Time Remaining: ${(estimatedTimeRemaining/1000).toFixed(1)}s`);
      
      // Add delay between batches (except for the last batch)
      if (i + config.batchSize < configs.length) {
        console.log(`⏳ Waiting ${config.delayBetweenBatches}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches));
      }
    }
    
    // Final comprehensive summary
    const totalDuration = Date.now() - overallProgress.startTime;
    console.log(`\n🏆 ===== BATCH PROCESSING COMPLETE =====`);
    console.log(`🕐 Total Duration: ${(totalDuration/1000).toFixed(1)}s (${(totalDuration/60000).toFixed(1)} minutes)`);
    console.log(`📊 Final Statistics:`);
    console.log(`   📈 Total Companies Processed: ${overallProgress.processedCompanies}/${overallProgress.totalCompanies}`);
    console.log(`   ✅ Successful Companies: ${overallProgress.successfulCompanies} (${((overallProgress.successfulCompanies/overallProgress.totalCompanies)*100).toFixed(1)}%)`);
    console.log(`   ❌ Failed Companies: ${overallProgress.failedCompanies} (${((overallProgress.failedCompanies/overallProgress.totalCompanies)*100).toFixed(1)}%)`);
    console.log(`   ⏭️  Skipped Companies: ${overallProgress.skippedCompanies} (${((overallProgress.skippedCompanies/overallProgress.totalCompanies)*100).toFixed(1)}%)`);
    console.log(`   📊 Total Jobs Collected: ${overallProgress.totalJobsCollected}`);
    console.log(`   ⚡ Average Jobs per Successful Company: ${overallProgress.successfulCompanies > 0 ? (overallProgress.totalJobsCollected/overallProgress.successfulCompanies).toFixed(1) : 0}`);
    
    // Detailed success and failure breakdown
    console.log(`\n🎉 Successful Companies (${companiesStatus.successful.length}):`);
    companiesStatus.successful
      .sort((a, b) => b.jobs - a.jobs) // Sort by job count descending
      .forEach((company, index) => {
        console.log(`   ${index + 1}. ${company.name}: ${company.jobs} jobs (${(company.duration/1000).toFixed(1)}s, ${company.attempts} attempts)`);
      });
    
    if (companiesStatus.failed.length > 0) {
      console.log(`\n💥 Failed Companies (${companiesStatus.failed.length}):`);
      companiesStatus.failed.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company.name}: ${company.error} (${(company.duration/1000).toFixed(1)}s, ${company.attempts} attempts)`);
      });
    }
    
    if (companiesStatus.skipped.length > 0) {
      console.log(`\n⏭️ Skipped Companies (${companiesStatus.skipped.length}):`);
      companiesStatus.skipped.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company}`);
      });
    }
    
    console.log(`🏁 Batch processing completed. Total results: ${results.length}`);
    return results;
  }

  // Process all scrapers in optimized batches
  const batchResults = await processScrapersInBatches(scraperConfigs, batchConfig);
  
  // Collect all jobs from successful scrapers and transform immediately
  batchResults.forEach(result => {
    if (result.success && result.jobs && result.jobs.length > 0) {
      try {
        const transformedJobs = transformJobs(result.jobs, searchQuery);
        console.log(`🔄 Transforming ${result.jobs.length} jobs from ${result.name}`);

        // Add ALL jobs - don't filter by seen status
        // Track duplicates for logging but include everything
        let newCount = 0;
        let dupeCount = 0;

        transformedJobs.forEach(job => {
          const jobId = generateJobId(job);
          if (processedJobIds.has(jobId)) {
            dupeCount++;
          } else {
            processedJobIds.add(jobId);
            newCount++;
          }
        });

        // Add ALL jobs regardless of duplicate status
        allJobs.push(...transformedJobs);
        console.log(`✅ Added ${transformedJobs.length} jobs from ${result.name} (${newCount} new, ${dupeCount} seen before)`)
      } catch (transformError) {
        console.error(`❌ Error transforming jobs from ${result.name}:`, transformError.message);
      }
    } else if (result.success) {
      console.log(`ℹ️ ${result.name} returned no jobs`);
    }
  });

  const puppeteerJobsCount = allJobs.length - apiJobsCollected - externalJobsCollected;
  console.log(`📊 Phase 3 Complete: ${puppeteerJobsCount} jobs from Puppeteer scrapers`);

  // ===== FINAL PROCESSING =====
  console.log('\n🔧 FINAL PROCESSING...');
  console.log(`📊 Total jobs collected: ${allJobs.length}`);

  // Early exit if no jobs found
  if (allJobs.length === 0) {
    console.log(`⚠️ No jobs found. Exiting early.`);
    return [];
  }

  // Filter jobs by level (remove senior-level positions)
  console.log('🎯 Filtering jobs by experience level...');
  let processedJobs;
  try {
    const levelFilteredJobs = filterJobsByLevel(allJobs);
    console.log(`🎯 Level filtering: ${allJobs.length} -> ${levelFilteredJobs.length} jobs`);
    processedJobs = levelFilteredJobs;
  } catch (filterError) {
    console.error('❌ Error in level filtering:', filterError.message);
    processedJobs = allJobs; // Fallback to unfiltered jobs
  }

  // Early exit if no jobs after filtering
  if (processedJobs.length === 0) {
    console.log(`⚠️ No jobs remaining after level filtering. Exiting.`);
    return [];
  }

  // Filter for US-only jobs
  const removedJobs = [];
  const initialCount = processedJobs.length;
  
  try {
    processedJobs = processedJobs.filter(job => {
      const isUSJob = isUSOnlyJob(job);
      
      if (!isUSJob) {
        removedJobs.push(job);
        return false; // Remove non-US job
      }
      
      return true; // Keep US job
    });

    console.log(`🗺️ Location filtering: ${initialCount} -> ${processedJobs.length} jobs (removed ${removedJobs.length} non-US jobs)`);
  } catch (locationError) {
    console.error('❌ Error in location filtering:', locationError.message);
  }

  // Remove duplicates using standardized job ID generation
  const uniqueJobs = processedJobs.filter((job, index, self) => {
    const jobId = generateJobId(job);
    return index === self.findIndex((j) => generateJobId(j) === jobId);
  });

  console.log(`🧹 After deduplication: ${uniqueJobs.length}`);

  // Sort by posting date (descending - latest first)
  uniqueJobs.sort((a, b) => {
    const dateA = new Date(a.job_posted_at_datetime_utc);
    const dateB = new Date(b.job_posted_at_datetime_utc);
    return dateB - dateA;
  });

  // console.log(`🏢 Companies with real API data: ${companiesWithAPIs.length}`);
  console.log(`✅ REAL JOBS ONLY - No fake data!`);

  return uniqueJobs;
}
module.exports = { fetchAllRealJobs };