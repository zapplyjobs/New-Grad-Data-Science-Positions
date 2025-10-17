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
    const needsNextPageExtraction = descriptionType === 'next-page' || selector.postedType === 'next-page';
    const currentUrl = page.url();

    if (needsNextPageExtraction) { 
      // Extract ALL job data upfront before any navigation
      const allJobData = [];
      
      for (let i = 0; i < jobElements.length; i++) {
        const jobData = await extractSingleJobData(page, jobElements[i], selector, company, i, pageNum);
        if (jobData.title || jobData.applyLink) {
          allJobData.push(jobData);
        }
      }
      
      console.log(`Extracted ${allJobData.length} jobs upfront, now navigating for details...`);
      
      // Now navigate to each job page to get description and/or posted date
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
      
    } else {
      // ✅ FIXED: Same-page extraction with proper loop prevention
      const jobCount = jobElements.length; // Use already-sliced array length
      
      console.log(`Processing ${jobCount} jobs for same-page extraction...`);
      
      // ✅ Extract all basic data first in ONE pass
      const allBasicJobData = [];
      for (let i = 0; i < jobCount; i++) {
        const jobData = await extractSingleJobData(page, jobElements[i], selector, company, i, pageNum);
        if (jobData.title || jobData.applyLink) {
          allBasicJobData.push({ jobData, originalIndex: i });
        }
      }
      
      console.log(`Extracted ${allBasicJobData.length} basic job entries`);
      
      // ✅ Now handle same-page descriptions separately without re-querying in loop
      for (let entry of allBasicJobData) {
        const jobData = entry.jobData;
        const originalIndex = entry.originalIndex;
        
        if (selector.descriptionSelector) {
          jobData.description = await extractDescriptionSamePage(
            page, 
            originalIndex, 
            selector, 
            originalIndex + 1
          );
        }
        
        jobs.push(jobData);
      }
    }

  } catch (error) {
    console.error(`Error scraping ${company.name} page ${pageNum}: ${error.message}`);
  }

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
      await new Promise(resolve => setTimeout(resolve, 1200));
      finalApplyLink = page.url();
      console.log(`[${selector.name} ${index + 1}] Extracted URL after click: ${finalApplyLink}`);
    } catch (error) {
      console.error(`[${selector.name} ${index + 1}] Failed to extract URL after click: ${error.message}`);
      finalApplyLink = company.baseUrl || '';
    }
  } else {
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
 * ✅ FIXED: Extract description on same page - prevents infinite loops
 * @param {Object} page - Puppeteer page instance
 * @param {number} jobIndex - Job element index (0-based)
 * @param {Object} selector - Selector configuration
 * @param {number} jobNumber - Job number for logging (1-based)
 * @returns {string} Job description
 */
async function extractDescriptionSamePage(page, jobIndex, selector, jobNumber) {
  const MAX_RETRIES = 2; // ✅ Reduced from 3 to prevent excessive retries
  let retries = MAX_RETRIES;
  
  while (retries > 0) {
    try {
      console.log(`[${jobNumber}] Same-page description extraction (attempt ${MAX_RETRIES - retries + 1}/${MAX_RETRIES})...`);
      
      await page.waitForSelector(selector.jobSelector, { timeout: 5000 });
      
      // ✅ Use page.evaluate for click - avoids detached node issues
      const clickResult = await page.evaluate((jobSelector, titleSelector, jobIdx, companyName) => {
        let jobElements = document.querySelectorAll(jobSelector);
        
        // Apply same slicing logic
        const LIMIT = 15;
        if (companyName === 'Applied Materials') {
          const allElements = Array.from(jobElements);
          jobElements = allElements.slice(-LIMIT);
        } else if (companyName === 'Infineon Technologies' || companyName === 'Arm') {
          const allElements = Array.from(jobElements);
          jobElements = allElements.slice(0, LIMIT);
        }
        
        if (!jobElements[jobIdx]) {
          return { success: false, error: 'Job element not found at index ' + jobIdx };
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
      
      // Wait for description to load
      await new Promise(resolve => setTimeout(resolve, 1500)); // ✅ Increased wait time
      await page.waitForSelector(selector.descriptionSelector, { timeout: 8000 });
      
      // Extract description
      const description = await extractAndFormatDescription(page, selector.descriptionSelector);
      
      console.log(`[${jobNumber}] ✅ Same-page description extracted (${description.length} chars)`);
      return description;
      
    } catch (error) {
      retries--;
      console.warn(`[${jobNumber}] ❌ Same-page attempt failed: ${error.message}${retries > 0 ? ' - Retrying...' : ''}`);
      
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // ✅ Increased retry delay
        try {
          await waitForJobSelector(page, selector.jobSelector);
        } catch (waitError) {
          console.warn(`[${jobNumber}] Wait for job selector failed: ${waitError.message}`);
        }
      } else {
        // ✅ ALL retries exhausted - return failure message and BREAK
        console.error(`[${jobNumber}] 🛑 All ${MAX_RETRIES} retries exhausted, moving to next job`);
        break;
      }
    }
  }
  
  return 'Same-page description extraction failed after retries';
}

/**
 * Extract description and/or posted date by navigating to job details page
 * @param {Object} page - Puppeteer page instance
 * @param {string} applyLink - URL to job details page
 * @param {Object} selector - Selector configuration
 * @param {string} originalUrl - Original listing page URL to return to
 * @param {number} jobNumber - Job number for logging
 * @param {string} fallbackPosted - Fallback posted date if extraction fails
 * @returns {Object} Object with description and posted date
 */
async function extractFromNextPage(page, applyLink, selector, originalUrl, jobNumber, fallbackPosted = 'Recently') {
  const MAX_RETRIES = 2;
  let retries = MAX_RETRIES;
  
  while (retries > 0) {
    try {
      console.log(`[${jobNumber}] Next-page extraction (attempt ${MAX_RETRIES - retries + 1}/${MAX_RETRIES})...`);
      
      const descriptionLink = convertToDescriptionLink(applyLink, selector.name);
      console.log(`[${jobNumber}] Navigating to ${descriptionLink}`);
      
      await page.goto(descriptionLink, { 
        waitUntil: 'domcontentloaded', 
        timeout: 20000 
      });

      let description = 'Description not available';
      let posted = fallbackPosted;

      // Extract description if selector exists
      if (selector.descriptionSelector) {
        try {
          await page.waitForSelector(selector.descriptionSelector, { timeout: 10000 });
          description = await extractAndFormatDescription(page, selector.descriptionSelector);
          console.log(`[${jobNumber}] Description extracted (${description.length} chars)`);
        } catch (descError) {
          console.warn(`[${jobNumber}] Description extraction failed: ${descError.message}`);
        }
      }

      // Extract posted date if postedType is 'next-page'
      if (selector.postedType === 'next-page' && selector.postedSelector) {
        try {
          await page.waitForSelector(selector.postedSelector, { timeout: 5000 });
          posted = await page.$eval(selector.postedSelector, el => el.textContent.trim());
          console.log(`[${jobNumber}] Posted date extracted: ${posted}`);
        } catch (postedError) {
          console.warn(`[${jobNumber}] Posted date extraction failed: ${postedError.message}`);
          posted = fallbackPosted;
        }
      }
      
      // Navigate back to the original listing page
      try {
        await page.goto(originalUrl, { 
          waitUntil: 'domcontentloaded', 
          timeout: 15000 
        });
        await waitForJobSelector(page, selector.jobSelector);
        await new Promise(resolve => setTimeout(resolve, 800));
        console.log(`[${jobNumber}] Successfully returned to listing page`);
      } catch (backNavError) {
        console.error(`[${jobNumber}] Failed to navigate back to listing: ${backNavError.message}`);
      }
      
      return { description, posted };
      
    } catch (error) {
      retries--;
      console.warn(`[${jobNumber}] Next-page attempt failed: ${error.message}${retries > 0 ? ' - Retrying...' : ''}`);
      
      if (retries > 0) {
        try {
          await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await waitForJobSelector(page, selector.jobSelector);
        } catch (retryNavError) {
          console.error(`Failed to navigate back for retry: ${retryNavError.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }
  
  // Ensure we're back on the listing page
  try {
    await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForJobSelector(page, selector.jobSelector);
  } catch (finalNavError) {
    console.error(`[${jobNumber}] Failed final navigation back to listing: ${finalNavError.message}`);
  }
  
  return { 
    description: 'Next-page extraction failed after retries',
    posted: fallbackPosted
  };
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
    
    if (relevantSections.length > 0) {
      relevantSections.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority === 'high' ? -1 : 1;
        }
        return b.text.length - a.text.length;
      });
      
      allText = relevantSections.slice(0, 10).map(section => section.text).join(' ');
    }
    
    if (!allText) {
      Array.from(descElements).forEach(element => {
        const text = element.textContent.trim().toLowerCase();
        const hasMediumPriority = mediumPriorityKeywords.some(keyword => text.includes(keyword));
        
        if (hasMediumPriority && text.length > 20) {
          allText += element.textContent.trim() + ' ';
        }
      });
    }
    
    if (!allText) {
      allText = Array.from(descElements)
        .map(el => el.textContent.trim())
        .filter(text => text.length > 10)
        .join(' ');
    }
    
    if (!allText || allText.trim().length < 20) {
      return 'Description content not available';
    }
    
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
 * Extract descriptions in batch for multiple jobs
 * @param {Object} page - Puppeteer page instance
 * @param {Array} jobs - Array of job objects with apply links
 * @param {Object} selector - Selector configuration
 * @returns {Array} Updated jobs array with descriptions
 */
async function extractDescriptionsInBatch(page, jobs, selector) {
  console.log(`Batch description extraction for ${jobs.length} jobs...`);
  
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
      
      console.log(`Batch description extracted (${job.description.length} characters)`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Batch extraction failed for "${job.title}": ${error.message}`);
      job.description = 'Batch description extraction failed';
    }
  }
  
  return jobs;
}

module.exports = {
  extractJobData,
  extractSingleJobData,
  extractDescriptionsInBatch
};