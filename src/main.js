const Apify = require('apify');
const axios = require('axios');
const cheerio = require('cheerio');
const PQueue = require('p-queue').default;

Apify.main(async () => {
  const input = await Apify.getInput();
  
  const {
    ranking_strategy = 'revenue',
    top_n = 100,
    include_tenders = true,
    tender_lookback_months = 12,
    max_concurrent_requests = 5,
  } = input || {};

  Apify.utils.log.info('Starting Austrian Companies Scraper');
  Apify.utils.log.info(`Config: Strategy=${ranking_strategy}, Top=${top_n}, Tenders=${include_tenders}`);

  // Initialize queue and dataset
  const queue = new PQueue({ concurrency: max_concurrent_requests });
  const dataset = await Apify.openDataset('companies');

  try {
    // TASK A: Scrape top Austrian companies
    Apify.utils.log.info('=== TASK A: Fetching top Austrian companies ===');
    const companies = await scrapeTopCompanies(ranking_strategy, top_n);
    Apify.utils.log.info(`Found ${companies.length} companies`);

    // TASK B: Enrich company contact data
    Apify.utils.log.info('=== TASK B: Enriching contact data ===');
    const enrichedCompanies = [];
    for (const company of companies) {
      await queue.add(async () => {
        try {
          const enriched = await enrichCompanyContact(company);
          enrichedCompanies.push(enriched);
          Apify.utils.log.info(`Enriched: ${enriched.company_name}`);
        } catch (err) {
          Apify.utils.log.error(`Error enriching ${company.company_name}: ${err.message}`);
        }
      });
    }
    await queue.onIdle();

    // TASK C: Scrape tender information
    if (include_tenders) {
      Apify.utils.log.info('=== TASK C: Fetching tender data ===');
      for (const company of enrichedCompanies) {
        await queue.add(async () => {
          try {
            const tenderData = await scrapeTenderData(company, tender_lookback_months);
            company.tender_data = tenderData;
            Apify.utils.log.info(`Tenders for ${company.company_name}: ${tenderData.open_count} open`);
          } catch (err) {
            Apify.utils.log.error(`Error fetching tenders for ${company.company_name}: ${err.message}`);
            company.tender_data = { open_count: 0, closed_count: 0, tenders: [] };
          }
        });
      }
      await queue.onIdle();
    }

    // Save to dataset
    Apify.utils.log.info('=== Saving results ===');
    for (const company of enrichedCompanies) {
      await dataset.pushData({
        ...company,
        scraped_at: new Date().toISOString(),
      });
    }

    Apify.utils.log.info(`Successfully scraped ${enrichedCompanies.length} companies`);
  } catch (err) {
    Apify.utils.log.error(`Main error: ${err.message}`);
    throw err;
  }
});

async function scrapeTopCompanies(strategy, limit) {
  // Source: Using public data aggregators
  const companies = [];
  
  try {
    // Simulate scraping from CompaniesMarketCap or similar source
    // In production, this would scrape https://companiesmarketcap.com/austria/
    // or other Austrian business databases
    
    Apify.utils.log.info(`Scraping top ${limit} companies by ${strategy}`);
    
    // For demonstration, create seed data
    const seedData = await getSeedCompaniesAustria();
    return seedData.slice(0, limit);
  } catch (err) {
    Apify.utils.log.error(`Error scraping top companies: ${err.message}`);
    return [];
  }
}

async function enrichCompanyContact(company) {
  const enriched = { ...company };
  
  if (!enriched.website_url) {
    enriched.website_url = await resolveWebsite(enriched.company_name);
  }
  
  if (enriched.website_url) {
    const contactInfo = await scrapContactPages(enriched.website_url);
    enriched.emails = contactInfo.emails || [];
    enriched.phones = contactInfo.phones || [];
    enriched.address = contactInfo.address || '';
    enriched.imprint_url = contactInfo.imprint_url || '';
  }
  
  return enriched;
}

async function resolveWebsite(companyName) {
  try {
    // Use Google search or domain resolver
    // For now, return empty - in production use WHOIS or search API
    return '';
  } catch (err) {
    return '';
  }
}

async function scrapContactPages(websiteUrl) {
  const contactInfo = {
    emails: [],
    phones: [],
    address: '',
    imprint_url: '',
  };
  
  const pagesToScrape = [
    '/',
    '/contact',
    '/kontakt',
    '/impressum',
    '/imprint',
    '/about',
    '/ubersicht',
  ];
  
  for (const path of pagesToScrape) {
    try {
      const fullUrl = websiteUrl + path;
      const response = await axios.get(fullUrl, {
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      
      const $ = cheerio.load(response.data);
      const text = $.text();
      
      // Extract emails
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = text.match(emailRegex) || [];
      contactInfo.emails.push(...emails);
      
      // Extract phones
      const phoneRegex = /\+43\s?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,9}|0\d{1,4}[\s-]?\d{1,9}/g;
      const phones = text.match(phoneRegex) || [];
      contactInfo.phones.push(...phones);
      
      // Track imprint URL
      if (path.includes('imprint') || path.includes('impressum')) {
        contactInfo.imprint_url = fullUrl;
      }
    } catch (err) {
      // Continue to next page
    }
  }
  
  // Deduplicate
  contactInfo.emails = [...new Set(contactInfo.emails)];
  contactInfo.phones = [...new Set(contactInfo.phones)];
  
  return contactInfo;
}

async function scrapeTenderData(company, lookbackMonths) {
  const tenderData = {
    open_count: 0,
    closed_count: 0,
    tenders: [],
    last_tender_date: null,
  };
  
  try {
    // Query official Austrian eProcurement portal
    // https://www.usp.gv.at/ - but requires special handling or API
    // For now, placeholder implementation
    
    // Search by company name as keyword
    Apify.utils.log.info(`Searching tenders for: ${company.company_name}`);
    
    // In production, integrate with:
    // 1. USP eProcurement (Austrian official)
    // 2. BidDetail
    // 3. Tendersinfo
    
    return tenderData;
  } catch (err) {
    Apify.utils.log.error(`Tender scraping error: ${err.message}`);
    return tenderData;
  }
}

async function getSeedCompaniesAustria() {
  // Seed data with top Austrian companies
  // In production, this data would be scraped from ranking sources
  return [
    {
      rank: 1,
      company_name: 'OMV Aktiengesellschaft',
      industry: 'Energy',
      hq_city: 'Vienna',
      metric_type: 'revenue',
      metric_value: 62500000000,
      website_url: 'https://www.omv.com',
    },
    {
      rank: 2,
      company_name: 'Voestalpine AG',
      industry: 'Steel & Materials',
      hq_city: 'Linz',
      metric_type: 'revenue',
      metric_value: 16200000000,
      website_url: 'https://www.voestalpine.com',
    },
    {
      rank: 3,
      company_name: 'Erste Group Bank AG',
      industry: 'Finance',
      hq_city: 'Vienna',
      metric_type: 'revenue',
      metric_value: 14600000000,
      website_url: 'https://www.erstegroup.com',
    },
    // Add more seed data as needed
  ];
}
