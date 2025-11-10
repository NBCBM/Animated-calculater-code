#!/usr/bin/env python3
"""
Snapchat Profile Scraper
Extracts publicly available information from Snapchat show/profile URLs
"""

import requests
from bs4 import BeautifulSoup
import json
import re
from typing import Dict, Optional
from urllib.parse import urlparse


class SnapchatScraper:
    """Scraper for Snapchat public profile information"""

    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }

    def scrape_profile(self, url: str) -> Dict:
        """
        Scrape publicly available information from a Snapchat profile URL

        Args:
            url: Snapchat profile/show URL

        Returns:
            Dictionary containing profile information
        """
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            profile_data = {
                'url': url,
                'profile_id': self._extract_profile_id(url),
                'title': None,
                'description': None,
                'followers': None,
                'organization': None,
                'metadata': {}
            }

            # Extract title from meta tags or page title
            title_tag = soup.find('meta', property='og:title') or soup.find('title')
            if title_tag:
                profile_data['title'] = title_tag.get('content', title_tag.text).strip()

            # Extract description
            desc_tag = soup.find('meta', property='og:description') or soup.find('meta', {'name': 'description'})
            if desc_tag:
                profile_data['description'] = desc_tag.get('content', '').strip()

            # Try to extract JSON-LD structured data
            json_ld = soup.find('script', type='application/ld+json')
            if json_ld:
                try:
                    structured_data = json.loads(json_ld.string)
                    profile_data['metadata']['structured_data'] = structured_data
                except json.JSONDecodeError:
                    pass

            # Look for embedded data in script tags
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string:
                    # Try to extract profile data from JavaScript
                    profile_match = re.search(r'profileData\s*=\s*({.*?});', script.string, re.DOTALL)
                    if profile_match:
                        try:
                            profile_data['metadata']['profile_data'] = json.loads(profile_match.group(1))
                        except json.JSONDecodeError:
                            pass

                    # Look for follower count
                    follower_match = re.search(r'follower[sS]?["\']?\s*[:=]\s*["\']?([\d,]+)', script.string)
                    if follower_match:
                        profile_data['followers'] = follower_match.group(1).replace(',', '')

                    # Look for organization/publisher info
                    org_match = re.search(r'publisher["\']?\s*[:=]\s*["\']([^"\']+)', script.string)
                    if org_match:
                        profile_data['organization'] = org_match.group(1)

            # Extract all meta tags for additional info
            meta_tags = soup.find_all('meta')
            profile_data['metadata']['meta_tags'] = {
                tag.get('property', tag.get('name', 'unknown')): tag.get('content', '')
                for tag in meta_tags if tag.get('content')
            }

            # Look for visible text that might contain organization info
            text_content = soup.get_text()

            # Common patterns for organization mentions
            org_patterns = [
                r'(?:by|from|created by|operated by)\s+([A-Z][A-Za-z\s&]+?)(?:\.|,|\n)',
                r'©\s*\d{4}\s+([A-Z][A-Za-z\s&]+?)(?:\.|,|\n)',
            ]

            for pattern in org_patterns:
                match = re.search(pattern, text_content)
                if match and not profile_data['organization']:
                    profile_data['organization'] = match.group(1).strip()
                    break

            return profile_data

        except requests.RequestException as e:
            return {
                'error': str(e),
                'url': url,
                'status': 'failed'
            }

    def _extract_profile_id(self, url: str) -> Optional[str]:
        """Extract profile ID from Snapchat URL"""
        # Pattern: /p/{profile_id}/{content_id}
        match = re.search(r'/p/([a-f0-9-]+)', url)
        return match.group(1) if match else None

    def display_results(self, data: Dict):
        """Pretty print the scraped data"""
        print("\n" + "="*80)
        print("SNAPCHAT PROFILE SCRAPER - RESULTS")
        print("="*80 + "\n")

        if 'error' in data:
            print(f"❌ Error: {data['error']}")
            return

        print(f"🔗 URL: {data['url']}")
        print(f"🆔 Profile ID: {data['profile_id']}")
        print(f"\n📺 Title: {data['title']}")
        print(f"📝 Description: {data['description']}")
        print(f"👥 Followers: {data['followers']}")
        print(f"🏢 Organization: {data['organization']}")

        print(f"\n📊 Additional Metadata:")
        for key, value in data['metadata'].items():
            if key != 'meta_tags':  # Skip meta_tags for cleaner output
                print(f"  - {key}: {value}")

        print("\n" + "="*80 + "\n")


def main():
    """Main execution function"""
    # The Snapchat URL to scrape
    snapchat_url = "https://www.snapchat.com/p/0a8450e9-b5f7-4080-8cb3-fe67d59430e1/3298977479825408"

    print("🚀 Starting Snapchat Profile Scraper...")
    print(f"🎯 Target: {snapchat_url}\n")

    scraper = SnapchatScraper()
    results = scraper.scrape_profile(snapchat_url)
    scraper.display_results(results)

    # Save to JSON file
    output_file = "snapchat_profile_data.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"💾 Results saved to: {output_file}")


if __name__ == "__main__":
    main()
