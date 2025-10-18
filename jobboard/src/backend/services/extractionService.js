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
    // Reduced initial wait from 2000ms to 1000ms
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await waitForJobSelector(page, selector.jobSelector);
    await preparePageForExtraction(page);
    
    // Reduced post-preparation wait from 1000ms to 500ms
    await new Promise(resolve => setTimeout(resolve, 500));

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
      const allJobData = [];
      
      for (let i = 0; i < jobElements.length; i++) {
        const jobData = await extractSingleJobData(page, jobElements[i], selector, company, i, pageNum);
        if (jobData.title || jobData.applyLink) {
          allJobData.push(jobData);
        }
      }
      
      console.log(`Extracted ${allJobData.length} jobs upfront, now navigating for details...`);
      
      for (let i = 0; i < allJobData.length; i++) {
        const jobData = allJobData[i];
        
        // Reduced delay from 1500ms to 800ms
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        
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
      const totalElements = await page.$$eval(selector.jobSelector, els => els.length);
      
      let jobCount = totalElements;
      if (selector.name === 'Applied Materials') {
        jobCount = Math.min(totalElements, EXTRACTION_CONSTANTS.APPLIED_MATERIALS_LIMIT);
      } else if (selector.name === 'Infineon Technologies' || selector.name === 'Arm') {
        jobCount = Math.min(totalElements, EXTRACTION_CONSTANTS.APPLIED_MATERIALS_LIMIT);
      }
      
      console.log(`Processing ${jobCount} jobs for same-page extraction...`);
      
      for (let i = 0; i < jobCount; i++) {
        // Reduced delay from 800ms to 500ms
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        let currentJobElements = await page.$$(selector.jobSelector);
        currentJobElements = applyCompanySlicing(currentJobElements, selector.name);
        
        if (i >= currentJobElements.length) {
          console.warn(`Job element ${i} no longer exists, skipping...`);
          continue;
        }

        const jobData = await extractSingleJobData(page, currentJobElements[i], selector, company, i, pageNum);
        
        if (jobData.title || jobData.applyLink) {
          if (selector.descriptionSelector) {
            jobData.description = await extractDescriptionSamePage(page, i, selector, i + 1);
          }
          jobs.push(jobData);
        }
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

      let title = '';
      if (sel.titleAttribute) {
        title = getAttr(sel.titleSelector, sel.titleAttribute);
      } else {
        title = getText(sel.titleSelector);
      }

      let applyLink = '';
      if (sel.applyLinkSelector) {
        applyLink = getAttr(sel.applyLinkSelector.replace(/\${index}/g, jobIndex), sel.linkAttribute);
      } else if (sel.linkSelector) {
        applyLink = getAttr(sel.linkSelector, sel.linkAttribute);
      } else if (sel.jobLinkSelector && sel.linkAttribute) {
        applyLink = el.getAttribute(sel.linkAttribute) || '';
      }

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

  let finalApplyLink = '';
  
  if (selector.extractUrlAfterClick) {
    try {
      console.log(`[${selector.name} ${index + 1}] Clicking job to extract URL...`);
      await jobElement.click();
      
      // Reduced wait from 1200ms to 800ms
      await new Promise(resolve => setTimeout(resolve, 800));
      
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

  const job = {
    company: selector.name,
    title: rawJobData.title,
    applyLink: finalApplyLink,
    location: rawJobData.location,
    posted: rawJobData.posted,
  };

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
  let retries = 1;
  
  while (retries > 0) {
    try {
      console.log(`[${jobNumber}] Same-page description extraction (attempt ${4 - retries})...`);
      
      // Reduced timeout from 5000ms to 3000ms
      await page.waitForSelector(selector.jobSelector, { timeout: 3000 });
      
      const clickResult = await page.evaluate((jobSelector, titleSelector, jobIdx, companyName) => {
        let jobElements = document.querySelectorAll(jobSelector);
        
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
      
      // Reduced wait from 1200ms to 800ms
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Reduced timeout from 6000ms to 4000ms
      await page.waitForSelector(selector.descriptionSelector, { timeout: 4000 });
      
      const description = await extractAndFormatDescription(page, selector.descriptionSelector);
      
      console.log(`[${jobNumber}] Same-page description extracted (${description.length} chars)`);
      return description;
      
    } catch (error) {
      retries--;
      console.warn(`[${jobNumber}] Same-page attempt failed: ${error.message}${retries > 0 ? ' - Retrying...' : ''}`);
      
      if (retries > 0) {
        // Reduced retry wait from 1000ms to 600ms
        await new Promise(resolve => setTimeout(resolve, 600));
        try {
          await waitForJobSelector(page, selector.jobSelector);
        } catch (waitError) {
          console.warn(`[${jobNumber}] Wait for job selector failed: ${waitError.message}`);
        }
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
  let retries = 2;
  
  while (retries > 0) {
    try {
      console.log(`[${jobNumber}] Next-page extraction (attempt ${3 - retries})...`);
      
      const descriptionLink = convertToDescriptionLink(applyLink, selector.name);
      console.log(`[${jobNumber}] Navigating to ${descriptionLink}`);
      
      // Reduced pre-navigation delay from 1000ms to 600ms
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Reduced timeout from 20000ms to 15000ms
      await page.goto(descriptionLink, { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      
      // Reduced stabilization wait from 1500ms to 1000ms
      await new Promise(resolve => setTimeout(resolve, 1000));

      let description = 'Description not available';
      let posted = fallbackPosted;

      if (selector.descriptionSelector) {
        try {
          // Reduced timeout from 10000ms to 8000ms
          await page.waitForSelector(selector.descriptionSelector, { timeout: 8000 });
          description = await extractAndFormatDescription(page, selector.descriptionSelector);
          console.log(`[${jobNumber}] Description extracted (${description.length} chars)`);
        } catch (descError) {
          console.warn(`[${jobNumber}] Description extraction failed: ${descError.message}`);
        }
      }

      if (selector.postedType === 'next-page' && selector.postedSelector) {
        try {
          // Reduced timeout from 5000ms to 3000ms
          await page.waitForSelector(selector.postedSelector, { timeout: 3000 });
          posted = await page.$eval(selector.postedSelector, el => el.textContent.trim());
          console.log(`[${jobNumber}] Posted date extracted: ${posted}`);
        } catch (postedError) {
          console.warn(`[${jobNumber}] Posted date extraction failed: ${postedError.message}`);
          posted = fallbackPosted;
        }
      }
      
      try {
        // Reduced back navigation timeout from 115000ms to 12000ms
        await page.goto(originalUrl, { 
          waitUntil: 'domcontentloaded', 
          timeout: 12000 
        });
        await waitForJobSelector(page, selector.jobSelector);
        
        // Reduced stability pause from 500ms to 300ms
        await new Promise(resolve => setTimeout(resolve, 300));
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
          // Reduced retry navigation timeout from 10000ms to 8000ms
          await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
          await waitForJobSelector(page, selector.jobSelector);
        } catch (retryNavError) {
          console.error(`Failed to navigate back for retry: ${retryNavError.message}`);
        }
        // Reduced retry delay from 1000ms to 600ms
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }
  }
  
  try {
    // Reduced final navigation timeout from 15000ms to 10000ms
    await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
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
 * DEPRECATED: Use extractFromNextPage instead
 */
async function extractDescriptionNextPage(page, applyLink, selector, originalUrl, jobNumber) {
  const { description } = await extractFromNextPage(page, applyLink, selector, originalUrl, jobNumber);
  return description;
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

function validateDescriptionForExperience(description) {
  if (!description || description === 'Description content not available' || description === 'No description found') {
    return { hasExperience: false, confidence: 0 };
  }
  
  const experienceIndicators = [
    /\d+\s*\+?\s*years?\s*(?:of\s*)?(?:experience|exp|work)/gi,
    /(?:minimum|require|need|must have)\s*\d+\s*years?/gi,
    /(?:experience|background|qualification).*?\d+\s*years?/gi,
    /\d+\s*years?\s*(?:minimum|required|needed)/gi
  ];
  
  const matches = experienceIndicators.reduce((count, pattern) => {
    const found = (description.match(pattern) || []).length;
    return count + found;
  }, 0);
  
  return {
    hasExperience: matches > 0,
    confidence: Math.min(matches * 0.3, 1),
    matchCount: matches
  };
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
      
      // Reduced timeout from 15000ms to 12000ms
      await page.goto(job.applyLink, { 
        waitUntil: 'domcontentloaded', 
        timeout: 12000 
      });
      
      // Reduced timeout from 8000ms to 6000ms
      await page.waitForSelector(selector.descriptionSelector, { timeout: 6000 });
      job.description = await extractAndFormatDescription(page, selector.descriptionSelector);
      
      console.log(`Batch description extracted (${job.description.length} characters)`);
      
      // Reduced delay from 500ms to 300ms
      await new Promise(resolve => setTimeout(resolve, 300));
      
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