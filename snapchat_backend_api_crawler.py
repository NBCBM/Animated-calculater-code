#!/usr/bin/env python3
"""
Snapchat Backend API Crawler
Hits actual Snapchat backend APIs to extract organization/publisher info
"""

import requests
import json
import re
from typing import Dict, Optional, List
from urllib.parse import urlparse, quote
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SnapchatBackendCrawler:
    """Crawl Snapchat backend APIs for organization/publisher data"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://www.snapchat.com',
            'Referer': 'https://www.snapchat.com/',
        })

        # Known API endpoints
        self.api_endpoints = [
            'https://gcp.api.snapchat.com',
            'https://aws.api.snapchat.com',
            'https://us-central1-gcp.api.snapchat.com',
            'https://story.snapchat.com',
            'https://publish.snapchat.com'
        ]

    def extract_profile_id(self, url: str) -> Optional[str]:
        """Extract profile ID from URL"""
        match = re.search(r'/p/([a-f0-9-]+)', url)
        return match.group(1) if match else None

    def get_next_data(self, url: str) -> Dict:
        """Extract __NEXT_DATA__ from page"""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            # Find __NEXT_DATA__ script tag
            match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
                            response.text, re.DOTALL)

            if match:
                return json.loads(match.group(1))

        except Exception as e:
            logger.error(f"Failed to extract __NEXT_DATA__: {e}")

        return {}

    def try_api_endpoints(self, profile_id: str) -> Dict:
        """
        Try various API endpoints to find organization/publisher info
        """
        results = {
            'profile_id': profile_id,
            'api_attempts': [],
            'organization': None,
            'publisher_info': None
        }

        # Try different API patterns
        api_patterns = [
            # Publish API endpoints
            f'https://publish.snapchat.com/v2/user/{profile_id}/settings',
            f'https://publish.snapchat.com/v2/profile/{profile_id}',
            f'https://publish.snapchat.com/v2/publisher/{profile_id}',
            f'https://publish.snapchat.com/api/v2/user/{profile_id}',

            # Content/Story APIs
            f'https://story.snapchat.com/v2/profile/{profile_id}',
            f'https://story.snapchat.com/api/profile/{profile_id}',

            # GCP APIs
            f'https://gcp.api.snapchat.com/discover/profile/{profile_id}',
            f'https://gcp.api.snapchat.com/v1/profile/{profile_id}',
            f'https://us-central1-gcp.api.snapchat.com/profile/{profile_id}',

            # AWS APIs
            f'https://aws.api.snapchat.com/profile/{profile_id}',
            f'https://aws.api.snapchat.com/v1/profile/{profile_id}',

            # Web APIs
            f'https://www.snapchat.com/api/profile/{profile_id}',
            f'https://www.snapchat.com/_next/data/*/p/{profile_id}.json',
        ]

        for api_url in api_patterns:
            try:
                logger.info(f"Trying: {api_url}")
                response = self.session.get(api_url, timeout=5)

                attempt = {
                    'url': api_url,
                    'status_code': response.status_code,
                    'success': False
                }

                if response.status_code == 200:
                    try:
                        data = response.json()
                        attempt['success'] = True
                        attempt['data'] = data

                        # Extract organization info if present
                        org_fields = self._extract_organization_fields(data)
                        if org_fields:
                            results['organization'] = org_fields
                            results['publisher_info'] = data

                        logger.info(f"✓ SUCCESS: {api_url}")
                    except json.JSONDecodeError:
                        attempt['response_type'] = 'non-json'

                results['api_attempts'].append(attempt)

            except requests.RequestException as e:
                logger.debug(f"Failed: {api_url} - {str(e)}")
                results['api_attempts'].append({
                    'url': api_url,
                    'error': str(e),
                    'success': False
                })

        return results

    def _extract_organization_fields(self, data: Dict) -> Optional[Dict]:
        """Extract organization/publisher fields from API response"""
        org_info = {}

        # Common field names for organization data
        org_field_patterns = [
            'organization', 'company', 'publisher', 'agency',
            'org_name', 'company_name', 'publisher_name', 'agency_name',
            'business_name', 'brand_name', 'owner', 'operator'
        ]

        def search_dict(d, path=""):
            """Recursively search dictionary for organization fields"""
            if isinstance(d, dict):
                for key, value in d.items():
                    lower_key = key.lower()

                    # Check if key matches organization patterns
                    for pattern in org_field_patterns:
                        if pattern in lower_key:
                            org_info[f"{path}.{key}" if path else key] = value

                    # Recurse into nested dicts
                    search_dict(value, f"{path}.{key}" if path else key)

            elif isinstance(d, list):
                for i, item in enumerate(d):
                    search_dict(item, f"{path}[{i}]")

        search_dict(data)

        return org_info if org_info else None

    def crawl_profile(self, url: str) -> Dict:
        """
        Complete crawl of a Snapchat profile including backend API calls
        """
        logger.info(f"Crawling: {url}")

        profile_id = self.extract_profile_id(url)
        if not profile_id:
            return {'error': 'Invalid URL - could not extract profile ID'}

        results = {
            'url': url,
            'profile_id': profile_id,
            'next_data': {},
            'backend_api_data': {},
            'organization_info': None
        }

        # 1. Get __NEXT_DATA__ from page
        logger.info("Step 1: Extracting __NEXT_DATA__...")
        next_data = self.get_next_data(url)
        results['next_data'] = next_data

        # Extract basic info from __NEXT_DATA__
        if 'props' in next_data and 'pageProps' in next_data['props']:
            page_props = next_data['props']['pageProps']
            if 'publicProfileInfo' in page_props:
                profile_info = page_props['publicProfileInfo']
                results['basic_info'] = {
                    'title': profile_info.get('title'),
                    'username': profile_info.get('username'),
                    'bio': profile_info.get('bio'),
                    'subscriber_count': profile_info.get('subscriberCount'),
                    'publisher_type': profile_info.get('publisherType'),
                    'business_profile_id': profile_info.get('businessProfileId'),
                }

        # 2. Try backend API endpoints
        logger.info("Step 2: Trying backend API endpoints...")
        api_results = self.try_api_endpoints(profile_id)
        results['backend_api_data'] = api_results

        if api_results.get('organization'):
            results['organization_info'] = api_results['organization']

        # 3. Try to find related social media links
        logger.info("Step 3: Checking for related social links...")
        if 'publicProfileInfo' in page_props:
            same_as_links = page_props['publicProfileInfo'].get('sameAsLinks', [])
            if same_as_links:
                results['social_links'] = same_as_links

        return results

    def format_results(self, results: Dict) -> str:
        """Format results for display"""
        output = []
        output.append("="*80)
        output.append("SNAPCHAT BACKEND API CRAWLER RESULTS")
        output.append("="*80)

        output.append(f"\n📺 PROFILE: {results.get('url')}")
        output.append(f"🆔 Profile ID: {results.get('profile_id')}")

        if 'basic_info' in results:
            info = results['basic_info']
            output.append(f"\n📊 BASIC INFO:")
            output.append(f"  Name: {info.get('title')}")
            output.append(f"  Username: {info.get('username', 'N/A')}")
            output.append(f"  Subscribers: {info.get('subscriber_count', 'N/A')}")
            output.append(f"  Publisher Type: {info.get('publisher_type')}")
            output.append(f"  Business ID: {info.get('business_profile_id')}")

        if results.get('organization_info'):
            output.append(f"\n🏢 ORGANIZATION INFO FOUND:")
            for key, value in results['organization_info'].items():
                output.append(f"  {key}: {value}")
        else:
            output.append(f"\n⚠️  NO ORGANIZATION INFO FOUND IN APIS")

        # API attempts summary
        backend_data = results.get('backend_api_data', {})
        attempts = backend_data.get('api_attempts', [])
        successful = [a for a in attempts if a.get('success')]

        output.append(f"\n🔍 API ATTEMPTS:")
        output.append(f"  Total attempts: {len(attempts)}")
        output.append(f"  Successful: {len(successful)}")

        if successful:
            output.append(f"\n✓ SUCCESSFUL ENDPOINTS:")
            for attempt in successful:
                output.append(f"  - {attempt['url']}")

        output.append("\n" + "="*80)

        return "\n".join(output)


def main():
    """Test the backend crawler"""
    import sys

    urls = [
        "https://www.snapchat.com/p/0a8450e9-b5f7-4080-8cb3-fe67d59430e1/3298977479825408",
        "https://www.snapchat.com/p/7c94b2b8-a716-425d-bc0e-6a7ad13eae8f/63115248932864"
    ]

    if len(sys.argv) > 1:
        urls = sys.argv[1:]

    crawler = SnapchatBackendCrawler()

    for url in urls:
        print(f"\n{'='*80}")
        print(f"CRAWLING: {url}")
        print(f"{'='*80}\n")

        results = crawler.crawl_profile(url)
        print(crawler.format_results(results))

        # Save to file
        filename = f"backend_crawl_{results['profile_id']}.json"
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n💾 Full results saved to: {filename}\n")


if __name__ == "__main__":
    main()
