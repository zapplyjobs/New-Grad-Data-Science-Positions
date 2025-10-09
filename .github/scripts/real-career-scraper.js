const fs = require("fs");
const { generateJobId } = require("./job-fetcher/utils");
const {isUSOnlyJob} = require("./job-fetcher/utils");
const {filterJobsByLevel} =require("./job-fetcher/utils")
const { scrapeCompanyData } = require('../../jobboard/src/backend/core/scraper.js');
const { getCompanies } = require('../../jobboard/src/backend/config/companies.js');
const { transformJobs ,convertDateToRelative } = require('../../jobboard/src/backend/output/jobTransformer.js');
// Load company database
const companies = JSON.parse(
  fs.readFileSync("./.github/scripts/job-fetcher/companies.json", "utf8")
);
const ALL_COMPANIES = Object.values(companies).flat();

const BATCH_CONFIG = {
  batchSize: 15,                    // Number of scrapers to run concurrently in each batch (8 companies)
  delayBetweenBatches: 500,       // Delay in milliseconds between batches (2 seconds)
  maxRetries: 1,                   // Maximum retry attempts for failed scrapers
  timeout: 180000,                 // Timeout for individual scrapers (3 minutes)
  enableProgressBar: true,          // Enable progress tracking
  enableDetailedLogging: true      // Enable detailed logging for each scraper
};

function safeISOString(dateValue) {
    console.log("Input dateValue:", dateValue);
    if (!dateValue) return new Date().toISOString();

    try {
        const date = new Date(dateValue);
        console.log("Parsed date:", date);
        console.log("Is valid:", !isNaN(date.getTime()));
        if (isNaN(date.getTime())) {
            console.log("Invalid date, returning current date");
            return new Date().toISOString();
        }
        return date.toISOString();
    } catch (error) {
        console.log("Error:", error);
        return new Date().toISOString();
    }
}

// Function to create custom batch configuration
function createBatchConfig(options = {}) {
  return {
    ...BATCH_CONFIG,
    ...options
  };
}

// Utility functions
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


// Fetch jobs from all companies with real career API
async function fetchAllRealJobs(searchQuery = 'data science', maxPages = 10, batchConfig = BATCH_CONFIG) {
  console.log("🚀 Starting REAL career page scraping...");

  let allJobs = [];
  const companies = getCompanies(searchQuery);
  const companyKeys = Object.keys(companies);

  // Add execution tracking to prevent loops
  const executionId = Date.now();
  console.log(`🔍 Execution ID: ${executionId}`);

  // Define scraper configurations for batch processing
  const scraperConfigs = companyKeys.map(companyKey => ({
    name: companies[companyKey].name,
    companyKey: companyKey,
    scraper: () => scrapeCompanyData(companyKey, searchQuery, maxPages),
    query: searchQuery,
    executionId // Add execution ID to track this run
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
  const processedJobIds = new Set(); // Track processed job IDs for duplicate counting only

  batchResults.forEach(result => {
    if (result.success && result.jobs && result.jobs.length > 0) {
      try {
        const transformedJobs = transformJobs(result.jobs, searchQuery);
        console.log(`🔄 Transforming ${result.jobs.length} jobs from ${result.name}`);

        // Track duplicates for logging but add ALL jobs
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
        console.log(`✅ Added ${transformedJobs.length} jobs from ${result.name} (${newCount} new, ${dupeCount} duplicates)`)
      } catch (transformError) {
        console.error(`❌ Error transforming jobs from ${result.name}:`, transformError.message);
      }
    } else if (result.success) {
      console.log(`ℹ️ ${result.name} returned no jobs`);
    }
  });

  console.log(`📊 Total scraped jobs collected after transformation: ${allJobs.length}`);

  // Early exit if no jobs found
  if (allJobs.length === 0) {
    console.log(`⚠️ No scraped jobs found. Will only collect API jobs.`);
  }

  // Filter jobs by level (remove senior-level positions) BEFORE adding API/external jobs
  console.log('🎯 Filtering scraped jobs by experience level...');
  let levelFilteredJobs = [];
  try {
    if (allJobs.length > 0) {
      levelFilteredJobs = filterJobsByLevel(allJobs);
      console.log(`🎯 Level filtering: ${allJobs.length} -> ${levelFilteredJobs.length} scraped jobs`);
    }
  } catch (filterError) {
    console.error('❌ Error in level filtering:', filterError.message);
    levelFilteredJobs = allJobs; // Fallback to unfiltered jobs
  }

  // Filter out non-US jobs from scraped jobs
  const removedJobs = [];
  const initialScrapedCount = levelFilteredJobs.length;

  try {
    if (levelFilteredJobs.length > 0) {
      levelFilteredJobs = levelFilteredJobs.filter(job => {
        const isUSJob = isUSOnlyJob(job);

        if (!isUSJob ) {
          removedJobs.push(job);
          return false;
        // Remove non-US job
        }

        return true; // Keep US job
      });

      console.log(`🗺️ Location filtering scraped jobs: ${initialScrapedCount} -> ${levelFilteredJobs.length} jobs (removed ${removedJobs.length} non-US jobs)`);
    }
  } catch (locationError) {
    console.error('❌ Error in location filtering scraped jobs:', locationError.message);
  }

  // Final deduplication using standardized job ID generation
  const uniqueJobs = levelFilteredJobs.filter((job, index, self) => {
    const jobId = generateJobId(job);
    return index === self.findIndex((j) => generateJobId(j) === jobId);
  });

  console.log(`🧹 Final deduplication: ${levelFilteredJobs.length} -> ${uniqueJobs.length} jobs`);

  // Sort by posting date (descending - latest first)
  uniqueJobs.sort((a, b) => {
    const dateA = new Date(a.job_posted_at);
    const dateB = new Date(b.job_posted_at);
    return dateB - dateA;
  });

  // Calculate scraped jobs count (total jobs minus API and external jobs)
  const scrapedJobsCount = allJobs.length;

  // Final summary
  console.log(`\n🎯 ===== FINAL SUMMARY =====`);
  console.log(`📊 Total unique jobs: ${uniqueJobs.length}`);
  console.log(`   🔍 Scraped jobs (with descriptions): ${scrapedJobsCount}`);
  console.log(`✅ REAL JOBS ONLY - No fake data!`);

  return uniqueJobs;
}

module.exports = { fetchAllRealJobs };