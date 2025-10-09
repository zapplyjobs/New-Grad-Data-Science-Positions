const fs = require("fs");
const path = require("path");

// Read selectors.json using fs
const selectorsPath = path.join(__dirname, "selectors.json");
const selectors = JSON.parse(fs.readFileSync(selectorsPath, "utf8"));

function getCompanies(searchQuery = "", pageNum = 1) {
  return {
 "ibm": {
      name: "IBM",
      baseUrl: "https://www.ibm.com",
      url: `https://www.ibm.com/careers/search?field_keyword_18[0]=Entry%20Level&field_keyword_18[1]=Internship&field_keyword_05[0]=United%20States&q=${encodeURIComponent(searchQuery)}&p=${pageNum}`,
      selector: selectors.ibm
      //"job_city": "Entry LevelNew York",
      //done
    },
    
    "infineon": {
      name: "Infineon Technologies",
      baseUrl: "https://jobs.infineon.com/careers",
      url: `https://jobs.infineon.com/careers?query=${encodeURIComponent(searchQuery)}&location=united%20states&pid=563808956305280&Join%20as=student%2Fintern%2Ftrainee&Join%20as=graduate%20%28incl.%20graduate%20programs%29&Join%20as=apprentice&Join%20as=dual%20student&domain=infineon.com&sort_by=relevance`,
      selector: selectors.infineon,
      //done
//no links
    },
    "micron": {
      key: "micron",
      name: "Micron Technology",
      baseUrl: "https://careers.micron.com",
      url: `https://careers.micron.com/careers?query=${encodeURIComponent(searchQuery).replace(/%20/g, '+')}&start=${(pageNum - 1) * 10}&location=united+states&sort_by=solr&filter_include_remote=1&filter_seniority=1%2C0%2C2`,
      selector: selectors.micron
      //click on each job card and use this selector 
      //#job-description-container > div > div > ul:nth-child(8)
    //done
    },

    "siemens": {
      name: "Siemens",
      baseUrl: "https://jobs.siemens.com/careers",
      url: `https://jobs.siemens.com/careers?query=${encodeURIComponent(searchQuery)}&location=USA&pid=563156126459716&level=recent%20college%20graduate&level=student%20%28not%20yet%20graduated%29&level=mid-level%20professional&level=early%20professional&domain=siemens.com&sort_by=relevance&triggerGoButton=false&utm_source=j_c_us`,
      selector: selectors.siemens,
      //no links 
      //already applied filters
      //done

    },

  analogdevices: {
      name: "Analog Devices",
      baseUrl: "https://analogdevices.wd1.myworkdayjobs.com",
      url: `https://analogdevices.wd1.myworkdayjobs.com/External?q=${encodeURIComponent(
        searchQuery
      )}&locationCountry=bc33aa3152ec42d4995f4791a106ed09`,
      selector: selectors.analogdevices,
    },
    //  just have to click on each job and use the below selector

    // https://analogdevices.wd1.myworkdayjobs.com/en-US/External/details/Sr-Systems-and-Hardware-Engineer_R251086?q=hardware+engineer&locationCountry=bc33aa3152ec42d4995f4791a106ed09
    // #mainContent > div > div.css-1142bqn > div > div > section > div > div.css-oa138a > div > div > div > div.css-1i27f3a > div > div.css-t7l5ok > ul:nth-child(12) > li
    //done

    "appliedmaterials": {
      name: "Applied Materials",
      baseUrl: "https://careers.appliedmaterials.com",
      url: `https://careers.appliedmaterials.com/careers?domain=appliedmaterials.com&triggerGoButton=false&query=${encodeURIComponent(searchQuery)}&start=${(pageNum - 1) * 10}&location=united+states&pid=790304383258&sort_by=solr&filter_include_remote=1&filter_country=United+States+of+America&filter_seniority=Mid-Level%2CEntry%2CIntern%2CManager`,
      selector: selectors.appliedmaterials
      //it is having its own filter in the url
    //done
    },

    "baesystems": {
      name: "BAE Systems",
      baseUrl: "https://bah.wd1.myworkdayjobs.com",
      url: `https://bah.wd1.myworkdayjobs.com/en-US/BAH_Jobs?q=${encodeURIComponent(searchQuery)}`,
      selector: selectors.baesystems
      //onclicking each job u have to use this #mainContent > div > div.css-1142bqn > div > div > section > div > div.css-oa138a > div > div > div > div.css-1i27f3a > div > div.css-muoh1b > ul:nth-child(5)>li
      //same as analog 
    //DONE
    },

    "broadcom": {
      name: "Broadcom",
      baseUrl: "https://broadcom.wd1.myworkdayjobs.com",
      url: `https://broadcom.wd1.myworkdayjobs.com/External_Career?q=${encodeURIComponent(searchQuery)}&locationCountry=bc33aa3152ec42d4995f4791a106ed09`,
      selector: selectors.broadcom
      //click on the link and use this selector #mainContent > div > div.css-1142bqn > div > div > section > div > div.css-oa138a > div > div > div > div.css-1i27f3a > div > div.css-i1swdh > ul:nth-child(12)
      //exactly same also selctor same to the analog 
    //DONE
    },


    "cisco": {
      name: "Cisco",
      baseUrl: `https://jobs.cisco.com/jobs/SearchJobs`,
      url: `https://jobs.cisco.com/jobs/SearchJobs/${searchQuery}?21178=%5B169482%5D&21178_format=6020&21180=%5B166%2C164%2C165%5D&21180_format=6022&listFilterMode=1&projectOffset=${(pageNum - 1) * 10}`,
      selector: selectors.cisco
      // filtered by url for apprentice ,early in career ,intern
    //done
    },

    "gdit": {
      name: "General Dynamics",
      baseUrl: "https://gdit.wd5.myworkdayjobs.com",
      url: `https://gdit.wd5.myworkdayjobs.com/External_Career_Site?q=${encodeURIComponent(searchQuery)}`,
      selector: selectors.gdit
      // on clicking each job we have to use the selector
      // document.querySelector('.css-1x6f30n').textContent;
      // and we have to search for Experience : years
    // DONE
    },

    "10xgenomics": {
      name: "10x Genomics",
      baseUrl: "https://careers.10xgenomics.com",
      url: `https://careers.10xgenomics.com/careers?query=${encodeURIComponent(searchQuery.replace(/ /g, '+'))}&start=${(pageNum - 1) * 10}&location=united+states&sort_by=solr&filter_include_remote=1`,
      selector: selectors['10xgenomics']
      //same click the job and use this selctor 
      // //#job-description-container > div > ul:nth-child(10)
    // done
    },

    "guidehouse": {
      name: "Guidehouse",
      baseUrl: "https://guidehouse.wd1.myworkdayjobs.com",
      url: `https://guidehouse.wd1.myworkdayjobs.com/en-US/External?q=${encodeURIComponent(searchQuery)}&Location_Country=bc33aa3152ec42d4995f4791a106ed09`,
      selector: selectors.guidehouse
      //same click one each job and use the selector
      //#mainContent > div > div.css-1142bqn > div > div > section > div > div.css-oa138a > div > div > div > div.css-1i27f3a > div > div.css-ydj8rt > ul:nth-child(13)
    // //DONE
    },

    "hpe": {
      name: "Hewlett Packard Enterprise",
      baseUrl: "https://hpe.wd5.myworkdayjobs.com",
      url: `https://hpe.wd5.myworkdayjobs.com/WFMathpe?q=${encodeURIComponent(searchQuery)}`,
      selector: selectors.hpe
     //same as before click on each job and use this selector
     //#mainContent > div > div.css-1142bqn > div > div > section > div > div.css-oa138a > div > div > div > div.css-1i27f3a > div > div.css-11ukcqc
     //done
    },

    "illumina": {
      name: "Illumina",
      baseUrl: "https://illumina.wd1.myworkdayjobs.com",
      url: `https://illumina.wd1.myworkdayjobs.com/illumina-careers?q=${encodeURIComponent(searchQuery)}&locationCountry=bc33aa3152ec42d4995f4791a106ed09`,
      selector: selectors.illumina
      //same as before click on the job and use this selector
      //#mainContent > div > div.css-1142bqn > div > div > section > div > div.css-oa138a > div > div > div > div.css-1i27f3a > div > div.css-oplht1 > div > div > div > div > ul:nth-child(6)
      //done
    },

    "intel": {
      name: "Intel",
      baseUrl: "https://intel.wd1.myworkdayjobs.com",
      url: `https://intel.wd1.myworkdayjobs.com/en-US/External/jobs?q=${encodeURIComponent(searchQuery)}&locations=1e4a4eb3adf101b8aec18a77bf810dd0&locations=1e4a4eb3adf1018c4bf78f77bf8112d0&locations=1e4a4eb3adf10118b1dfe877bf8162d0&locations=da6b8032b879100204a63a809f6c0000&locations=1e4a4eb3adf10146fd5c5276bf81eece&locations=1e4a4eb3adf1011246675c76bf81f8ce&locations=0741efd9f02e01994a3c9ca2ae078199&locations=1e4a4eb3adf1016541777876bf8111cf&locations=1e4a4eb3adf101fa2a777d76bf8116cf&locations=1e4a4eb3adf10174f0548376bf811bcf`,
      selector: selectors.intel
      // same as above and use the selector
      //#mainContent > div > div.css-1142bqn > div > div > section > div > div.css-oa138a > div > div > div > div.css-1i27f3a > div > div.css-1hv0qyi > div:nth-child(17)
      //done
    },

    "magna": {
      name: "Magna International",
      baseUrl: "https://wd3.myworkdaysite.com",
      url: `https://wd3.myworkdaysite.com/en-US/recruiting/magna/Magna?q=${encodeURIComponent(searchQuery)}&Country=bc33aa3152ec42d4995f4791a106ed09`,
      selector: selectors.magna
      //same use this selctor after clicking the job 
      //#mainContent > div > div.css-1142bqn > div > div > section > div > div.css-oa138a > div > div > div > div.css-1i27f3a > div > div.css-zokh5w > div:nth-child(11)
      //done
    },

    "marvel": {
      name: "Marvel Technology",
      baseUrl: "https://marvell.wd1.myworkdayjobs.com",
      url: `https://marvell.wd1.myworkdayjobs.com/MarvellCareers?q=${encodeURIComponent(searchQuery)}&Country=bc33aa3152ec42d4995f4791a106ed09`,
      selector: selectors.marvel
      // //same use this selctor after clicking the job 
      //       //#mainContent > div > div.css-1142bqn > div > div > section > div > div.css-oa138a > div > div > div > div.css-1i27f3a > div > div.css-dwylkc > ul:nth-child(17)
      //done
    },

    "nvidia": {
      name: "NVIDIA",
      baseUrl: "https://nvidia.wd5.myworkdayjobs.com",
      url: `https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite?q=${encodeURIComponent(searchQuery)}&locationHierarchy1=2fcb99c455831013ea52fb338f2932d8`,
      selector: selectors.nvidia
      //same as above
      //#mainContent > div > div.css-1142bqn > div > div > section > div > div.css-oa138a > div > div > div > div.css-1i27f3a > div > div.css-4r17ng > ul:nth-child(9)
    
      //done
    },

    "verizon": {
      name: "Verizon",
      baseUrl: "https://verizon.wd12.myworkdayjobs.com",
      url: `https://verizon.wd12.myworkdayjobs.com/verizon-careers/?q=${encodeURIComponent(searchQuery)}&locationCountry=bc33aa3152ec42d4995f4791a106ed09`,
      selector: selectors.verizon
      //same as above
      //#mainContent > div > div.css-1142bqn > div > div > section > div > div.css-oa138a > div > div > div > div.css-1i27f3a > div > div.css-4r17ng > ul:nth-child(7)
      //done
    },

    "workday": {
      name: "Workday",
      baseUrl: "https://workday.wd5.myworkdayjobs.com",
      url: `https://workday.wd5.myworkdayjobs.com/Workday?q=${encodeURIComponent(searchQuery)}&Location_Country=bc33aa3152ec42d4995f4791a106ed09`,
      selector: selectors.workday
      //same as above and use the following selector 
      //#mainContent > div > div.css-1142bqn > div > div > section > div > div.css-oa138a > div > div > div > div.css-1i27f3a > div > div.css-1rdwyhm > ul:nth-child(30)
      //done
    },








    "amd": {
      name: "AMD",
       baseUrl: "",
      url: `https://careers.amd.com/careers-home/jobs?&keywords=${encodeURIComponent(searchQuery)}&stretchUnit=MILES&stretch=10&location=United%20States&woe=12&regionCode=US&page=${pageNum}`,
      selector: selectors.amd
    },
    // done

    //      "job_apply_link": "https://careers-amd.icims.com/jobs/67948/login"
    // https://careers.amd.com/careers-home/jobs/68449?lang=en-us


"abb": {
  name: "ABB",
  baseUrl: "https://careers.abb/global/en/search-results",
  url: `https://careers.abb/global/en/search-results?keywords=${encodeURIComponent(searchQuery)}&from=${(pageNum - 1) * 10}&s=1`,
  selector: selectors.abb,
  filters: {
    "applyUSAFilter": {
      "accordionSelector": "button#Country\\/Territory\\/AreaAccordion.facet-menu.au-target",
      "searchInputSelector": "input[id='facetInput_5'][data-ps='1c680c5e-input-1']",
      "checkboxSelector": "input#country_phs_0.au-target",
      "searchTerm": "United States of America"
    }
  }
},
//       "job_apply_link": "https://careers.abb/global/en/job/JR00002120/Sales-Specialist"
// https://careers.abb/global/en/job/JR00002120/Sales-Specialist
// use this selctor #acc-skip-content > div.ph-page > div > div > div.job-page-external > div > div > div.col-lg-8.col-md-8.col-sm-12 > section:nth-child(1) > div > div > div.job-description.au-target.phw-widget-ctr-nd > div.jd-info.au-target > ul:nth-child(22)
// problem
// // done
   

    "aijobs": {
      name: "AI Jobs",
      baseUrl: "https://www.aijobs.com",
      url: `https://www.aijobs.com/jobs?q=${encodeURIComponent(searchQuery)}&posted_at=last-7-days&location=United%20States&location_id=168681&order=relevance&page=${pageNum}`,
      selector: selectors.aijobs
      //"job_apply_link": "https://www.aijobs.com/jobs/156868844-hardware-system-design-electrical-engineer"
      //https://www.aijobs.com/jobs/156868844-hardware-system-design-electrical-engineer
      // use this selctor #quill-container-with-job-details > div > ul:nth-child(7)
    // done
    },



     "synopsys": {
      name: "Synopsys",
      baseUrl: "https://careers.synopsys.com/search-jobs",
      url: `https://careers.synopsys.com/search-jobs/${encodeURIComponent(searchQuery)}/United%20States/44408/1/2/6252001/39x76/-98x5/50/2`,
      selector: selectors.synopsys

      //  "job_apply_link": "https://careers.synopsys.com/search-jobs/job/hillsboro/silicon-validation-manager-12490/44408/84997058608"
      //https://careers.synopsys.com/job/hillsboro/silicon-validation-manager-12490/44408/84997058608
      //and use these selectors  #anchor-responsibilities > div.ats-description.ajd_job-details__ats-description > ul:nth-child(12)
     //done
    },


    "rivian": {
      name: "RIVIAN",
       baseUrl: "https://careers.rivian.com/careers-home/jobs",
      url: `https://careers.rivian.com/careers-home/jobs?keywords=${encodeURIComponent(searchQuery)}&location=united%20states&stretch=10&stretchUnit=MILES&sortBy=relevance&page=${pageNum}`,
      selector: selectors.rivian
    },

    // ------------we have to use the data of apply link here

    //    // "job_apply_link": "https://us-careers-rivian.icims.com/jobs/20528/login"
    // https://careers.rivian.com/careers-home/jobs/22482?lang=en-us&previousLocale=en-US
    // https://careers.rivian.com/careers-home/jobs/20528?lang=en-us&previousLocale=en-US
    // selector li  for description
    // --------------------------------------------------------------------------------------having same structure

    apple: {
      name: "Apple",
      baseUrl: "https://jobs.apple.com",
      url: `https://jobs.apple.com/en-us/search?search=${encodeURIComponent(
        searchQuery
      ).replace(
        /%20/g,
        "+"
      )}&sort=relevance&location=united-states-USA&page=${pageNum}`,
      selector: selectors.apple,
    },
//      "job_apply_link": "https://jobs.apple.com/en-us/details/200607287-0157/hardware-development-engineer-data-center-hardware?team=HRDWR"
// https://jobs.apple.com/en-us/details/200607287-0157/hardware-development-engineer-data-center-hardware?team=HRDWR
// selector #jobdetails-minimumqualifications
  
//dif
    "arm": {
      name: "Arm",
      baseUrl: `https://careers.arm.com`,
      url: `https://careers.arm.com/search-jobs/${encodeURIComponent(searchQuery)}/United%20States?orgIds=33099&kt=1&alp=6252001&alt=2&p=${pageNum}`,
      selector: selectors.arm

            // "job_apply_link": "https://careers.arm.com/job/austin/distinguished-engineer-and-architect-hardware-verification/33099/82681565104"
      //https://careers.arm.com/job/austin/distinguished-engineer-and-architect-hardware-verification/33099/82681565104
      // selctor:#anchor-responsibilities > div.ats-description > ul:nth-child(10)>li
    },



//diff
    honeywell: {
      name: "Honeywell",
      baseUrl: "https://careers.honeywell.com",
      url: `https://careers.honeywell.com/en/sites/Honeywell/jobs?keyword=${encodeURIComponent(
        searchQuery
      )}&location=United+States&locationId=300000000469866&locationLevel=country&mode=location`,
      selector: selectors.honeywell,

    //   //"job_apply_link": "https://careers.honeywell.com/en/sites/Honeywell/job/108065/?keyword=hardware+engineer&location=United+States&locationId=300000000469866&locationLevel=country&mode=location"
    //   //https://careers.honeywell.com/en/sites/Honeywell/jobs/preview/108065/?keyword=hardware+engineering&location=United+States&locationId=300000000469866&locationLevel=country&mode=location
    //   //and use this selector #ui-id-30 > div > div.oj-dialog-content.oj-dialog-default-content > div > div.app-dialog__wrapper.app-dialog__wrapper--active.app-dialog__wrapper--align-center.oj-dialog-body > div > job-details-checker > job-details-loader > job-details-page > div > article > job-details-content > div > div.cc-page.cc-page--job-details-modal > div > div > div > div:nth-child(4) > div > div > div > div > div > div > ul:nth-child(2)
    //done
    },

    //diff same as honey well
    jpmc: {
      name: "JPMorgan Chase",
      baseUrl: "https://jpmc.fa.oraclecloud.com",
      url: `https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/jobs?keyword=${encodeURIComponent(
        searchQuery
      )}&location=United+States&locationId=300000000469866&locationLevel=country&mode=location`,
      selector: selectors.jpmc,

      //      "job_apply_link": "https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/210629578/?keyword=hardware+engineer&location=United+States&locationId=300000000469866&locationLevel=country&mode=location"
      //https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/jobs/preview/210656130/?keyword=hardware+engineering&location=United+States&locationId=300000000289738&locationLevel=country&mode=location
      //use this selector #ui-id-15 > div.oj-dialog-container > div.oj-dialog-content.oj-dialog-default-content > div > div.app-dialog__wrapper.app-dialog__wrapper--active.app-dialog__wrapper--align-center.oj-dialog-body > div > job-details-checker > job-details-loader > job-details-page > div > article > job-details-content > div > div.cc-page.cc-page--job-details-modal > div > div > div > div:nth-child(2) > div > div > div > div > div > div > ul:nth-child(8)
      //done
    },
    ti: {
      name: "Texas Instruments",
      baseUrl: "https://careers.ti.com",
      url: `https://careers.ti.com/en/sites/CX/jobs?keyword=${encodeURIComponent(
        searchQuery
      )}&location=United+States&locationId=300000000361862&locationLevel=country&mode=location`,
      selector: selectors.ti,
//"job_apply_link": "https://careers.ti.com/en/sites/CX/job/25002271/?keyword=hardware+engineer&location=United+States&locationId=300000000361862&locationLevel=country&mode=location"
//https://careers.ti.com/en/sites/CX/jobs/preview/25002271/?keyword=hardware+engineering&location=United+States&locationId=300000000361862&locationLevel=country&mode=location
//use this selector #ui-id-13 > div > div.oj-dialog-content.oj-dialog-default-content > div > div.app-dialog__wrapper.app-dialog__wrapper--active.app-dialog__wrapper--align-center.oj-dialog-body > div > job-details-checker > job-details-loader > job-details-page > div > article > job-details-content > div > div.cc-page.cc-page--job-details-modal > div > div:nth-child(1) > div > div:nth-child(4) > div > div > div > div > div > div > ul:nth-child(2)
//done
    },



    
   

   

    "waymo": {
      name: "Waymo",
      baseUrl: "https://careers.withwaymo.com/jobs/search",
      url: `https://careers.withwaymo.com/jobs/search?page=${pageNum}&country_codes%5B%5D=US&dropdown_field_1_uids%5B%5D=032bf1b3c966086ebe1d0cd037cd2eef&dropdown_field_1_uids%5B%5D=5c171b4c656ebf8d39faf490d07d69d1&dropdown_field_1_uids%5B%5D=c08225843430b8d611354d3bffcc2bea&query=${encodeURIComponent(searchQuery)}`,
      selector: selectors.waymo
    //done

      //      "job_apply_link": "https://careers.withwaymo.com/jobs/electrical-engineer-compute-hardware-mountain-view-california-united-states"
      //https://careers.withwaymo.com/jobs/electrical-engineer-compute-hardware-mountain-view-california-united-states
      // and use the selector #job_description_1_2 > ul:nth-child(9)
    },
    
    google: {
      name: "Google",
      baseUrl:
        "https://www.google.com/about/careers/applications/jobs/results/",
      url: `https://www.google.com/about/careers/applications/jobs/results/?location=United%20States&target_level=EARLY&target_level=MID&target_level=INTERN_AND_APPRENTICE&q=${encodeURIComponent(
        searchQuery
      )}&page=${pageNum}`,
      selector: selectors.google,
      //filters applied
    //done
    },

    amazon: {
      name: "Amazon",
      baseUrl: "https://amazon.jobs/en-gb/search",
      url: `https://www.amazon.jobs/en-gb/search?offset=${
        (pageNum - 1) * 10
      }&result_limit=10&sort=relevant&distanceType=Mi&radius=24km&industry_experience=one_to_three_years&latitude=38.89036&longitude=-77.03196&loc_group_id=&loc_query=united%20states&base_query=${encodeURIComponent(
        searchQuery
      )}&city=&country=USA&region=&county=&query_options=&`,
      selector: selectors.amazon,
      //filters applied
     //done
    },
    
           meta: {
          name: "Meta",
          baseUrl: "https://www.metacareers.com",
          url: `https://www.metacareers.com/jobs?teams[0]=University%20Grad%20-%20Business&teams[1]=University%20Grad%20-%20Engineering%2C%20Tech%20%26%20Design&teams[2]=University%20Grad%20-%20PhD%20%26%20Postdoc&q=${encodeURIComponent(
            searchQuery
          )}&page=${pageNum}`
    ,
          selector: selectors.meta,
    //filter applied
    //done
        },
           microsoft: {
          name: "Microsoft",
          baseUrl: "https://jobs.careers.microsoft.com",
          url: `https://jobs.careers.microsoft.com/global/en/search?q=hardware&lc=United%20States&exp=Students%20and%20graduates&l=en_us&pg=${pageNum}&pgSz=20&o=Relevance&flt=true`
    ,
          selector: selectors.microsoft,
    // filter applied
    //done
        },
  };
}

module.exports = { getCompanies };
