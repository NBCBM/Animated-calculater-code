# Snapchat Backend Crawler System

Production-ready backend crawler for extracting Snapchat show metadata at scale.

## 🚀 Features

- **High Performance**: Concurrent scraping with thread pooling
- **Rate Limiting**: Configurable rate limits to avoid blocking
- **Caching**: Built-in file-based caching system
- **Retry Logic**: Automatic retries with exponential backoff
- **REST API**: Flask-based API for easy integration
- **Database Storage**: SQLite database for persistent storage
- **Batch Processing**: Scrape multiple URLs simultaneously
- **Error Handling**: Comprehensive error handling and logging
- **Production Ready**: Built for backend/server deployment

## 📦 Installation

```bash
pip install -r requirements.txt
```

### Requirements

```txt
requests>=2.31.0
beautifulsoup4>=4.12.0
lxml>=4.9.0
flask>=3.0.0
flask-cors>=4.0.0
```

## 🔧 Components

### 1. Core Crawler (`snapchat_crawler.py`)

The main crawling engine with:
- Profile scraping
- Batch processing
- Caching
- Rate limiting
- Retry logic

### 2. REST API (`snapchat_api.py`)

Flask-based REST API with endpoints:
- `POST /scrape` - Scrape single profile
- `POST /scrape/batch` - Scrape multiple profiles
- `GET /profile/<id>` - Get stored profile
- `GET /profiles` - List all profiles (paginated)
- `GET /search?q=<query>` - Search profiles
- `GET /stats` - Get statistics
- `POST /cache/clear` - Clear cache

### 3. Database

SQLite database with tables:
- `profiles` - Stored profile data
- `scrape_logs` - Scraping history and logs

## 💻 Usage

### CLI Usage

#### Single URL:
```bash
python3 snapchat_crawler.py "https://www.snapchat.com/p/PROFILE_ID/CONTENT_ID"
```

#### Multiple URLs:
```bash
python3 snapchat_crawler.py "URL1" "URL2" "URL3"
```

### Python Library Usage

```python
from snapchat_crawler import SnapchatCrawler

# Initialize crawler
crawler = SnapchatCrawler(
    cache_dir="./snapchat_cache",
    rate_limit=1.0,        # 1 second between requests
    max_retries=3,         # Retry failed requests 3 times
    timeout=10,            # 10 second timeout
    max_workers=5          # 5 concurrent workers
)

# Scrape single profile
result = crawler.scrape_profile("https://www.snapchat.com/p/...")
summary = crawler.get_profile_summary(result)

print(f"Name: {summary['name']}")
print(f"Followers: {summary['followers']}")

# Batch scrape
urls = ["url1", "url2", "url3"]
results = crawler.scrape_batch(urls)

# Export to JSON
crawler.export_to_json(results, "output.json")
```

### REST API Usage

#### Start the API server:
```bash
python3 snapchat_api.py
```

Server runs on `http://localhost:5000`

#### API Examples:

**Scrape single profile:**
```bash
curl -X POST http://localhost:5000/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.snapchat.com/p/0a8450e9-b5f7-4080-8cb3-fe67d59430e1/3298977479825408",
    "use_cache": true
  }'
```

**Batch scrape:**
```bash
curl -X POST http://localhost:5000/scrape/batch \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://www.snapchat.com/p/PROFILE_ID_1/CONTENT_ID_1",
      "https://www.snapchat.com/p/PROFILE_ID_2/CONTENT_ID_2"
    ],
    "use_cache": true
  }'
```

**Get profile by ID:**
```bash
curl http://localhost:5000/profile/0a8450e9-b5f7-4080-8cb3-fe67d59430e1
```

**List all profiles:**
```bash
curl http://localhost:5000/profiles?page=1&per_page=20
```

**Search profiles:**
```bash
curl http://localhost:5000/search?q=meme
```

**Get statistics:**
```bash
curl http://localhost:5000/stats
```

## 📊 Data Structure

### Scraped Profile Data

```json
{
  "url": "https://www.snapchat.com/p/.../...",
  "profile_id": "0a8450e9-b5f7-4080-8cb3-fe67d59430e1",
  "content_id": "3298977479825408",
  "scraped_at": "2025-11-10T12:00:00",
  "success": true,
  "data": {
    "name": "Meme Reviews",
    "description": "Know Your Meme's weekly breakdowns...",
    "followers": 379700,
    "image": "https://...",
    "url": "https://www.snapchat.com/p/...",
    "structured_data": { ... },
    "meta_tags": { ... },
    "opengraph": { ... },
    "twitter": { ... }
  }
}
```

### Profile Summary

```json
{
  "success": true,
  "profile_id": "0a8450e9-b5f7-4080-8cb3-fe67d59430e1",
  "content_id": "3298977479825408",
  "name": "Meme Reviews",
  "description": "Know Your Meme's weekly breakdowns...",
  "followers": 379700,
  "image": "https://...",
  "url": "https://www.snapchat.com/p/.../...",
  "scraped_at": "2025-11-10T12:00:00"
}
```

## ⚙️ Configuration

### Crawler Settings

```python
crawler = SnapchatCrawler(
    cache_dir="./snapchat_cache",  # Cache directory
    rate_limit=1.0,                # Seconds between requests
    max_retries=3,                 # Maximum retry attempts
    timeout=10,                    # Request timeout (seconds)
    max_workers=5                  # Concurrent workers for batch
)
```

### API Settings

Edit in `snapchat_api.py`:
```python
app.run(
    host='0.0.0.0',  # Bind to all interfaces
    port=5000,       # Port number
    debug=True       # Debug mode (disable in production)
)
```

## 📈 Performance

- **Single scrape**: ~1-2 seconds per profile
- **Batch scraping**: ~5-10 profiles per 10 seconds (with rate limiting)
- **Cache hit**: < 0.01 seconds
- **Memory usage**: ~50-100 MB for typical workloads

## 🔒 Rate Limiting

Built-in rate limiting to avoid being blocked:
- Default: 1 second between requests
- Exponential backoff on retries
- Configurable per crawler instance

## 🗄️ Database Schema

### `profiles` table:
- `id` - Primary key
- `profile_id` - Snapchat profile ID (unique)
- `name` - Show/profile name
- `description` - Description text
- `followers` - Follower count
- `image` - Profile image URL
- `url` - Full Snapchat URL
- `raw_data` - Complete JSON data
- `created_at` - First scraped timestamp
- `updated_at` - Last updated timestamp

### `scrape_logs` table:
- `id` - Primary key
- `url` - Scraped URL
- `success` - Boolean success flag
- `error` - Error message (if failed)
- `scraped_at` - Scrape timestamp

## 🛠️ Advanced Usage

### Custom User Agents

```python
crawler.session.headers['User-Agent'] = 'Your Custom UA'
```

### Proxy Support

```python
crawler.session.proxies = {
    'http': 'http://proxy:port',
    'https': 'http://proxy:port'
}
```

### Clear Cache

```python
crawler.clear_cache()  # Clear all cached data
```

### Database Queries

```python
import sqlite3

conn = sqlite3.connect('snapchat_data.db')
cursor = conn.cursor()

# Get top profiles
cursor.execute("""
    SELECT name, followers
    FROM profiles
    ORDER BY followers DESC
    LIMIT 10
""")

for row in cursor.fetchall():
    print(f"{row[0]}: {row[1]:,} followers")

conn.close()
```

## 🚨 Error Handling

The crawler handles:
- Network timeouts
- HTTP errors (4xx, 5xx)
- Rate limiting (429)
- Invalid URLs
- Malformed HTML/JSON
- Connection errors

All errors are logged and returned in the response:

```json
{
  "success": false,
  "error": "Connection timeout",
  "error_type": "Timeout"
}
```

## 📝 Logging

Logs include:
- Scrape attempts and results
- Cache hits/misses
- Errors and retries
- Performance metrics

Enable detailed logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🔄 API Response Format

All API endpoints return JSON:

```json
{
  "success": true,
  "data": { ... },
  "error": null  // Only present on failure
}
```

## 🌐 Production Deployment

### Using Gunicorn (recommended):

```bash
pip install gunicorn

gunicorn -w 4 -b 0.0.0.0:5000 snapchat_api:app
```

### Using Docker:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .

RUN pip install -r requirements.txt

EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "snapchat_api:app"]
```

## 📊 Example: Batch Processing 1000 URLs

```python
from snapchat_crawler import SnapchatCrawler

crawler = SnapchatCrawler(
    rate_limit=0.5,    # 2 requests per second
    max_workers=10     # 10 concurrent workers
)

# Load URLs
with open('urls.txt') as f:
    urls = [line.strip() for line in f]

# Process in batches of 100
batch_size = 100
for i in range(0, len(urls), batch_size):
    batch = urls[i:i+batch_size]
    results = crawler.scrape_batch(batch)

    # Save results
    crawler.export_to_json(
        results,
        f'batch_{i//batch_size}.json'
    )

    print(f"Processed {i+len(batch)}/{len(urls)} URLs")
```

## 🔍 Extracted Data Fields

The crawler extracts:
- Profile name
- Description
- Follower count
- Profile image
- Profile URL
- Content ID
- Schema.org structured data
- OpenGraph metadata
- Twitter Card data
- All meta tags

## ⚡ Tips for Best Performance

1. **Enable caching** for repeated scrapes
2. **Use batch processing** for multiple URLs
3. **Adjust rate limits** based on your needs
4. **Monitor logs** for errors and retries
5. **Clear cache periodically** to get fresh data
6. **Use database** for persistent storage
7. **Deploy API** for easy integration

## 📞 Integration Examples

### Node.js:
```javascript
const axios = require('axios');

const response = await axios.post('http://localhost:5000/scrape', {
  url: 'https://www.snapchat.com/p/...',
  use_cache: true
});

console.log(response.data);
```

### PHP:
```php
$data = [
    'url' => 'https://www.snapchat.com/p/...',
    'use_cache' => true
];

$ch = curl_init('http://localhost:5000/scrape');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type:application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$result = json_decode($response, true);
```

## 📄 License

MIT License - Free for commercial and personal use

## 🤝 Contributing

Contributions welcome! Please submit PRs or issues on GitHub.

---

**Built for production backend use** 🚀
