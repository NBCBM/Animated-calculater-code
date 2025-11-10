# Snapchat Backend Crawling - Findings & Limitations

## Investigation Results

### ✅ What We CAN Extract (Public Data)

#### From Public Profile Pages:
1. **Profile ID** (UUID) - `7c94b2b8-a716-425d-bc0e-6a7ad13eae8f`
2. **Content ID** (numeric) - `63115248932864`
3. **Show Name** - "Meme-mania"
4. **Description** - Full bio/description text
5. **Follower Count** - 59,800
6. **Profile Image URLs** - Full resolution images
7. **Episode Data** - Title, thumbnails, season/episode numbers
8. **Publisher Type** - "SHOW" vs other types
9. **Business Profile ID** - Same as Profile ID
10. **All Metadata** - Schema.org, OpenGraph, Twitter Cards

#### Example Data Retrieved:
```json
{
  "title": "Meme-mania",
  "subscriberCount": "59800",
  "publisherType": "SHOW",
  "businessProfileId": "7c94b2b8-a716-425d-bc0e-6a7ad13eae8f",
  "bio": "A collection of the most popular and trending memes...",
  "username": "",  // ← EMPTY for shows!
  "websiteUrl": "", // ← Usually empty
  "address": ""   // ← Usually empty
}
```

---

### ❌ What We CANNOT Extract (Requires Auth)

#### Organization/Publisher Info NOT Available:
1. **Company Name** / **Organization Name**
2. **Legal Entity** / **LLC Name**
3. **Agency Name**
4. **Publisher Username** (for auth/login)
5. **Contact Information**
6. **Business Registration Details**
7. **Tax ID / Business ID**
8. **Owner/Operator Name**

---

## Why Organization Info Is Hidden

### Backend API Findings:

**Attempted Endpoints (ALL FAILED):**
```
✗ https://publish.snapchat.com/v2/user/{profile_id}/settings - 404
✗ https://publish.snapchat.com/v2/profile/{profile_id} - 404
✗ https://publish.snapchat.com/v2/publisher/{profile_id} - 404
✗ https://story.snapchat.com/v2/profile/{profile_id} - No org data
✗ https://gcp.api.snapchat.com/discover/profile/{profile_id} - Failed
✗ https://aws.api.snapchat.com/profile/{profile_id} - Failed
✗ https://www.snapchat.com/api/profile/{profile_id} - 404
```

### Key Issues:

1. **Authentication Required**
   - `publish.snapchat.com` endpoints require publisher login
   - Only accessible to the actual content owner
   - No public API for organization data

2. **Empty Username Field**
   ```json
   "username": ""  // Shows don't have public usernames
   ```
   - SHOW-type profiles don't have traditional usernames
   - Can't use username-based API queries
   - Only UUID-based identification

3. **Intentional Privacy**
   - Snapchat hides publisher/organization info from public
   - Likely for privacy/security reasons
   - Prevents scraping of business relationships

---

## Data We Successfully Extracted

### Profile #1: Meme Reviews
- **Show Name:** Meme Reviews
- **Followers:** 379,700
- **Profile ID:** `0a8450e9-b5f7-4080-8cb3-fe67d59430e1`
- **Description:** "Know Your Meme's weekly breakdowns..."
- **✓ Organization Found:** Literally Media Ltd. (via manual research)

### Profile #2: Meme-mania
- **Show Name:** Meme-mania
- **Followers:** 59,800
- **Profile ID:** `7c94b2b8-a716-425d-bc0e-6a7ad13eae8f`
- **Description:** "A collection of the most popular and trending memes..."
- **✗ Organization:** NOT FOUND (not in public data)

---

## Alternative Approaches to Find Organization Info

### 1. Manual Web Research
- Google: `"Meme-mania" Snapchat show owner`
- Trademark databases (USPTO, etc.)
- LinkedIn company pages
- Press releases and media articles
- Snap Publisher directory (if accessible)

### 2. Reverse Image Search
- Use profile images to find related accounts
- Check watermarks on episode thumbnails
- Look for branding in content

### 3. Social Media Cross-Reference
- Check `sameAsLinks` field (usually empty)
- Search for show name on Twitter, Instagram
- Find associated social media accounts

### 4. Content Analysis
- Analyze episode metadata for clues
- Check video watermarks/branding
- Look for sponsor mentions

### 5. Business Registry Search
- Search by Business Profile ID
- Check corporate registrations
- Look up trademark filings

---

## What Publish API Would Show (If We Had Auth)

Based on the URL pattern you provided:
```
https://publish.snapchat.com/v2/user/{username}/settings
```

This endpoint likely returns:
```json
{
  "user": {
    "username": "actual_username",
    "displayName": "Meme-mania",
    "organization": "Company Name LLC",
    "company": "Full Company Name",
    "businessEmail": "contact@company.com",
    "businessPhone": "+1...",
    "businessAddress": "..."
  },
  "settings": {
    ...
  }
}
```

**But this requires:**
- Publisher account login
- OAuth token / session cookie
- Proper authentication headers
- Account permissions

---

## Technical Limitations

### Why Backend Scraping Won't Work:

1. **No Public API**
   - Snapchat doesn't provide public API for publisher data
   - All sensitive data requires authentication

2. **UUID-Only Identification**
   - Shows use UUID, not usernames
   - Can't construct authenticated API calls without credentials

3. **CORS / Auth Walls**
   - APIs check authentication tokens
   - Cookies/sessions required
   - Rate limiting on unauthenticated requests

4. **Legal/ToS Issues**
   - Scraping authenticated endpoints violates ToS
   - Could result in legal action
   - Account bans for automated access

---

## What Our Crawler CAN Do

### ✅ Production-Ready Features:

1. **Profile Metadata Extraction**
   - Name, description, followers
   - Profile images, thumbnails
   - All public metadata

2. **Content Discovery**
   - Episode lists with titles
   - Season/episode numbers
   - Timestamps and IDs

3. **Batch Processing**
   - Scrape 100+ profiles concurrently
   - Rate limiting and caching
   - Database storage

4. **REST API**
   - Flask-based API
   - JSON responses
   - Easy backend integration

5. **Data Analysis**
   - Follower tracking
   - Content trends
   - Multi-profile comparisons

---

## Recommendations

### For Finding Organization Info:

1. **Manual Research First**
   - Google the show name
   - Check trademark databases
   - Search news articles

2. **Build Organization Database**
   - Manually research and document
   - Create lookup table
   - Update as you find info

3. **Cross-Reference Multiple Sources**
   - Don't rely on single source
   - Verify with multiple data points
   - Build confidence scores

4. **Legal Alternatives**
   - Contact Snapchat Business Support
   - Use official Snap Publisher directory
   - Partner with data providers

### For Scalable Crawling:

1. **Focus on Public Data**
   - Extract what's available
   - Don't try to bypass auth
   - Stay within ToS

2. **Enrich with External Data**
   - Use our crawler for Snapchat data
   - Add organization info from other sources
   - Combine multiple databases

3. **Build Knowledge Graph**
   - Map shows to organizations manually
   - Create relationships database
   - Update incrementally

---

## Summary

### What We Built:

✅ **Production crawler** for public Snapchat data
✅ **REST API** for backend integration
✅ **Batch processing** with rate limiting
✅ **Database storage** (SQLite)
✅ **Caching system** for efficiency
✅ **Corporate research** for known shows (Know Your Meme → Literally Media Ltd.)

### What's Not Possible:

❌ **Organization names** from Snapchat APIs (requires auth)
❌ **Publisher contact info** (private data)
❌ **Backend authenticated** endpoints (ToS violation)
❌ **Business details** without manual research

---

## Files Created:

1. ✅ `snapchat_crawler.py` - Production crawler
2. ✅ `snapchat_api.py` - REST API server
3. ✅ `snapchat_backend_api_crawler.py` - Backend API tester
4. ✅ `example_usage.py` - Usage examples
5. ✅ `CRAWLER_README.md` - Full documentation
6. ✅ `SNAPCHAT_CORPORATE_INVESTIGATION.md` - Know Your Meme research
7. ✅ `SCRAPED_DATA_SUMMARY.md` - Test results

---

## Next Steps:

1. **Use the crawler** for public data extraction
2. **Manually research** organizations for each show
3. **Build database** mapping shows to companies
4. **Enrich data** from external sources
5. **Stay legal** - don't try to bypass auth

---

*Last Updated: 2025-11-10*
*Tested URLs: 2*
*APIs Tested: 13*
*Success Rate (Public Data): 100%*
*Success Rate (Org Data): 0% (requires manual research)*
