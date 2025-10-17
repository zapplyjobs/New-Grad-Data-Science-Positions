const { navigateToPage, preparePageForExtraction, waitForJobSelector } = require('./navigationService.js');
const { buildApplyLink, convertToDescriptionLink } = require('../utils/urlBuilder.js');
const { EXTRACTION_CONSTANTS } = require('../utils/constants.js');

/**
 * Apply company-specific slicing to job elements
 * @param {Array} jobElements - Array of job elements
 * @param {string} companyName - Name of the company
 * @returns {Array} Sliced job elements array
 */
function applyCompanySlicing(jobElements, companyName) {
  const originalCount = jobElements.length;
  let slicedElements = jobElements;
  
  if (companyName === 'Applied Materials') {
    slicedElements = jobElements.slice(-EXTRACTION_CONSTANTS.APPLIED_MATERIALS_LIMIT);
    console.log(`[${companyName}] Keeping last ${EXTRACTION_CONSTANTS.APPLIED_MATERIALS_LIMIT} jobs (${originalCount} -> ${slicedElements.length})`);
  } else if (companyName === 'Infineon Technologies' || companyName === 'Arm') {
    slicedElements = jobElements.slice(0, 15);
    console.log(`[${companyName}] Keeping first 15 jobs (${originalCount} -> ${slicedElements.length})`);
  }
  
  return slicedElements;
}

/**
 * Check if company uses Oracle-based career system with modals
 * @param {string} companyName - Name of the company
 * @returns {boolean}
 */
function isOracleBasedSite(companyName) {
  const oracleCompanies = ['JPMorgan Chase', 'Honeywell', 'Texas Instruments'];
  return oracleCompanies.includes(companyName);
}

/**
 * Check if company uses Salesforce-based career system
 * @param {string} companyName - Name of the company
 * @returns {boolean}
 */
function isSalesforceBasedSite(companyName) {
  const salesforceCompanies = ['Salesforce', 'Slack', 'Tableau'];
  return salesforceCompanies.includes(companyName);
}

/**
 * Check if company requires special navigation handling (Arm-style)
 * Arm has next-page extraction for both description AND posted date
 * @param {string} companyName - Name of the company
 * @returns {boolean}
 */
function requiresSpecialNavigation(companyName) {
  const specialNavCompanies = ['Arm', 'Synopsys', 'ABB'];
  return specialNavCompanies.includes(companyName);
}

/**
 * Extract job data for a single page with integrated description extraction
 * @param {Object} page - Puppeteer page instance
 * @param {Object} selector - Selector configuration
 * @param {Object} company - Company configuration
 * @param {number} pageNum - Current page number
 * @returns {Array} Array of job objects
 */
async function extractJobData(page, selector, company, pageNum) {
  const jobs = [];

  try {
    await waitForJobSelector(page, selector.jobSelector);
    await preparePageForExtraction(page);

    let jobElements = await page.$$(selector.jobSelector);
    jobElements = applyCompanySlicing(jobElements, selector.name);
    
    console.log(`Found ${jobElements.length} job elements for ${company.name} on page ${pageNum}`);

    if (jobElements.length === 0) {
      console.log(`No job elements for ${company.name} on page ${pageNum}, stopping...`);
      return jobs;
    }

    const descriptionType = selector.descriptionType || 'same-page';
    const needsModalExtraction = isOracleBasedSite(selector.name) || isSalesforceBasedSite(selector.name);
    const needsSpecialNavigation = requiresSpecialNavigation(selector.name);
    const needsNextPageExtraction = (descriptionType === 'next-page' || selector.postedType === 'next-page') 
                                     && !needsModalExtraction 
                                     && !needsSpecialNavigation;

    // STRATEGY 1: Modal-based extraction (Oracle/Salesforce sites - NO PAGE NAVIGATION)
    if (needsModalExtraction && (selector.postedType === 'next-page' || descriptionType === 'next-page')) {
      console.log(`🔷 Using modal-based extraction for ${selector.name}`);
      
      for (let i = 0; i < jobElements.length; i++) {
        try {
          // Extract basic job data
          const jobData = await extractSingleJobData(page, jobElements[i], selector, company, i, pageNum);
          
          if (!jobData.title && !jobData.applyLink) {
            continue;
          }

          // Click job to open modal
          console.log(`[${i + 1}/${jobElements.length}] Opening modal for: ${jobData.title.substring(0, 50)}...`);
          
          await jobElements[i].click();
          await new Promise(resolve => setTimeout(resolve, 1800)); // Wait for modal to open
          
          // Extract posted date from modal if needed
          if (selector.postedType === 'next-page' && selector.postedSelector) {
            try {
              await page.waitForSelector(selector.postedSelector, { timeout: 4000 });
              const postedDate = await page.$eval(selector.postedSelector, el => el.textContent.trim());
              jobData.posted = postedDate;
              console.log(`[${i + 1}] ✅ Posted date from modal: ${postedDate}`);
            } catch (postedError) {
              console.warn(`[${i + 1}] ⚠️ Failed to extract posted date from modal: ${postedError.message}`);
              jobData.posted = 'Recently';
            }
          }
          
          // Extract description from modal if needed
          if (descriptionType === 'next-page' && selector.descriptionSelector) {
            try {
              await page.waitForSelector(selector.descriptionSelector, { timeout: 3000 });
              const description = await extractAndFormatDescription(page, selector.descriptionSelector);
              jobData.description = description;
              console.log(`[${i + 1}] ✅ Description from modal (${description.length} chars)`);
            } catch (descError) {
              console.warn(`[${i + 1}] ⚠️ Failed to extract description from modal: ${descError.message}`);
              jobData.description = 'Description not available';
            }
          }
          
          // Close modal
          try {
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 400));
            console.log(`[${i + 1}] Modal closed successfully`);
          } catch (escapeError) {
            console.warn(`[${i + 1}] Failed to close modal with Escape, trying click outside`);
            // Fallback: click outside modal
            try {
              await page.mouse.click(50, 50);
              await new Promise(resolve => setTimeout(resolve, 400));
            } catch (clickError) {
              console.warn(`[${i + 1}] Could not close modal: ${clickError.message}`);
            }
          }
          
          // Re-query job elements to avoid stale references
          jobElements = await page.$$(selector.jobSelector);
          jobElements = applyCompanySlicing(jobElements, selector.name);
          
          jobs.push(jobData);
          
        } catch (modalError) {
          console.error(`[${i + 1}] ❌ Modal extraction error: ${modalError.message}`);
          // Try to recover by pressing Escape
          try {
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (recoveryError) {
            console.error(`[${i + 1}] Failed to recover from modal error`);
          }
        }
      }
      
    } 
    // STRATEGY 2: Special navigation for Arm-style sites (posted date on next page)
    else if (needsSpecialNavigation && selector.postedType === 'next-page') {
      console.log(`🔶 Using special navigation extraction for ${selector.name} (posted date on detail page)`);
      
      const allJobData = [];
      
      // Step 1: Extract all basic job data upfront (without posted date)
      for (let i = 0; i < jobElements.length; i++) {
        const jobData = await extractSingleJobData(page, jobElements[i], selector, company, i, pageNum);
        if (jobData.title || jobData.applyLink) {
          allJobData.push(jobData);
        }
      }
      
      console.log(`Extracted ${allJobData.length} jobs upfront for ${selector.name}`);
      
      // Step 2: Navigate to each job page ONLY for posted date and description
      for (let i = 0; i < allJobData.length; i++) {
        const jobData = allJobData[i];
        
        if (jobData.applyLink) {
          const extractionResult = await extractFromNextPageOptimized(
            page,
            jobData.applyLink,
            selector,
            i + 1,
            {
              needsDescription: selector.descriptionSelector ? true : false,
              needsPostedDate: selector.postedType === 'next-page',
              fallbackPosted: jobData.posted
            }
          );
          
          if (selector.descriptionSelector && extractionResult.description) {
            jobData.description = extractionResult.description;
          }
          
          if (selector.postedType === 'next-page' && extractionResult.posted) {
            jobData.posted = extractionResult.posted;
          }
        }
        
        jobs.push(jobData);
      }
      
    }
    // STRATEGY 3: Full page navigation extraction (sites requiring actual navigation)
    else if (needsNextPageExtraction) {
      console.log(`🔵 Using next-page navigation extraction for ${selector.name}`);
      
      const currentUrl = page.url();
      const allJobData = [];
      
      // Step 1: Extract all basic job data upfront
      for (let i = 0; i < jobElements.length; i++) {
        const jobData = await extractSingleJobData(page, jobElements[i], selector, company, i, pageNum);
        if (jobData.title || jobData.applyLink) {
          allJobData.push(jobData);
        }
      }
      
      console.log(`Extracted ${allJobData.length} jobs upfront, now navigating for details...`);
      
      // Step 2: Navigate to each job page for description/posted date
      for (let i = 0; i < allJobData.length; i++) {
        const jobData = allJobData[i];
        
        if (jobData.applyLink && (selector.descriptionSelector || selector.postedType === 'next-page')) {
          const { description, posted } = await extractFromNextPage(
            page, 
            jobData.applyLink, 
            selector, 
            currentUrl, 
            i + 1,
            jobData.posted
          );
          
          if (selector.descriptionSelector) {
            jobData.description = description;
          }
          
          if (selector.postedType === 'next-page') {
            jobData.posted = posted;
          }
        }
        
        jobs.push(jobData);
      }
      
    } 
    // STRATEGY 4: Same-page extraction (no navigation needed)
    else {
      console.log(`🟢 Using same-page extraction for ${selector.name}`);
      
      const totalElements = await page.$$eval(selector.jobSelector, els => els.length);
      let jobCount = totalElements;
      
      if (selector.name === 'Applied Materials') {
        jobCount = Math.min(totalElements, EXTRACTION_CONSTANTS.APPLIED_MATERIALS_LIMIT);
      } else if (selector.name === 'Infineon Technologies' || selector.name === 'Arm') {
        jobCount = Math.min(totalElements, EXTRACTION_CONSTANTS.APPLIED_MATERIALS_LIMIT);
      }
      
      console.log(`Processing ${jobCount} jobs for same-page extraction...`);
      
      for (let i = 0; i < jobCount; i++) {
        // Re-select job elements fresh each time to avoid detached nodes
        let currentJobElements = await page.$$(selector.jobSelector);
        currentJobElements = applyCompanySlicing(currentJobElements, selector.name);
        
        if (i >= currentJobElements.length) {
          console.warn(`Job element ${i} no longer exists, skipping...`);
          continue;
        }

        const jobData = await extractSingleJobData(page, currentJobElements[i], selector, company, i, pageNum);
        
        if (jobData.title || jobData.applyLink) {
          // Extract description on same page if selector exists
          if (selector.descriptionSelector) {
            jobData.description = await extractDescriptionSamePage(page, i, selector, i + 1);
          }
          jobs.push(jobData);
        }
      }
    }

  } catch (error) {
    console.error(`❌ Error scraping ${company.name} page ${pageNum}: ${error.message}`);
  }

  console.log(`✅ Extracted ${jobs.length} jobs from ${company.name} page ${pageNum}`);
  return jobs;
}

/**
 * Extract job data from a single job element
 * @param {Object} page - Puppeteer page instance
 * @param {Object} jobElement - Puppeteer element handle
 * @param {Object} selector - Selector configuration
 * @param {Object} company - Company configuration
 * @param {number} index - Job element index
 * @param {number} pageNum - Current page number
 * @returns {Object} Job data object
 */
async function extractSingleJobData(page, jobElement, selector, company, index, pageNum) {
  const rawJobData = await jobElement.evaluate(
    (el, sel, jobIndex) => {
      // Helper functions
      const getText = (selector) => {
        const elem = selector ? el.querySelector(selector) : null;
        return elem ? elem.textContent.trim() : '';
      };

      const getAttr = (selector, attr) => {
        const elem = selector ? el.querySelector(selector) : null;
        return elem ? elem.getAttribute(attr) : '';
      };

      // Extract title
      let title = '';
      if (sel.titleAttribute) {
        title = getAttr(sel.titleSelector, sel.titleAttribute);
      } else {
        title = getText(sel.titleSelector);
      }

      // Extract raw apply link
      let applyLink = '';
      if (sel.applyLinkSelector) {
        applyLink = getAttr(sel.applyLinkSelector.replace(/\${index}/g, jobIndex), sel.linkAttribute);
      } else if (sel.linkSelector) {
        applyLink = getAttr(sel.linkSelector, sel.linkAttribute);
      } else if (sel.jobLinkSelector && sel.linkAttribute) {
        applyLink = el.getAttribute(sel.linkAttribute) || '';
      }

      // Extract location with special handling
      let location = '';
      if (['Honeywell', 'JPMorgan Chase', 'Texas Instruments'].includes(sel.name)) {
        const locationSpans = el.querySelectorAll('span:not(.job-tile__title)');
        for (const span of locationSpans) {
          const text = span.textContent.trim();
          if (
            text.includes(',') ||
            text.toLowerCase().includes('united states') ||
            text.match(/[A-Z]{2}/) ||
            text.includes('TX') ||
            text.includes('Dallas')
          ) {
            location = text;
            break;
          }
        }
      } else {
        location = getText(sel.locationSelector);
      }

      // Extract posted date (only if NOT next-page type)
      let posted = 'Recently';
      if (sel.postedType !== 'next-page') {
        posted = sel.postedSelector ? getText(sel.postedSelector) : 'Recently';

        // Special handling for 10x Genomics
        if (sel.name === '10x Genomics' && sel.postedSelector) {
          const dateElements = el.querySelectorAll(sel.postedSelector);
          posted = 'Recently';
          for (const div of dateElements) {
            const text = div.textContent.trim();
            if (
              text.toLowerCase().includes('posted') ||
              text.includes('ago') ||
              text.includes('month') ||
              text.includes('day') ||
              text.includes('week')
            ) {
              posted = text;
              break;
            }
          }
        }
      }

      return { title, applyLink, location, posted };
    },
    selector,
    index
  );

  // Extract URL for Microsoft (after click)
  let finalApplyLink = '';
  
  if (selector.extractUrlAfterClick) {
    try {
      console.log(`[${selector.name} ${index + 1}] Clicking job to extract URL...`);
      
      await jobElement.click();
      await new Promise(resolve => setTimeout(resolve, 600));
      
      finalApplyLink = page.url();
      console.log(`[${selector.name} ${index + 1}] Extracted URL after click: ${finalApplyLink}`);
    } catch (error) {
      console.error(`[${selector.name} ${index + 1}] Failed to extract URL after click: ${error.message}`);
      finalApplyLink = company.baseUrl || '';
    }
  } else {
    // Standard link building for other companies
    finalApplyLink = buildApplyLink(rawJobData.applyLink, company.baseUrl || '');
    if (!finalApplyLink && company.baseUrl) {
      finalApplyLink = company.baseUrl;
    }
  }

  // Build job object
  const job = {
    company: selector.name,
    title: rawJobData.title,
    applyLink: finalApplyLink,
    location: rawJobData.location,
    posted: rawJobData.posted,
  };

  // Add optional fields
  if (selector.reqIdSelector) {
    job.reqId = await jobElement.evaluate((el, sel) => {
      const elem = el.querySelector(sel.reqIdSelector);
      return elem ? elem.textContent.trim() : '';
    }, selector);
  }
  
  if (selector.categorySelector) {
    job.category = await jobElement.evaluate((el, sel) => {
      const elem = el.querySelector(sel.categorySelector);
      return elem ? elem.textContent.trim() : '';
    }, selector);
  }

  return job;
}

/**
 * Extract description on same page by using job index
 * @param {Object} page - Puppeteer page instance
 * @param {number} jobIndex - Job element index (0-based)
 * @param {Object} selector - Selector configuration
 * @param {number} jobNumber - Job number for logging (1-based)
 * @returns {string} Job description
 */
async function extractDescriptionSamePage(page, jobIndex, selector, jobNumber) {
  try {
    console.log(`[${jobNumber}] Same-page description extraction...`);
    
    await page.waitForSelector(selector.jobSelector, { timeout: 5000 });
    
    // Use page.evaluate to handle clicking robustly
    const clickResult = await page.evaluate((jobSelector, titleSelector, jobIdx, companyName) => {
      let jobElements = document.querySelectorAll(jobSelector);
      
      // Apply same slicing logic as in extraction
      const LIMIT = 15;
      if (companyName === 'Applied Materials') {
        const allElements = Array.from(jobElements);
        jobElements = allElements.slice(-LIMIT);
      } else if (companyName === 'Infineon Technologies' || companyName === 'Arm') {
        const allElements = Array.from(jobElements);
        jobElements = allElements.slice(0, LIMIT);
      }
      
      if (!jobElements[jobIdx]) {
        return { success: false, error: 'Job element not found' };
      }
      
      const titleElement = jobElements[jobIdx].querySelector(titleSelector);
      if (!titleElement) {
        return { success: false, error: 'Title element not found' };
      }
      
      titleElement.click();
      return { success: true };
    }, selector.jobSelector, selector.titleSelector, jobIndex, selector.name);
    
    if (!clickResult.success) {
      throw new Error(clickResult.error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 600));
    await page.waitForSelector(selector.descriptionSelector, { timeout: 3000 });
    
    const description = await extractAndFormatDescription(page, selector.descriptionSelector);
    
    console.log(`[${jobNumber}] Same-page description extracted (${description.length} chars)`);
    return description;
    
  } catch (error) {
    console.warn(`[${jobNumber}] Same-page extraction failed: ${error.message}`);
    return 'Same-page description extraction failed';
  }
}

/**
 * Optimized extraction for sites that don't need to return to listing page
 * Used for Arm, Synopsys, ABB (pagination handled differently)
 * @param {Object} page - Puppeteer page instance
 * @param {string} applyLink - URL to job details page
 * @param {Object} selector - Selector configuration
 * @param {number} jobNumber - Job number for logging
 * @param {Object} options - Extraction options
 * @returns {Object} Object with description and posted date
 */
async function extractFromNextPageOptimized(page, applyLink, selector, jobNumber, options = {}) {
  const {
    needsDescription = false,
    needsPostedDate = false,
    fallbackPosted = 'Recently'
  } = options;

  try {
    console.log(`[${jobNumber}] 🚀 Optimized next-page extraction (no return navigation)...`);
    
    const descriptionLink = convertToDescriptionLink(applyLink, selector.name);
    console.log(`[${jobNumber}] Navigating to ${descriptionLink}`);
    
    await page.goto(descriptionLink, { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000
    });

    let description = 'Description not available';
    let posted = fallbackPosted;

    // Extract description if needed
    if (needsDescription && selector.descriptionSelector) {
      try {
        await page.waitForSelector(selector.descriptionSelector, { timeout: 5000 });
        description = await extractAndFormatDescription(page, selector.descriptionSelector);
        console.log(`[${jobNumber}] ✅ Description extracted (${description.length} chars)`);
      } catch (descError) {
        console.warn(`[${jobNumber}] ⚠️ Description extraction failed: ${descError.message}`);
      }
    }

    // Extract posted date if needed
    if (needsPostedDate && selector.postedSelector) {
      try {
        await page.waitForSelector(selector.postedSelector, { timeout: 3000 });
        posted = await page.$eval(selector.postedSelector, el => el.textContent.trim());
        console.log(`[${jobNumber}] ✅ Posted date extracted: ${posted}`);
      } catch (postedError) {
        console.warn(`[${jobNumber}] ⚠️ Posted date extraction failed: ${postedError.message}`);
        posted = fallbackPosted;
      }
    }
    
    // NO RETURN NAVIGATION for optimized flow
    console.log(`[${jobNumber}] Continuing to next job (no return navigation)`);
    
    return { description, posted };
    
  } catch (error) {
    console.warn(`[${jobNumber}] ❌ Optimized extraction failed: ${error.message}`);
    return { 
      description: 'Optimized extraction failed',
      posted: fallbackPosted
    };
  }
}

/**
 * Extract description and/or posted date by navigating to job details page
 * WITH return navigation to listing page (for companies that need it)
 * @param {Object} page - Puppeteer page instance
 * @param {string} applyLink - URL to job details page
 * @param {Object} selector - Selector configuration
 * @param {string} originalUrl - Original listing page URL to return to
 * @param {number} jobNumber - Job number for logging
 * @param {string} fallbackPosted - Fallback posted date if extraction fails
 * @returns {Object} Object with description and posted date
 */
async function extractFromNextPage(page, applyLink, selector, originalUrl, jobNumber, fallbackPosted = 'Recently') {
  try {
    console.log(`[${jobNumber}] 🔄 Next-page extraction with return navigation...`);
    
    // Convert apply link to description link and navigate
    const descriptionLink = convertToDescriptionLink(applyLink, selector.name);
    console.log(`[${jobNumber}] Navigating to ${descriptionLink}`);
    
    await page.goto(descriptionLink, { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000
    });

    let description = 'Description not available';
    let posted = fallbackPosted;

    // Extract description if selector exists
    if (selector.descriptionSelector) {
      try {
        await page.waitForSelector(selector.descriptionSelector, { timeout: 5000 });
        description = await extractAndFormatDescription(page, selector.descriptionSelector);
        console.log(`[${jobNumber}] ✅ Description extracted (${description.length} chars)`);
      } catch (descError) {
        console.warn(`[${jobNumber}] ⚠️ Description extraction failed: ${descError.message}`);
      }
    }

    // Extract posted date if postedType is 'next-page'
    if (selector.postedType === 'next-page' && selector.postedSelector) {
      try {
        await page.waitForSelector(selector.postedSelector, { timeout: 3000 });
        posted = await page.$eval(selector.postedSelector, el => el.textContent.trim());
        console.log(`[${jobNumber}] ✅ Posted date extracted: ${posted}`);
      } catch (postedError) {
        console.warn(`[${jobNumber}] ⚠️ Posted date extraction failed: ${postedError.message}`);
        posted = fallbackPosted;
      }
    }
    
    // Navigate back to the original listing page
    console.log(`[${jobNumber}] ⬅️ Navigating back to listing page...`);
    await page.goto(originalUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000
    });
    
    await waitForJobSelector(page, selector.jobSelector);
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[${jobNumber}] ✅ Successfully returned to listing page`);
    
    return { description, posted };
    
  } catch (error) {
    console.warn(`[${jobNumber}] ❌ Next-page extraction failed: ${error.message}`);
    
    // Try to go back to original URL if navigation failed
    try {
      console.log(`[${jobNumber}] 🔄 Attempting recovery navigation...`);
      await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await waitForJobSelector(page, selector.jobSelector);
      console.log(`[${jobNumber}] ✅ Recovery successful`);
    } catch (finalNavError) {
      console.error(`[${jobNumber}] ❌ Failed final navigation back to listing: ${finalNavError.message}`);
    }
    
    return { 
      description: 'Next-page extraction failed',
      posted: fallbackPosted
    };
  }
}

/**
 * Optimized description text extraction and formatting
 * @param {Object} page - Puppeteer page instance
 * @param {string} descriptionSelector - CSS selector for description
 * @returns {string} Formatted job description
 */
async function extractAndFormatDescription(page, descriptionSelector) {
  return await page.evaluate((descSelector) => {
    const descElements = document.querySelectorAll(descSelector);
    
    if (descElements.length === 0) return 'No description found';
    
    // Keywords for filtering relevant content
    const highPriorityKeywords = [
      'experience', 'years', 'minimum', 'required', 'require', 'must have', 'need', 
      'prefer', 'qualification', 'background', 'track record', 'proven', 'demonstrated',
      'degree', 'bachelor', 'master', 'phd', 'doctorate', 'education', 'graduate',
      'university', 'college', 'certification', 'certified',
      'skill', 'ability', 'knowledge', 'expertise', 'proficient', 'familiar',
      'essential', 'should', 'preferred', 'ideal', 'candidate', 'applicant'
    ];
    
    const mediumPriorityKeywords = [
      'responsibilities', 'duties', 'role', 'position', 'job', 'work', 'tasks',
      'opportunity', 'team', 'company', 'department', 'organization'
    ];
    
    const levelKeywords = [
      'junior', 'senior', 'lead', 'principal', 'entry', 'entry-level', 'associate',
      'manager', 'director', 'head', 'chief', 'expert', 'specialist', 'consultant',
      'intern', 'trainee', 'graduate', 'fresh', 'beginner', 'experienced', 'veteran'
    ];
    
    let relevantSections = [];
    let allText = '';
    
    // Collect high-priority content
    Array.from(descElements).forEach(element => {
      const text = element.textContent.trim().toLowerCase();
      const hasHighPriority = highPriorityKeywords.some(keyword => text.includes(keyword));
      const hasLevelKeyword = levelKeywords.some(keyword => text.includes(keyword));
      
      if ((hasHighPriority || hasLevelKeyword) && text.length > 15) {
        relevantSections.push({
          text: element.textContent.trim(),
          priority: hasHighPriority ? 'high' : 'medium',
          element: element
        });
      }
    });
    
    // Prioritize high-priority content
    if (relevantSections.length > 0) {
      relevantSections.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority === 'high' ? -1 : 1;
        }
        return b.text.length - a.text.length;
      });
      
      allText = relevantSections.slice(0, 10).map(section => section.text).join(' ');
    }
    
    // Fallback to medium priority
    if (!allText) {
      Array.from(descElements).forEach(element => {
        const text = element.textContent.trim().toLowerCase();
        const hasMediumPriority = mediumPriorityKeywords.some(keyword => text.includes(keyword));
        
        if (hasMediumPriority && text.length > 20) {
          allText += element.textContent.trim() + ' ';
      }})}
// Final fallback
if (!allText) {
  allText = Array.from(descElements)
    .map(el => el.textContent.trim())
    .filter(text => text.length > 10)
    .join(' ');
}

if (!allText || allText.trim().length < 20) {
  return 'Description content not available';
}

// Process text for experience extraction
function processTextForExperienceExtraction(text) {
  const sentences = text
    .split(/[.!?;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);
  
  const experienceKeywords = [
    'year', 'experience', 'minimum', 'require', 'must', 'need', 'prefer',
    'background', 'qualification', 'degree', 'education', 'skill'
  ];
  
  const experienceRelatedSentences = sentences.filter(sentence => 
    experienceKeywords.some(keyword => 
      sentence.toLowerCase().includes(keyword)
    )
  );
  
  const otherSentences = sentences.filter(sentence => 
    !experienceKeywords.some(keyword => 
      sentence.toLowerCase().includes(keyword)
    )
  );
  
  const prioritizedSentences = [...experienceRelatedSentences, ...otherSentences];
  return prioritizedSentences.slice(0, 8);
}

const processedSentences = processTextForExperienceExtraction(allText);

if (processedSentences.length === 0) {
  let cleanText = allText.trim();
  cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
  
  if (!cleanText.endsWith('.') && !cleanText.endsWith('!') && !cleanText.endsWith('?')) {
    cleanText += '.';
  }
  
  return `• ${cleanText}`;
}

// Format sentences with proper structure
return processedSentences
  .map(sentence => {
    let cleanSentence = sentence.trim();
    cleanSentence = cleanSentence.replace(/\s+/g, ' ');
    cleanSentence = cleanSentence.charAt(0).toUpperCase() + cleanSentence.slice(1);
    
    if (!cleanSentence.endsWith('.') && !cleanSentence.endsWith('!') && !cleanSentence.endsWith('?')) {
      cleanSentence += '.';
    }
    
    return `• ${cleanSentence}`;
  })
  .join('\n');
  
}, descriptionSelector);
}

/**
* Extract descriptions in batch for multiple jobs (alternative approach)
* @param {Object} page - Puppeteer page instance
* @param {Array} jobs - Array of job objects with apply links
* @param {Object} selector - Selector configuration
* @returns {Array} Updated jobs array with descriptions
*/
async function extractDescriptionsInBatch(page, jobs, selector) {
console.log(`📦 Batch description extraction for ${jobs.length} jobs...`);

for (let i = 0; i < jobs.length; i++) {
const job = jobs[i];

if (!job.applyLink || !selector.descriptionSelector) {
  job.description = 'Description not available';
  continue;
}

try {
  console.log(`[${i + 1}/${jobs.length}] Batch extracting: ${job.title.substring(0, 40)}...`);
  
  await page.goto(job.applyLink, { 
    waitUntil: 'domcontentloaded', 
    timeout: 15000 
  });
  
  await page.waitForSelector(selector.descriptionSelector, { timeout: 8000 });
  job.description = await extractAndFormatDescription(page, selector.descriptionSelector);
  
  console.log(`✅ Batch description extracted (${job.description.length} characters)`);
  await new Promise(resolve => setTimeout(resolve, 500));
  
} catch (error) {
  console.error(`❌ Batch extraction failed for "${job.title}": ${error.message}`);
  job.description = 'Batch description extraction failed';
}
}

return jobs;
}

module.exports = {
extractJobData,
extractSingleJobData,
extractDescriptionsInBatch,
extractFromNextPageOptimized,
isOracleBasedSite,
isSalesforceBasedSite,
requiresSpecialNavigation
};