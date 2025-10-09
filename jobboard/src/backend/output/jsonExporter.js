// utils/jsonExporter.js
const fs = require('fs');
const path = require('path');

function exportJobsToJSON(jobs, options = {}) {
  const {
    filename = 'jobs.json',
    includeMetadata = true,
    prettyPrint = true,
    searchQuery = ''
  } = options;

  const filePath = path.join(__dirname, '..', filename);
  
  let output;
  
  if (includeMetadata) {
    output = {
      metadata: {
        total_jobs: jobs.length,
        search_query: searchQuery,
        scrape_date: new Date().toISOString(),
        unique_companies: [...new Set(jobs.map(job => job.employer_name))],
        unique_locations: [...new Set(jobs.map(job => `${job.job_city}, ${job.job_state}`))].length
      },
      jobs: jobs
    };
  } else {
    output = jobs;
  }

  fs.writeFileSync(
    filePath, 
    prettyPrint ? JSON.stringify(output, null, 2) : JSON.stringify(output)
  );
  
  console.log(`✅ Jobs exported to: ${filePath}`);
  return filePath;
}

module.exports = {
  exportJobsToJSON
};