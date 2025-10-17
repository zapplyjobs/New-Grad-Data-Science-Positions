const { navigateToPage, preparePageForExtraction, waitForJobSelector } = require('./navigationService.js');
const { buildApplyLink, convertToDescriptionLink } = require('../utils/urlBuilder.js');
const { EXTRACTION_CONSTANTS } = require('../utils/constants.js');

/**
 * OPTIMIZED COMPANY GROUPING BY SELECTOR PATTERNS
 * 
 * GROUP A - WORKDAY PATTERN (Same-page modal):
 *   Analog Devices, BAE Systems, Broadcom, GDIT, Guidehouse, HPE, 
 *   Illumina, Intel, Magna, Marvel, NVIDIA, Verizon, Workday
 *   Pattern: li.css-1q2dra3 with same-page descriptions
 * 
 * GROUP B - PHENOM PATTERN (Next-page navigation):
 *   AMD, Apple, Rivian
 *   Pattern: mat-expansion-panel or similar with next-page descriptions
 * 
 * GROUP C - CUSTOM CARD PATTERN (Same-page modal):
 *   Applied Materials, Infineon, Micron
 *   Pattern: div.cardContainer with same-page descriptions
 * 
 * GROUP D - PHENOM INLINE PATTERN (Same-page modal):
 *   10x Genomics, Honeywell, JPMorgan Chase, Texas Instruments
 *   Pattern: Custom job tiles with infinite scroll and same-page modal
 * 
 * GROUP E - SPECIAL CASES:
 *   Microsoft (Click URL extraction)
 *   Cisco (Table-based layout)
 *   ABB, Arm, AI Jobs, Synopsys (Next-page with unique patterns)
 */

const COMPANY_GROUPS = {
  WORKDAY_MODAL: [
    'Analog Devices', 'BAE Systems', 'Broadcom', 'General Dynamics',
    'Guidehouse', 'Hewlett Packard Enterprise', 'Illumina', 'Intel',
    'Magna International', 'Marvel Technology', 'NVIDIA', 'Verizon', 'Workday'
  ],
  PHENOM_NEXT_PAGE: ['AMD', 'Apple', 'RIVIAN'],
  CARD_MODAL: ['Applied Materials', 'Infineon Technologies', 'Micron Technology'],
  TILE_MODAL: ['10x Genomics', 'Honeywell', 'JPMorgan Chase', 'Texas Instruments'],
  NEXT_PAGE_UNIQUE: ['ABB', 'Arm', 'AI Jobs', 'Synopsys'],
  CLICK_URL: ['Microsoft'],
  TABLE_LAYOUT: ['Cisco'],
  NO_DESCRIPTION: ['Amazon', 'Google', 'Meta', 'IBM', 'Waymo']
};

/**
 * Get company group for optimized processing
 */
function getCompanyGroup(companyName) {
  for (const [group, companies] of Object.entries(COMPANY_GROUPS)) {
    if (companies.includes(companyName)) {
      return group;
    }
  }
  return 'UNKNOWN';
}

/**
 * Apply company-specific slicing
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
 * Main extraction function with optimized group routing
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

    const companyGroup = getCompanyGroup(selector.name);
    console.log(`🎯 Company Group: ${companyGroup} for ${selector.name}`);

    // Route to optimized extraction based on company group
    switch (companyGroup) {
      case 'WORKDAY_MODAL':
        return await extractWorkdayModal(page, jobElements, selector, company, pageNum);
      
      case 'PHENOM_NEXT_PAGE':
        return await extractPhenomNextPage(page, jobElements, selector, company, pageNum);
      
      case 'CARD_MODAL':
        return await extractCardModal(page, jobElements, selector, company, pageNum);
      
      case 'TILE_MODAL':
        return await extractTileModal(page, jobElements, selector, company, pageNum);
      
      case 'NEXT_PAGE_UNIQUE':
        return await extractNextPageUnique(page, jobElements, selector, company, pageNum);
      
      case 'CLICK_URL':
        return await extractClickUrl(page, jobElements, selector, company, pageNum);
      
      case 'TABLE_LAYOUT':
        return await extractTableLayout(page, jobElements, selector, company, pageNum);
      
      case 'NO_DESCRIPTION':
        return await extractNoDescription(page, jobElements, selector, company, pageNum);
      
      default:
        console.warn(`Unknown group: ${companyGroup}, using fallback`);
        return await extractGenericModal(page, jobElements, selector, company, pageNum);
    }

  } catch (error) {
    console.error(`Error scraping ${company.name} page ${pageNum}: ${error.message}`);
  }

  return jobs;
}

/**
 * GROUP A: Workday Modal Pattern (13 companies)
 * Optimized for: li.css-1q2dra3 with chevron pagination
 * Strategy: Batch extract basic data, then modal descriptions
 */
async function extractWorkdayModal(page, jobElements, selector, company, pageNum) {
  console.log(`⚡ WORKDAY_MODAL: Processing ${jobElements.length} jobs...`);
  return await extractWithSamePageModal(page, jobElements, selector, company, pageNum);
}

/**
 * GROUP B: Phenom Next Page Pattern (3 companies)
 * AMD, Apple, Rivian - require page navigation for descriptions
 */
async function extractPhenomNextPage(page, jobElements, selector, company, pageNum) {
  console.log(`🔄 PHENOM_NEXT_PAGE: Processing ${jobElements.length} jobs...`);
  return await extractWithNextPageNavigation(page, jobElements, selector, company, pageNum);
}

/**
 * GROUP C: Card Modal Pattern (3 companies)
 * Applied Materials, Infineon, Micron - card-based with same-page modal
 */
async function extractCardModal(page, jobElements, selector, company, pageNum) {
  console.log(`⚡ CARD_MODAL: Processing ${jobElements.length} jobs...`);
  return await extractWithSamePageModal(page, jobElements, selector, company, pageNum);
}

/**
 * GROUP D: Tile Modal Pattern (4 companies)
 * JPMC, Honeywell, TI, 10x Genomics - custom tiles with infinite scroll
 * SPECIAL: JPMC has next-page posted date extraction
 */
async function extractTileModal(page, jobElements, selector, company, pageNum) {
  console.log(`⚡ TILE_MODAL: Processing ${jobElements.length} jobs...`);
  
  // Check if JPMC needs next-page posted date
  if (selector.name === 'JPMorgan Chase' && selector.postedType === 'next-page') {
    return await extractTileWithNextPagePosted(page, jobElements, selector, company, pageNum);
  }
  
  return await extractWithSamePageModal(page, jobElements, selector, company, pageNum);
}

/**
 * GROUP E: Next Page Unique (4 companies)
 * ABB, Arm, AI Jobs, Synopsys - unique patterns requiring navigation
 */
async function extractNextPageUnique(page, jobElements, selector, company, pageNum) {
  console.log(`🔄 NEXT_PAGE_UNIQUE: Processing ${jobElements.length} jobs...`);
  return await extractWithNextPageNavigation(page, jobElements, selector, company, pageNum);
}

/**
 * CLICK URL: Microsoft (1 company)
 * Extracts URL by clicking each job
 */
async function extractClickUrl(page, jobElements, selector, company, pageNum) {
  console.log(`🖱️ CLICK_URL: Processing ${jobElements.length} jobs...`);
  const jobs = [];
  
  for (let i = 0; i < jobElements.length; i++) {
    try {
      // Re-query to avoid stale references
      const freshElements = await page.$$(selector.jobSelector);
      
      if (i >= freshElements.length) {
        console.warn(`[${i + 1}] Job element no longer exists`);
        continue;
      }
      
      const jobData = await extractBasicJobData(page, freshElements[i], selector, company, i, pageNum);
      
      // Extract URL by clicking
      try {
        await freshElements[i].click();
        await new Promise(resolve => setTimeout(resolve, 1200));
        jobData.applyLink = page.url();
        console.log(`[${i + 1}] ✅ URL: ${jobData.applyLink}`);
      } catch (error) {
        console.warn(`[${i + 1}] Click failed: ${error.message}`);
        jobData.applyLink = company.baseUrl || '';
      }
      
      if (jobData.title || jobData.applyLink) {
        jobs.push(jobData);
      }
    } catch (error) {
      console.warn(`[${i + 1}] Extraction failed: ${error.message}`);
    }
  }
  
  console.log(`✅ CLICK_URL completed: ${jobs.length} jobs`);
  return jobs;
}

/**
 * TABLE LAYOUT: Cisco (1 company)
 * Table-based layout with offset pagination
 */
async function extractTableLayout(page, jobElements, selector, company, pageNum) {
  console.log(`📊 TABLE_LAYOUT: Processing ${jobElements.length} jobs...`);
  return await extractNoDescription(page, jobElements, selector, company, pageNum);
}

/**
 * NO DESCRIPTION: Fast extraction (5 companies)
 * Amazon, Google, Meta, IBM, Waymo - basic data only
 */
async function extractNoDescription(page, jobElements, selector, company, pageNum) {
  console.log(`⚡⚡ NO_DESCRIPTION: Processing ${jobElements.length} jobs...`);
  const jobs = [];
  
  for (let i = 0; i < jobElements.length; i++) {
    try {
      const jobData = await extractBasicJobData(page, jobElements[i], selector, company, i, pageNum);
      
      if (jobData.title || jobData.applyLink) {
        jobData.description = 'No description available';
        jobs.push(jobData);
      }
    } catch (error) {
      console.warn(`[${i + 1}] Basic extraction failed: ${error.message}`);
    }
  }
  
  console.log(`✅ NO_DESCRIPTION completed: ${jobs.length} jobs`);
  return jobs;
}

/**
 * CORE: Same-page modal extraction (FASTEST for most companies)
 * Used by: Workday Modal (13), Card Modal (3), Tile Modal (3-4)
 */
async function extractWithSamePageModal(page, jobElements, selector, company, pageNum) {
  const jobs = [];
  const jobCount = jobElements.length;
  
  // PHASE 1: Extract ALL basic data first (FAST)
  const basicJobDataList = [];
  for (let i = 0; i < jobCount; i++) {
    try {
      const jobData = await extractBasicJobData(page, jobElements[i], selector, company, i, pageNum);
      if (jobData.title || jobData.applyLink) {
        basicJobDataList.push({ jobData, index: i });
      }
    } catch (error) {
      console.warn(`[${i + 1}] Basic data failed: ${error.message}`);
    }
  }
  
  console.log(`✅ Extracted ${basicJobDataList.length} basic entries`);
  
  // PHASE 2: Extract descriptions via modal (if selector exists)
  if (selector.descriptionSelector) {
    for (const entry of basicJobDataList) {
      const { jobData, index } = entry;
      
      try {
        jobData.description = await extractDescriptionModal(
          page, 
          index, 
          selector, 
          index + 1
        );
      } catch (error) {
        console.warn(`[${index + 1}] Description failed: ${error.message}`);
        jobData.description = 'Description extraction failed';
      }
      
      jobs.push(jobData);
    }
  } else {
    // No description selector - add all jobs as-is
    for (const entry of basicJobDataList) {
      entry.jobData.description = 'No description selector provided';
      jobs.push(entry.jobData);
    }
  }
  
  console.log(`✅ Same-page modal completed: ${jobs.length} jobs`);
  return jobs;
}

/**
 * CORE: Next-page navigation extraction (SLOWER)
 * Used by: Phenom (3), Next Page Unique (4)
 */
async function extractWithNextPageNavigation(page, jobElements, selector, company, pageNum) {
  const jobs = [];
  const jobCount = jobElements.length;
  const currentUrl = page.url();
  
  // PHASE 1: Extract ALL basic data upfront
  const basicJobDataList = [];
  for (let i = 0; i < jobCount; i++) {
    try {
      const jobData = await extractBasicJobData(page, jobElements[i], selector, company, i, pageNum);
      if (jobData.title || jobData.applyLink) {
        basicJobDataList.push({ jobData, index: i });
      }
    } catch (error) {
      console.warn(`[${i + 1}] Basic data failed: ${error.message}`);
    }
  }
  
  console.log(`✅ Extracted ${basicJobDataList.length} basic entries`);
  
  // PHASE 2: Navigate to each job page
  for (const entry of basicJobDataList) {
    const { jobData, index } = entry;
    
    if (jobData.applyLink && (selector.descriptionSelector || selector.postedType === 'next-page')) {
      try {
        const { description, posted } = await extractFromNextPage(
          page, 
          jobData.applyLink, 
          selector, 
          currentUrl, 
          index + 1,
          jobData.posted
        );
        
        if (selector.descriptionSelector) {
          jobData.description = description;
        }
        
        if (selector.postedType === 'next-page') {
          jobData.posted = posted;
        }
      } catch (error) {
        console.warn(`[${index + 1}] Next-page failed: ${error.message}`);
        jobData.description = 'Next-page extraction failed';
      }
    }
    
    jobs.push(jobData);
  }
  
  console.log(`✅ Next-page navigation completed: ${jobs.length} jobs`);
  return jobs;
}

/**
 * SPECIAL: Tile with next-page posted date (JPMC only)
 * Extracts descriptions via modal, but posted date via navigation
 */
async function extractTileWithNextPagePosted(page, jobElements, selector, company, pageNum) {
  const jobs = [];
  const jobCount = jobElements.length;
  const currentUrl = page.url();
  
  console.log(`⚡🔄 TILE_MODAL with NEXT_PAGE_POSTED: Processing ${jobCount} jobs...`);
  
  // PHASE 1: Extract basic data
  const basicJobDataList = [];
  for (let i = 0; i < jobCount; i++) {
    try {
      const jobData = await extractBasicJobData(page, jobElements[i], selector, company, i, pageNum);
      if (jobData.title || jobData.applyLink) {
        basicJobDataList.push({ jobData, index: i });
      }
    } catch (error) {
      console.warn(`[${i + 1}] Basic data failed: ${error.message}`);
    }
  }
  
  console.log(`✅ Extracted ${basicJobDataList.length} basic entries`);
  
  // PHASE 2: Extract descriptions via modal + posted via navigation
  for (const entry of basicJobDataList) {
    const { jobData, index } = entry;
    
    // Extract description via same-page modal
    if (selector.descriptionSelector) {
      try {
        jobData.description = await extractDescriptionModal(
          page, 
          index, 
          selector, 
          index + 1
        );
      } catch (error) {
        console.warn(`[${index + 1}] Modal description failed: ${error.message}`);
        jobData.description = 'Modal description failed';
      }
    }
    
    // Extract posted date via next-page navigation
    if (jobData.applyLink && selector.postedType === 'next-page' && selector.postedSelector) {
      try {
        const { posted } = await extractFromNextPage(
          page, 
          jobData.applyLink, 
          selector, 
          currentUrl, 
          index + 1,
          jobData.posted
        );
        jobData.posted = posted;
      } catch (error) {
        console.warn(`[${index + 1}] Posted date extraction failed: ${error.message}`);
      }
    }
    
    jobs.push(jobData);
  }
  
  console.log(`✅ JPMC extraction completed: ${jobs.length} jobs`);
  return jobs;
}

/**
 * GENERIC: Fallback for unknown patterns
 */
async function extractGenericModal(page, jobElements, selector, company, pageNum) {
  console.log(`⚠️ GENERIC: Using fallback for ${selector.name}...`);
  
  const descriptionType = selector.descriptionType || 'same-page';
  const needsNextPage = descriptionType === 'next-page' || selector.postedType === 'next-page';
  
  if (needsNextPage) {
    return await extractWithNextPageNavigation(page, jobElements, selector, company, pageNum);
  } else {
    return await extractWithSamePageModal(page, jobElements, selector, company, pageNum);
  }
}

/**
 * Extract basic job data (title, location, posted, link)
 */
async function extractBasicJobData(page, jobElement, selector, company, index, pageNum) {
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

  // Build apply link
  const finalApplyLink = buildApplyLink(rawJobData.applyLink, company.baseUrl || '');

  // Build job object
  const job = {
    company: selector.name,
    title: rawJobData.title,
    applyLink: finalApplyLink || company.baseUrl || '',
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
 * Extract description using modal/sidebar (OPTIMIZED)
 */
async function extractDescriptionModal(page, jobIndex, selector, jobNumber) {
  const MAX_RETRIES = 2;
  let retries = MAX_RETRIES;
  
  while (retries > 0) {
    try {
      console.log(`[${jobNumber}] Modal (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})...`);
      
      await page.waitForSelector(selector.jobSelector, { timeout: 5000 });
      
      // Click using page.evaluate to avoid detached nodes
      const clickResult = await page.evaluate((jobSelector, titleSelector, jobIdx, companyName) => {
        let jobElements = document.querySelectorAll(jobSelector);
        
        // Apply slicing for specific companies
        const LIMIT = 15;
        if (companyName === 'Applied Materials') {
          jobElements = Array.from(jobElements).slice(-LIMIT);
        } else if (companyName === 'Infineon Technologies' || companyName === 'Arm') {
          jobElements = Array.from(jobElements).slice(0, LIMIT);
        }
        
        if (!jobElements[jobIdx]) {
          return { success: false, error: `Element ${jobIdx} not found` };
        }
        
        const titleElement = jobElements[jobIdx].querySelector(titleSelector);
        if (!titleElement) {
          return { success: false, error: 'Title not found' };
        }
        
        titleElement.click();
        return { success: true };
      }, selector.jobSelector, selector.titleSelector, jobIndex, selector.name);
      
      if (!clickResult.success) {
        throw new Error(clickResult.error);
      }
      
      // Wait for modal/description
      await new Promise(resolve => setTimeout(resolve, 1500));
      await page.waitForSelector(selector.descriptionSelector, { timeout: 8000 });
      
      const description = await extractAndFormatDescription(page, selector.descriptionSelector);
      
      console.log(`[${jobNumber}] ✅ Modal extracted (${description.length} chars)`);
      return description;
      
    } catch (error) {
      retries--;
      console.warn(`[${jobNumber}] ❌ Attempt ${MAX_RETRIES - retries} failed: ${error.message}`);
      
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
          await waitForJobSelector(page, selector.jobSelector);
        } catch (waitError) {
          console.warn(`[${jobNumber}] Wait failed: ${waitError.message}`);
        }
      } else {
        console.error(`[${jobNumber}] 🛑 All retries exhausted`);
        break;
      }
    }
  }
  
  return 'Modal description extraction failed';
}

/**
 * Extract description from next page
 */
async function extractFromNextPage(page, applyLink, selector, originalUrl, jobNumber, fallbackPosted = 'Recently') {
  const MAX_RETRIES = 2;
  let retries = MAX_RETRIES;
  
  while (retries > 0) {
    try {
      console.log(`[${jobNumber}] Next-page (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})...`);
      
      const descriptionLink = convertToDescriptionLink(applyLink, selector.name);
      
      await page.goto(descriptionLink, { 
        waitUntil: 'domcontentloaded', 
        timeout: 20000 
      });

      let description = 'Description not available';
      let posted = fallbackPosted;

      // Extract description
      if (selector.descriptionSelector) {
        try {
          await page.waitForSelector(selector.descriptionSelector, { timeout: 10000 });
          description = await extractAndFormatDescription(page, selector.descriptionSelector);
          console.log(`[${jobNumber}] ✅ Description (${description.length} chars)`);
        } catch (descError) {
          console.warn(`[${jobNumber}] Description failed: ${descError.message}`);
        }
      }

      // Extract posted date
      if (selector.postedType === 'next-page' && selector.postedSelector) {
        try {
          await page.waitForSelector(selector.postedSelector, { timeout: 5000 });
          posted = await page.$eval(selector.postedSelector, el => el.textContent.trim());
          console.log(`[${jobNumber}] Posted: ${posted}`);
        } catch (postedError) {
          console.warn(`[${jobNumber}] Posted failed: ${postedError.message}`);
        }
      }
      
      // Navigate back
      try {
        await page.goto(originalUrl, { 
          waitUntil: 'domcontentloaded', 
          timeout: 15000 
        });
        await waitForJobSelector(page, selector.jobSelector);
        await new Promise(resolve => setTimeout(resolve, 800));
        console.log(`[${jobNumber}] ✅ Returned to listing`);
      } catch (backNavError) {
        console.error(`[${jobNumber}] ❌ Nav back failed: ${backNavError.message}`);
      }
      
      return { description, posted };
      
    } catch (error) {
      retries--;
      console.warn(`[${jobNumber}] ❌ Attempt ${MAX_RETRIES - retries} failed: ${error.message}`);
      
      if (retries > 0) {
        try {
          await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await waitForJobSelector(page, selector.jobSelector);
        } catch (retryNavError) {
          console.error(`Nav back for retry failed: ${retryNavError.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }
  
  // Final nav back
  try {
    await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForJobSelector(page, selector.jobSelector);
  } catch (finalNavError) {
    console.error(`[${jobNumber}] Final nav failed: ${finalNavError.message}`);
  }
  
  return { 
    description: 'Next-page extraction failed',
    posted: fallbackPosted
  };
}

/**
 * Extract and format description text
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
          priority: hasHighPriority ? 'high' : 'medium'
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
    
    const sentences = allText
      .split(/[.!?;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20);
    
    const experienceKeywords = [
      'year', 'experience', 'minimum', 'require', 'must', 'need', 'prefer',
      'background', 'qualification', 'degree', 'education', 'skill'
    ];
    
    const experienceRelated = sentences.filter(s => 
      experienceKeywords.some(k => s.toLowerCase().includes(k))
    );
    
    const otherSentences = sentences.filter(s => 
      !experienceKeywords.some(k => s.toLowerCase().includes(k))
    );
    
    const prioritizedSentences = [...experienceRelated, ...otherSentences].slice(0, 8);
    
    if (prioritizedSentences.length === 0) {
      let cleanText = allText.trim();
      cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
      if (!cleanText.match(/[.!?]$/)) cleanText += '.';
      return `• ${cleanText}`;
    }
    
    return prioritizedSentences
      .map(sentence => {
        let clean = sentence.trim().replace(/\s+/g, ' ');
        clean = clean.charAt(0).toUpperCase() + clean.slice(1);
        if (!clean.match(/[.!?]$/)) clean += '.';
        return `• ${clean}`;
      })
      .join('\n');
      
  }, descriptionSelector);
}

module.exports = {
  extractJobData,
  extractBasicJobData,
  extractDescriptionModal,
  extractFromNextPage,
  getCompanyGroup,
  COMPANY_GROUPS
};