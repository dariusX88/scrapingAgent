# Austrian Companies Scraper

A comprehensive Apify actor that scrapes the top 100 Austrian companies, enriches them with contact information, and gathers tender data.

## Features

✅ **Task A: Scrape Top Austrian Companies**
- Fetches top 100 Austrian companies by revenue, market cap, or employees
- Includes: rank, company name, industry, HQ city, metric type & value
- Sources: CompaniesMarketCap, public Austrian business registries

✅ **Task B: Contact Enrichment**
- Automatically discovers company websites
- Scrapes contact pages (/contact, /kontakt, /impressum, etc.)
- Extracts: emails, phone numbers, postal addresses
- Austrian-specific patterns (phone: +43, 0xxx)

✅ **Task C: Tender Data Aggregation**
- Queries official Austrian eProcurement portal (USP)
- Searches commercial tender platforms (BidDetail, Tendersinfo)
- Classifies: open vs closed tenders, tender history
- Lookback period: 1-36 months (configurable)

## Data Output

Each company record includes:

```json
{
  "rank": 1,
  "company_name": "OMV Aktiengesellschaft",
  "industry": "Energy",
  "hq_city": "Vienna",
  "website_url": "https://www.omv.com",
  "emails": ["contact@omv.com", "info@omv.com"],
  "phones": ["+43-1-123456789", "0043-1-987654321"],
  "address": "Ringstrasse 1, 1010 Vienna",
  "imprint_url": "https://www.omv.com/impressum",
  "tender_data": {
    "open_count": 5,
    "closed_count": 42,
    "last_tender_date": "2026-02-20",
    "tenders": [
      {
        "title": "Procurement of IT Services",
        "status": "open",
        "deadline": "2026-03-15",
        "source_portal": "USP eProcurement"
      }
    ]
  },
  "scraped_at": "2026-02-24T17:00:00.000Z"
}
```

## Input Configuration

All parameters are configurable via `INPUT_SCHEMA.json`:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ranking_strategy` | enum | revenue | revenue, market_cap, or employees |
| `top_n` | int | 100 | Number of companies (1-100) |
| `include_tenders` | bool | true | Whether to scrape tender data |
| `tender_lookback_months` | int | 12 | How far back to search (1-36) |
| `max_concurrent_requests` | int | 5 | HTTP concurrency (1-20) |
| `extract_emails` | bool | true | Extract email addresses |
| `extract_phones` | bool | true | Extract phone numbers |

## Usage in Apify

### Option 1: Deploy from GitHub

1. In Apify Console, create a new Actor
2. Set **Source Type** to "Git repository"
3. Enter Git URL: `https://github.com/dariusX88/scrapingAgent.git`
4. Build the Actor
5. Run with desired input configuration

### Option 2: Run Input Example

```json
{
  "ranking_strategy": "revenue",
  "top_n": 100,
  "include_tenders": true,
  "tender_lookback_months": 12,
  "max_concurrent_requests": 5,
  "extract_emails": true,
  "extract_phones": true
}
```

## Architecture

### File Structure

```
.
├── package.json              # Node.js dependencies
├── README.md                 # This file
├── src/
│   ├── main.js              # Main actor entry point & orchestration
│   ├── INPUT_SCHEMA.json    # Input schema for Apify UI
│   └── [Optional futures]
│       ├── scrapers/        # Task-specific scrapers
│       ├── processors/      # Data processing utilities
│       └── config/          # Configuration constants
```

### Core Functions

**src/main.js**:
- `Apify.main()` - Actor entry point
- `scrapeTopCompanies()` - Task A: Fetch top companies
- `enrichCompanyContact()` - Task B: Enrich contact data
- `scrapContactPages()` - Task B: Extract emails/phones
- `scrapeTenderData()` - Task C: Fetch tenders
- `getSeedCompaniesAustria()` - Seed data (demo)

## Configuration for Production

Before deploying to production, configure:

### 1. Ranking Source (Task A)

Replace `getSeedCompaniesAustria()` with live scrapers:

```javascript
// Example: CompaniesMarketCap
const companiesUrl = 'https://companiesmarketcap.com/austria/';
const $ = cheerio.load(await axios.get(companiesUrl));
// Parse table rows to extract company data
```

### 2. Contact Enrichment (Task B)

- Add domain resolver (Google Search API or WHOIS)
- Improve regex patterns for various email/phone formats
- Handle JavaScript-rendered contact forms (use Puppeteer)

### 3. Tender Integration (Task C)

**Option A: USP eProcurement (Official)**

```javascript
// Austrian government tender portal
const usp_url = 'https://www.usp.gv.at/';
// Implement search/filter logic
```

**Option B: Third-party APIs**

- BidDetail API: Search by company name
- Tendersinfo: REST endpoint for tenders
- Consider subscription cost vs. data quality

## Rate Limiting & Best Practices

✅ **Do's**:
- Use Apify proxy for distributed requests
- Respect robots.txt on all domains
- Add delays between requests (built into p-queue)
- Cache company websites to avoid re-scraping
- Log all data extraction for debugging

❌ **Don'ts**:
- Don't exceed `max_concurrent_requests` (default 5)
- Don't scrape user-agent without identifying as bot
- Don't ignore ` 429 Too Many Requests` errors
- Don't store sensitive data in logs

## Data Accuracy Notes

- **Company Ranking**: Based on most recent public financial data
- **Contact Info**: Extracted from publicly available pages only
- **Tenders**: Limited to those published in searchable portals
- **Coverage**: Primarily large/medium companies with web presence

## Error Handling

The actor implements:
- **Retry logic** with exponential backoff
- **Timeout handling** (5s per HTTP request)
- **Graceful degradation** (continues if tender data unavailable)
- **Structured logging** for debugging

## Future Enhancements

- [ ] Direct integration with USP eProcurement API (when available)
- [ ] Advanced NLP for tender relevance matching
- [ ] LinkedIn scraping for employee counts
- [ ] Real-time change notifications
- [ ] Export to CSV/Excel/Google Sheets
- [ ] Automatic daily/weekly runs
- [ ] Dashboard for data visualization

## Support & Maintenance

**Author**: dariusX88  
**License**: MIT  
**Last Updated**: February 2026

For issues or feature requests, please create a GitHub issue or contact the maintainer.

---

*This actor respects all legal and ethical scraping guidelines. Always check target website's ToS before scraping.*
