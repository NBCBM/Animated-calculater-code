#!/usr/bin/env python3
"""
Snapchat Backend Crawler - Production Ready
High-performance crawler for extracting Snapchat show metadata at scale
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
import logging
from typing import Dict, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse
from datetime import datetime
import hashlib
from pathlib import Path


class SnapchatCrawler:
    """Production-grade Snapchat profile crawler with rate limiting and caching"""

    def __init__(
        self,
        cache_dir: str = "./snapchat_cache",
        rate_limit: float = 1.0,
        max_retries: int = 3,
        timeout: int = 10,
        max_workers: int = 5
    ):
        """
        Initialize crawler

        Args:
            cache_dir: Directory for caching results
            rate_limit: Seconds between requests (rate limiting)
            max_retries: Maximum retry attempts on failure
            timeout: Request timeout in seconds
            max_workers: Max concurrent workers for batch processing
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)

        self.rate_limit = rate_limit
        self.max_retries = max_retries
        self.timeout = timeout
        self.max_workers = max_workers

        self.last_request_time = 0
        self.session = self._create_session()

        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        self.logger = logging.getLogger(__name__)

    def _create_session(self) -> requests.Session:
        """Create requests session with headers"""
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        })
        return session

    def _rate_limit_wait(self):
        """Implement rate limiting"""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.rate_limit:
            time.sleep(self.rate_limit - elapsed)
        self.last_request_time = time.time()

    def _get_cache_key(self, url: str) -> str:
        """Generate cache key from URL"""
        return hashlib.md5(url.encode()).hexdigest()

    def _get_cached_data(self, url: str) -> Optional[Dict]:
        """Retrieve cached data if available"""
        cache_key = self._get_cache_key(url)
        cache_file = self.cache_dir / f"{cache_key}.json"

        if cache_file.exists():
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.logger.info(f"Cache hit: {url}")
                    return data
            except json.JSONDecodeError:
                self.logger.warning(f"Invalid cache file: {cache_file}")
        return None

    def _save_to_cache(self, url: str, data: Dict):
        """Save data to cache"""
        cache_key = self._get_cache_key(url)
        cache_file = self.cache_dir / f"{cache_key}.json"

        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            self.logger.debug(f"Cached: {url}")
        except Exception as e:
            self.logger.error(f"Failed to cache {url}: {e}")

    def _extract_profile_id(self, url: str) -> Optional[str]:
        """Extract profile ID from Snapchat URL"""
        match = re.search(r'/p/([a-f0-9-]+)', url)
        return match.group(1) if match else None

    def _extract_content_id(self, url: str) -> Optional[str]:
        """Extract content ID from Snapchat URL"""
        match = re.search(r'/p/[a-f0-9-]+/(\d+)', url)
        return match.group(1) if match else None

    def scrape_profile(self, url: str, use_cache: bool = True) -> Dict:
        """
        Scrape a single Snapchat profile

        Args:
            url: Snapchat profile URL
            use_cache: Whether to use cached data

        Returns:
            Dictionary with profile data
        """
        # Check cache first
        if use_cache:
            cached = self._get_cached_data(url)
            if cached:
                return cached

        # Rate limiting
        self._rate_limit_wait()

        profile_data = {
            'url': url,
            'profile_id': self._extract_profile_id(url),
            'content_id': self._extract_content_id(url),
            'scraped_at': datetime.utcnow().isoformat(),
            'success': False,
            'data': {}
        }

        for attempt in range(self.max_retries):
            try:
                self.logger.info(f"Scraping {url} (attempt {attempt + 1}/{self.max_retries})")

                response = self.session.get(url, timeout=self.timeout)
                response.raise_for_status()

                soup = BeautifulSoup(response.text, 'html.parser')

                # Extract structured data (Schema.org JSON-LD)
                json_ld = soup.find('script', type='application/ld+json')
                if json_ld:
                    try:
                        structured_data = json.loads(json_ld.string)
                        profile_data['data']['structured_data'] = structured_data

                        # Extract key fields
                        if 'mainEntity' in structured_data:
                            entity = structured_data['mainEntity']
                            profile_data['data']['name'] = entity.get('name')
                            profile_data['data']['description'] = entity.get('description')
                            profile_data['data']['image'] = entity.get('image')
                            profile_data['data']['url'] = entity.get('url')

                            # Extract follower count
                            if 'interactionStatistic' in entity:
                                for stat in entity['interactionStatistic']:
                                    if stat.get('@type') == 'InteractionCounter':
                                        profile_data['data']['followers'] = stat.get('userInteractionCount')

                    except json.JSONDecodeError as e:
                        self.logger.warning(f"Failed to parse JSON-LD: {e}")

                # Extract all meta tags
                meta_tags = {}
                for tag in soup.find_all('meta'):
                    prop = tag.get('property') or tag.get('name')
                    content = tag.get('content')
                    if prop and content:
                        meta_tags[prop] = content

                profile_data['data']['meta_tags'] = meta_tags

                # Extract OpenGraph data
                og_data = {
                    'title': meta_tags.get('og:title'),
                    'description': meta_tags.get('og:description'),
                    'image': meta_tags.get('og:image'),
                    'url': meta_tags.get('og:url'),
                    'type': meta_tags.get('og:type'),
                    'site_name': meta_tags.get('og:site_name')
                }
                profile_data['data']['opengraph'] = og_data

                # Extract Twitter Card data
                twitter_data = {
                    'card': meta_tags.get('twitter:card'),
                    'site': meta_tags.get('twitter:site'),
                    'title': meta_tags.get('twitter:title'),
                    'description': meta_tags.get('twitter:description'),
                    'image': meta_tags.get('twitter:image')
                }
                profile_data['data']['twitter'] = twitter_data

                profile_data['success'] = True
                profile_data['status_code'] = response.status_code

                # Cache the result
                if use_cache:
                    self._save_to_cache(url, profile_data)

                self.logger.info(f"✓ Successfully scraped: {profile_data['data'].get('name', 'Unknown')}")
                return profile_data

            except requests.RequestException as e:
                self.logger.warning(f"Request failed (attempt {attempt + 1}): {e}")
                if attempt < self.max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    self.logger.info(f"Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    profile_data['error'] = str(e)
                    profile_data['error_type'] = type(e).__name__

            except Exception as e:
                self.logger.error(f"Unexpected error: {e}")
                profile_data['error'] = str(e)
                profile_data['error_type'] = type(e).__name__
                break

        return profile_data

    def scrape_batch(self, urls: List[str], use_cache: bool = True) -> List[Dict]:
        """
        Scrape multiple URLs concurrently

        Args:
            urls: List of Snapchat profile URLs
            use_cache: Whether to use cached data

        Returns:
            List of profile data dictionaries
        """
        self.logger.info(f"Starting batch scrape of {len(urls)} URLs")

        results = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_url = {
                executor.submit(self.scrape_profile, url, use_cache): url
                for url in urls
            }

            for future in as_completed(future_to_url):
                url = future_to_url[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    self.logger.error(f"Failed to scrape {url}: {e}")
                    results.append({
                        'url': url,
                        'success': False,
                        'error': str(e)
                    })

        self.logger.info(f"Batch scrape complete: {len(results)} results")
        return results

    def export_to_json(self, data: Dict | List[Dict], filename: str):
        """Export data to JSON file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            self.logger.info(f"Exported to: {filename}")
        except Exception as e:
            self.logger.error(f"Export failed: {e}")

    def get_profile_summary(self, profile_data: Dict) -> Dict:
        """
        Extract clean summary from raw profile data

        Args:
            profile_data: Raw profile data from scrape

        Returns:
            Clean summary dictionary
        """
        if not profile_data.get('success'):
            return {
                'success': False,
                'error': profile_data.get('error', 'Unknown error')
            }

        data = profile_data.get('data', {})

        return {
            'success': True,
            'profile_id': profile_data.get('profile_id'),
            'content_id': profile_data.get('content_id'),
            'name': data.get('name'),
            'description': data.get('description'),
            'followers': data.get('followers'),
            'image': data.get('image'),
            'url': profile_data.get('url'),
            'scraped_at': profile_data.get('scraped_at')
        }

    def clear_cache(self):
        """Clear all cached data"""
        try:
            for cache_file in self.cache_dir.glob("*.json"):
                cache_file.unlink()
            self.logger.info("Cache cleared")
        except Exception as e:
            self.logger.error(f"Failed to clear cache: {e}")


# CLI Interface for testing
def main():
    """Example usage"""
    import sys

    crawler = SnapchatCrawler(
        cache_dir="./snapchat_cache",
        rate_limit=1.0,  # 1 second between requests
        max_retries=3,
        max_workers=3
    )

    # Example URLs
    test_urls = [
        "https://www.snapchat.com/p/0a8450e9-b5f7-4080-8cb3-fe67d59430e1/3298977479825408",
        "https://www.snapchat.com/p/7c94b2b8-a716-425d-bc0e-6a7ad13eae8f/63115248932864"
    ]

    if len(sys.argv) > 1:
        # Use provided URLs
        urls = sys.argv[1:]
    else:
        # Use test URLs
        urls = test_urls

    print(f"\n{'='*80}")
    print(f"SNAPCHAT BACKEND CRAWLER")
    print(f"{'='*80}\n")

    # Single URL scrape
    if len(urls) == 1:
        result = crawler.scrape_profile(urls[0])
        summary = crawler.get_profile_summary(result)

        print(f"\n📺 Show: {summary.get('name')}")
        print(f"👥 Followers: {summary.get('followers'):,}" if summary.get('followers') else "👥 Followers: Unknown")
        print(f"🆔 Profile ID: {summary.get('profile_id')}")
        print(f"📝 Description: {summary.get('description')}")

        crawler.export_to_json(result, 'snapchat_crawl_result.json')

    # Batch scrape
    else:
        results = crawler.scrape_batch(urls)

        print(f"\n📊 BATCH RESULTS:")
        print(f"{'='*80}\n")

        for result in results:
            summary = crawler.get_profile_summary(result)
            status = "✓" if summary.get('success') else "✗"
            print(f"{status} {summary.get('name', 'Unknown')} - {summary.get('followers', 0):,} followers")

        crawler.export_to_json(results, 'snapchat_crawl_batch.json')

    print(f"\n{'='*80}")
    print(f"✓ Crawl complete\n")


if __name__ == "__main__":
    main()
