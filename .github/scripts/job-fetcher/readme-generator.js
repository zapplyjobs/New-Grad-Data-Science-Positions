const fs = require("fs");
const companyCategory = require("./datascience.json");
const {
  companies,
  ALL_COMPANIES,
  getCompanyEmoji,
  getCompanyCareerUrl,
  formatTimeAgo,
  getExperienceLevel,
  getJobCategory,
  formatLocation,
} = require("./utils");

function generateJobTable(jobs) {
  console.log(
    `🔍 DEBUG: Starting generateJobTable with ${jobs.length} total jobs`
  );

  if (jobs.length === 0) {
    return `| Company | Role | Location | Apply Now | Age |
|---------|------|----------|-----------|-----|
| *No current openings* | *Check back tomorrow* | *-* | *-* | *-* |`;
  }

  // Create a map of lowercase company names to actual names for case-insensitive matching
  const companyNameMap = new Map();
  Object.entries(companyCategory).forEach(([categoryKey, category]) => {
    category.companies.forEach((company) => {
      companyNameMap.set(company.toLowerCase(), {
        name: company,
        category: categoryKey,
        categoryTitle: category.title,
      });
    });
  });

  console.log(`🏢 DEBUG: Configured companies by category:`);
  Object.entries(companyCategory).forEach(([categoryKey, category]) => {
    console.log(
      `  ${category.emoji} ${category.title}: ${category.companies.join(", ")}`
    );
  });

  // Get unique companies from job data
  const uniqueJobCompanies = [...new Set(jobs.map((job) => job.employer_name))];
  console.log(
    `\n📊 DEBUG: Unique companies found in job data (${uniqueJobCompanies.length}):`,
    uniqueJobCompanies
  );

  // Group jobs by company - only include jobs from valid companies
  const jobsByCompany = {};
  const processedCompanies = new Set();
  const skippedCompanies = new Set();

  jobs.forEach((job) => {
    const employerNameLower = job.employer_name.toLowerCase();
    const matchedCompany = companyNameMap.get(employerNameLower);

    // Only process jobs from companies in our category list
    if (matchedCompany) {
      processedCompanies.add(job.employer_name);
      if (!jobsByCompany[matchedCompany.name]) {
        jobsByCompany[matchedCompany.name] = [];
      }
      jobsByCompany[matchedCompany.name].push(job);
    } else {
      skippedCompanies.add(job.employer_name);
    }
  });

  console.log(`\n✅ DEBUG: Companies INCLUDED (${processedCompanies.size}):`, [
    ...processedCompanies,
  ]);
  console.log(`\n❌ DEBUG: Companies SKIPPED (${skippedCompanies.size}):`, [
    ...skippedCompanies,
  ]);

  // Log job counts by company
  console.log(`\n📈 DEBUG: Job counts by company:`);
  Object.entries(jobsByCompany).forEach(([company, jobs]) => {
    const companyInfo = companyNameMap.get(company.toLowerCase());
    console.log(
      `  ${company}: ${jobs.length} jobs (Category: ${
        companyInfo?.categoryTitle || "Unknown"
      })`
    );
  });

  let output = "";

  // Handle each category
  Object.entries(companyCategory).forEach(([categoryKey, categoryData]) => {
    // Filter companies that actually have jobs
    const companiesWithJobs = categoryData.companies.filter(
      (company) => jobsByCompany[company] && jobsByCompany[company].length > 0
    );

    if (companiesWithJobs.length > 0) {
      const totalJobs = companiesWithJobs.reduce(
        (sum, company) => sum + jobsByCompany[company].length,
        0
      );

      console.log(
        `\n📝 DEBUG: Processing category "${categoryData.title}" with ${companiesWithJobs.length} companies and ${totalJobs} total jobs:`
      );
      companiesWithJobs.forEach((company) => {
        console.log(`  - ${company}: ${jobsByCompany[company].length} jobs`);
      });

      // Use singular/plural based on job count
      const positionText = totalJobs === 1 ? "position" : "positions";
      output += `### ${categoryData.emoji} **${categoryData.title}** (${totalJobs} ${positionText})\n\n`;

      // Handle ALL companies with their own sections (regardless of job count)
      companiesWithJobs.forEach((companyName) => {
        const companyJobs = jobsByCompany[companyName];
        const emoji = getCompanyEmoji(companyName);
        const positionText =
          companyJobs.length === 1 ? "position" : "positions";

        // Use collapsible details for companies with more than 15 jobs
        if (companyJobs.length > 15) {
          output += `<details>\n`;
          output += `<summary><h4>${emoji} <strong>${companyName}</strong> (${companyJobs.length} ${positionText})</h4></summary>\n\n`;
        } else {
          output += `#### ${emoji} **${companyName}** (${companyJobs.length} ${positionText})\n\n`;
        }

        output += `| Role | Location | Apply Now | Age |\n`;
        output += `|------|----------|-----------|-----|\n`;

        companyJobs.forEach((job) => {
          const role = job.job_title;
          const location = formatLocation(job.job_city, job.job_state);
          const posted = job.job_posted_at;
          const applyLink =
            job.job_apply_link || getCompanyCareerUrl(job.employer_name);

          let statusIndicator = "";
          const description = (job.job_description || "").toLowerCase();
          if (
            description.includes("no sponsorship") ||
            description.includes("us citizen")
          ) {
            statusIndicator = " 🇺🇸";
          }
          if (description.includes("remote")) {
            statusIndicator += " 🏠";
          }

          output += `| ${role}${statusIndicator} | ${location} | [<img src="./image.png" width="100" alt="Apply">](${applyLink}) | ${posted} |\n`;
        });

        if (companyJobs.length > 15) {
          output += `\n</details>\n\n`;
        } else {
          output += "\n";
        }
      });
    }
  });

  console.log(
    `\n🎉 DEBUG: Finished generating job table with ${
      Object.keys(jobsByCompany).length
    } companies processed`
  );
  return output;
}
function generateInternshipSection(internshipData) {
  if (!internshipData) 
    return ''

 return `
---

## 🎓 **Data Internships 2025-2026**

Top internships for students in data science, statistics, analytics, and related majors.

### 🏢 **FAANG+ Internship Programs**

| Company | Program | Apply Now |
|---------|---------|-----------|
${internshipData.companyPrograms
  .map((program) => {
  
    return `| ${program.emogi} **${program.company}** | ${program.program} |<a href="${program.url}"  target="_blank"><img src="./image.png" width="100" alt="Apply"></a>|`;
  })
  .join("\n")}

### 📚 **Top Data Internship Resources**

| Platform | Description | Visit Now |
|----------|-------------|-----------|
${internshipData.sources
  .map(
    (source) =>
      `| **${source.emogi} ${source.name}** | ${source.description} | <a href="${source.url}"  target="_blank"><img src="./image1.png" width="100" alt="Visit Now"></a>|`
  )
  .join("\n")}

`;
}

function generateArchivedSection(archivedJobs, stats) {
  if (archivedJobs.length === 0) {
    return "";
  }

  const archivedFaangJobs = archivedJobs.filter((job) =>
    companies.faang_plus.some((c) => c.name === job.employer_name)
  ).length;

  const archivedJobTable = generateJobTable(archivedJobs);

  return `<details>
<summary><h2>📁 <strong>Archived Data Jobs – ${archivedJobs.length} (7+ days old)</strong> - Click to Expand</h2></summary>

Either still hiring or useful for research.

### **Archived Job Stats**

📁 **Total Jobs:** ${archivedJobs.length} positions

🏢 **Companies:** ${Object.keys(stats.totalByCompany).length} companies

⭐ **FAANG+ Jobs & Internships:** ${archivedFaangJobs} roles

${archivedJobTable}

</details>`;
}

async function generateReadme(currentJobs, archivedJobs = [], internshipData = null, stats = null) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalCompanies = Object.keys(stats?.totalByCompany || {}).length;
  const faangJobs = currentJobs.filter((job) =>
    companies.faang_plus.some((c) => c.name === job.employer_name)
  ).length;

  const jobTable = generateJobTable(currentJobs);
  const internshipSection = generateInternshipSection(internshipData);
  const archivedSection = generateArchivedSection(archivedJobs, stats);

  return `# 📊 Data Science & Analytics Jobs & Internships 2025-2026 by Zapply

🚀 Real-time data science and data analysis jobs from ${totalCompanies}+ top companies like Tesla, NVIDIA, and Raytheon. Updated every 24 hours with ${currentJobs.length}+ fresh opportunities for data analysts, scientists, and entry-level analytics grads.

🎯 Includes both tech giants and diverse industry leaders like Chewy, TD Bank, and CACI.

🛠 Help us grow! Add new jobs by submitting an issue! View contributing steps [here](CONTRIBUTING-GUIDE.md).

---

## Join Community button

🤗 [Job Finder & Career Hub by Zapply](https://discord.gg/yKWw28q7Yq) – Connect with fellow job seekers, get career advice, share experiences, and stay updated on the latest opportunities. Join our community of analytics students and data enthusiasts navigating their career journey together!

---

## 📊 **Live Stats**

🔥 **Current Positions:** ${currentJobs.length} hot data-focused jobs 
🏢 **Top Companies:** ${totalCompanies} elite tech including Tesla, NVIDIA, Raytheon  
⭐ **FAANG+ Jobs & Internships:** ${faangJobs} premium opportunities  
📅 **Last Updated:** ${currentDate}  
🤖 **Next Update:** Tomorrow at 9 AM UTC  
📁 **Archived Developer Jobs:** ${archivedJobs.length} (older than 1 week)

${internshipData ? generateInternshipSection(internshipData) : ""}

---


## 🎯 Fresh Data Science Job Listings 2025-2026 (under 1 week)

${generateJobTable(currentJobs)}

---

## **✨ Insights on the Repo**

### 🏢 **Top Companies**

#### ⭐ **FAANG+** (${(() => {
  const count = companies?.faang_plus?.filter(c => currentJobs.filter(job => job.employer_name === c.name).length > 0).length || 0;
  return `${count} ${count === 1 ? 'company' : 'companies'}`;
})()})
${companies?.faang_plus?.filter(c => currentJobs.filter(job => job.employer_name === c.name).length > 0).map((c, index) => {
  const totalJobs = currentJobs.filter(job => job.employer_name === c.name).length;
  const jobText = totalJobs === 1 ? 'position' : 'positions';
  if (index === 0) {
    return `${c.emoji} **[${c.name}](${c.career_url})** (${totalJobs} ${jobText})`;
  } else {
    return `${c.emoji} **[${c.name}](${c.career_url})** (${totalJobs})`;
  }
}).join(" • ") || "No companies available"}


#### 💰 **Fintech Leaders** (${(() => {
  const count = companies?.fintech?.filter(c => currentJobs.filter(job => job.employer_name === c.name).length > 0).length || 0;
  return `${count} ${count === 1 ? 'company' : 'companies'}`;
})()})
${companies?.fintech?.filter(c => currentJobs.filter(job => job.employer_name === c.name).length > 0).map((c, index) => {
  const totalJobs = currentJobs.filter(job => job.employer_name === c.name).length;
  const jobText = totalJobs === 1 ? 'position' : 'positions';
  if (index === 0) {
    return `${c.emoji} **[${c.name}](${c.career_url})** (${totalJobs} ${jobText})`;
  } else {
    return `${c.emoji} **[${c.name}](${c.career_url})** (${totalJobs})`;
  }
}).join(" • ") || "No companies available"}


#### ☁️ **Enterprise & Cloud** (${(() => {
  const count = [...(companies?.enterprise_saas || []), ...(companies?.top_tech || [])].filter(c => currentJobs.filter(job => job.employer_name === c.name).length > 0).length || 0;
  return `${count} ${count === 1 ? 'company' : 'companies'}`;
})()})
${[...(companies?.enterprise_saas || []), ...(companies?.top_tech || [])].filter(c => currentJobs.filter(job => job.employer_name === c.name).length > 0).map((c, index) => {
  const totalJobs = currentJobs.filter(job => job.employer_name === c.name).length;
  const jobText = totalJobs === 1 ? 'position' : 'positions';
  if (index === 0) {
    return `${c.emoji} **[${c.name}](${c.career_url})** (${totalJobs} ${jobText})`;
  } else {
    return `${c.emoji} **[${c.name}](${c.career_url})** (${totalJobs})`;
  }
}).join(" • ") || "No companies available"}

---

### 📈 Experience Breakdown

| Level | Count | Percentage | Top Companies |
|-------|-------|------------|---------------|
| 🟢 Entry Level & New Grad | ${stats?.byLevel["Entry-Level"]} | ${stats ? Math.round((stats.byLevel["Entry-Level"] / currentJobs.length) * 100) : 11}% | No or minimal experience. |
| 🟡 Beginner & Early Career | ${stats?.byLevel["Mid-Level"]} | ${stats ? Math.round((stats.byLevel["Mid-Level"] / currentJobs.length) * 100) : 41}% | 1-2 years of experience. |
| 🔴 Manager | ${stats?.byLevel["Senior"]} | ${stats ? Math.round((stats.byLevel["Senior"] / currentJobs.length) * 100) : 48}% | 2+ years of experience. |

### 🌍 Top Locations

List of top locations and number of positions.

${stats ? Object.entries(stats.byLocation)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8)
  .map(([location, count]) => `- **${location}**: ${count} positions`)
  .join("\n") : ""}

---

## 🔮 Why Data Analysts Choose Our Job Board

✅ **100% Real Jobs:** ${currentJobs.length}+ verified roles for data analysts and scientists from ${totalCompanies} elite tech companies.

✅ **Fresh Daily Updates:** Live company data from Tesla, Raytheon, Chewy, and CACI refreshed every 24 hours automatically.

✅ **Entry-Level Focused:** Smart filtering for internship and entry-level analytics roles.

✅ **Intern-to-FTE Pipeline:** Track internships that convert to full-time roles.

✅ **Direct Applications:** Skip recruiters – apply straight to company career pages for Tesla, Amazon, and NVIDIA positions.

✅ **Mobile-Optimized:** Perfect mobile experience for students job hunting between classes.

---

## 🚀 Job Hunt Tips That Actually Work

### 🔍 Research Before Applying

Find the hiring manager: Search "[Company] [Team] engineering manager" on LinkedIn.

Check recent tech decisions: Read their engineering blog for stack changes or new initiatives.

Verify visa requirements: Look for 🇺🇸 indicator or "US persons only" in job description.

- [Use this 100% ATS-compliant and job-targeted resume template](https://docs.google.com/document/d/1EcP_vX-vTTblCe1hYSJn9apwrop0Df7h/export?format=docx).

### 📄 Resume Best Practices

Mirror their tech stack: Copy exact keywords from job post (SQL, Tableau, Python, R, etc.).

Lead with business impact: "Reduced churn by 12% through cohort analysis" > "Used Excel."

Show product familiarity: "Built Netflix-style recommendation engine" or "Created Stripe payment integration."

- [Read this informative guide on tweaking your resume](https://drive.google.com/uc?export=download&id=1H6ljywqVnxONdYUD304V1QRayYxr0D1e).

### 🎯 Interview Best Practices

Ask domain questions: "How do you ensure model explainability in production?" shows real research.

Prepare case stories: "Improved forecast accuracy by 20% using time-series analysis."

Reference their products: "As a daily Slack user, I've noticed..." proves genuine interest.

- [Review this comprehensive interview guide on common behavioral, technical, and curveball questions](https://drive.google.com/uc?export=download&id=1MGRv7ANu9zEnnQJv4sstshsmc_Nj0Tl0)

---

## 📬 Stay Updated

⭐ **Star this repo** to bookmark and check daily.

👀 **Watch** to get notified of new data postings.

📱 **Bookmark on your phone** for quick job hunting.

🤝 **Become a contributor** and add new jobs! Visit our CONTRIBUTING-GUIDE [here](CONTRIBUTING-GUIDE.md).

---

${archivedJobs.length > 0 ? generateArchivedSection(archivedJobs, stats) : ""}


<div align="center">

**🎯 ${
    currentJobs.length
  } current opportunities from ${totalCompanies} elite companies.**

**Found this helpful? Give it a ⭐ to support us!**

*Not affiliated with any companies listed. All applications redirect to official career pages.*

---

**Last Updated:** ${currentDate} • **Next Update:** Daily at 9 AM UTC

</div>`;
}

async function updateReadme(currentJobs, archivedJobs, internshipData, stats) {
  try {
    console.log("📝 Generating README content...");
    const readmeContent = await generateReadme(
      currentJobs,
      archivedJobs,
      internshipData,
      stats
    );
    fs.writeFileSync("README.md", readmeContent, "utf8");
    console.log(`✅ README.md updated with ${currentJobs.length} current jobs`);

    console.log("\n📊 Summary:");
    console.log(`- Total current: ${currentJobs.length}`);
    console.log(`- Archived:      ${archivedJobs.length}`);
    console.log(
      `- Companies:     ${Object.keys(stats?.totalByCompany || {}).length}`
    );
  } catch (err) {
    console.error("❌ Error updating README:", err);
    throw err;
  }
}

module.exports = {
  generateJobTable,
  generateInternshipSection,
  generateArchivedSection,
  generateReadme,
  updateReadme,
};