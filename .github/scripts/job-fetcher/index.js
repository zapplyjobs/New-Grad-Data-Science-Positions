#!/usr/bin/env node

/**
 * Main entry point for the job fetcher system
 * 
 * This module orchestrates the entire job fetching and processing pipeline:
 * 1. Fetches jobs from multiple sources (APIs + career pages)
 * 2. Filters and processes jobs for US positions
 * 3. Generates enhanced README with job listings
 * 4. Handles deduplication and archiving
 */

const { processJobs } = require('./job-processor');
const { updateReadme } = require('./readme-generator');
const { fetchInternshipData, companies } = require('./utils');

// Main execution function
async function main() {
    try {
        console.log('🚀 Starting Zapply job fetching system...');
        console.log('═'.repeat(50));
        
        // Process all jobs (fetch, filter, deduplicate)
        const { currentJobs, archivedJobs, freshJobs, stats } = await processJobs();
        
        // Fetch internship data
        const internshipData = await fetchInternshipData();
        
        // Update README with current job state
        await updateReadme(currentJobs, archivedJobs, internshipData, stats);
        
        // Print final summary
        console.log('\n🎉 Job fetching completed successfully!');
        console.log('═'.repeat(50));
        console.log(`📊 Final Stats:`);
        console.log(`   • Current jobs: ${currentJobs.length}`);
        console.log(`   • Fresh jobs: ${freshJobs.length}`);
        console.log(`   • Archived jobs: ${archivedJobs.length}`);
        console.log(`   • Companies: ${Object.keys(stats.totalByCompany).length}`);
        console.log(`   • FAANG+ jobs: ${currentJobs.filter(job => 
            companies.faang_plus.some(c => c.name === job.employer_name)
        ).length}`);
        
        if (freshJobs.length > 0) {
            console.log(`\n📬 ${freshJobs.length} new jobs prepared for Discord posting`);
        } else {
            console.log(`\nℹ️ No new jobs found - all positions already processed`);
        }

        // Force exit after completion
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Fatal error in job fetching system:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Execute if run directly
if (require.main === module) {
    main();
}

module.exports = { main };