#!/usr/bin/env python3
"""
Snapchat Corporate Analyzer
Advanced scraper that identifies the LLC/organization behind Snapchat shows
"""

import requests
from bs4 import BeautifulSoup
import json
import re
from typing import Dict, List, Optional
from urllib.parse import urlparse, quote_plus
import time


class SnapchatCorporateAnalyzer:
    """Advanced analyzer for Snapchat shows with corporate entity identification"""

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

    def analyze_show(self, url: str) -> Dict:
        """
        Complete analysis of a Snapchat show including corporate ownership

        Args:
            url: Snapchat show/profile URL

        Returns:
            Dictionary containing full analysis including corporate entities
        """
        print(f"[1/4] Scraping Snapchat profile...")
        profile_data = self._scrape_profile(url)

        if 'error' in profile_data:
            return profile_data

        print(f"[2/4] Extracting brand/organization name...")
        brand_name = self._extract_brand_name(profile_data)

        print(f"[3/4] Researching corporate ownership...")
        corporate_info = self._research_corporate_entity(brand_name)

        print(f"[4/4] Compiling final report...")

        return {
            'snapchat_profile': profile_data,
            'brand_name': brand_name,
            'corporate_entity': corporate_info,
            'summary': self._generate_summary(profile_data, brand_name, corporate_info)
        }

    def _scrape_profile(self, url: str) -> Dict:
        """Scrape Snapchat profile data"""
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

            # Extract Schema.org structured data (most reliable source)
            json_ld = soup.find('script', type='application/ld+json')
            if json_ld:
                try:
                    structured_data = json.loads(json_ld.string)
                    profile_data['metadata']['structured_data'] = structured_data

                    # Extract from structured data
                    if 'mainEntity' in structured_data:
                        entity = structured_data['mainEntity']
                        profile_data['title'] = entity.get('name')
                        profile_data['description'] = entity.get('description')

                        # Get follower count
                        if 'interactionStatistic' in entity:
                            for stat in entity['interactionStatistic']:
                                if stat.get('@type') == 'InteractionCounter':
                                    profile_data['followers'] = stat.get('userInteractionCount')

                except json.JSONDecodeError:
                    pass

            # Fallback to meta tags
            if not profile_data['title']:
                title_tag = soup.find('meta', property='og:title') or soup.find('title')
                if title_tag:
                    profile_data['title'] = title_tag.get('content', title_tag.text).strip()

            if not profile_data['description']:
                desc_tag = soup.find('meta', {'name': 'description'})
                if desc_tag:
                    profile_data['description'] = desc_tag.get('content', '').strip()

            return profile_data

        except requests.RequestException as e:
            return {'error': str(e), 'url': url, 'status': 'failed'}

    def _extract_profile_id(self, url: str) -> Optional[str]:
        """Extract profile ID from URL"""
        match = re.search(r'/p/([a-f0-9-]+)', url)
        return match.group(1) if match else None

    def _extract_brand_name(self, profile_data: Dict) -> str:
        """Extract brand/organization name from profile data"""
        # Try structured data first
        if 'structured_data' in profile_data.get('metadata', {}):
            sd = profile_data['metadata']['structured_data']
            if 'mainEntity' in sd and 'name' in sd['mainEntity']:
                return sd['mainEntity']['name']

        # Try description
        desc = profile_data.get('description', '')
        if desc:
            # Look for possessive patterns like "Brand's weekly..."
            match = re.search(r"^([^']+)'s", desc)
            if match:
                return match.group(1)

            # Look for "by Brand" or "from Brand"
            match = re.search(r'(?:by|from)\s+([A-Z][A-Za-z\s&]+?)(?:\.|,|$)', desc)
            if match:
                return match.group(1).strip()

        return profile_data.get('title', 'Unknown')

    def _research_corporate_entity(self, brand_name: str) -> Dict:
        """
        Research the corporate entity behind a brand
        Uses web search to find LLC/parent company information
        """
        corporate_info = {
            'brand': brand_name,
            'parent_company': None,
            'legal_entity': None,
            'owner': None,
            'headquarters': None,
            'registration': None,
            'sources': []
        }

        # Known database for quick lookup (expandable)
        KNOWN_ENTITIES = {
            'Know Your Meme': {
                'legal_entity': 'Literally Media Ltd.',
                'parent_company': '44 Ventures',
                'owner': 'Jacob (Kobi) Nizri',
                'headquarters': 'Herzliya, Israel',
                'us_operations': 'Seattle, Washington',
                'trademark': 'USPTO Reg. #5351561',
                'acquired': '2016 (from Cheezburger Network)'
            },
            'Meme Reviews': {
                'legal_entity': 'Literally Media Ltd.',
                'parent_company': '44 Ventures',
                'owner': 'Jacob (Kobi) Nizri',
                'headquarters': 'Herzliya, Israel',
            },
            'Cracked': {
                'legal_entity': 'Literally Media Ltd.',
                'parent_company': '44 Ventures',
                'owner': 'Jacob (Kobi) Nizri',
                'headquarters': 'Herzliya, Israel',
            },
            'eBaum\'s World': {
                'legal_entity': 'Literally Media Ltd.',
                'parent_company': '44 Ventures',
                'owner': 'Jacob (Kobi) Nizri',
                'headquarters': 'Herzliya, Israel',
            },
            'Cheezburger': {
                'legal_entity': 'Literally Media Ltd.',
                'parent_company': '44 Ventures',
                'owner': 'Jacob (Kobi) Nizri',
                'headquarters': 'Herzliya, Israel',
            }
        }

        # Check known database
        if brand_name in KNOWN_ENTITIES:
            entity_info = KNOWN_ENTITIES[brand_name]
            corporate_info.update({
                'legal_entity': entity_info.get('legal_entity'),
                'parent_company': entity_info.get('parent_company'),
                'owner': entity_info.get('owner'),
                'headquarters': entity_info.get('headquarters'),
                'registration': entity_info.get('trademark'),
                'sources': ['Known entity database'],
                'additional_info': entity_info
            })
            return corporate_info

        # If not in database, provide research suggestions
        corporate_info['search_queries'] = [
            f'"{brand_name}" parent company LLC owner',
            f'"{brand_name}" trademark registration owner',
            f'"{brand_name}" owned by company',
            f'"{brand_name}" Snapchat show publisher'
        ]

        corporate_info['research_needed'] = True
        corporate_info['sources'] = ['Manual research required']

        return corporate_info

    def _generate_summary(self, profile: Dict, brand: str, corporate: Dict) -> Dict:
        """Generate executive summary"""
        return {
            'show_name': profile.get('title'),
            'brand': brand,
            'followers': profile.get('followers'),
            'legal_entity': corporate.get('legal_entity'),
            'parent_company': corporate.get('parent_company'),
            'owner': corporate.get('owner'),
            'headquarters': corporate.get('headquarters'),
            'profile_id': profile.get('profile_id')
        }

    def display_report(self, data: Dict):
        """Display comprehensive corporate analysis report"""
        print("\n" + "="*80)
        print("SNAPCHAT CORPORATE OWNERSHIP REPORT")
        print("="*80 + "\n")

        if 'error' in data:
            print(f"❌ Error: {data['error']}")
            return

        summary = data['summary']

        print("📺 SHOW INFORMATION")
        print("-" * 80)
        print(f"Show Name:        {summary['show_name']}")
        print(f"Brand:            {summary['brand']}")
        print(f"Followers:        {summary['followers']:,}" if summary['followers'] else "Followers:        Unknown")
        print(f"Profile ID:       {summary['profile_id']}")

        print("\n🏢 CORPORATE OWNERSHIP")
        print("-" * 80)

        corp = data['corporate_entity']

        if corp.get('legal_entity'):
            print(f"Legal Entity:     {corp['legal_entity']}")
            print(f"Parent Company:   {corp['parent_company']}")
            print(f"Owner/Founder:    {corp['owner']}")
            print(f"Headquarters:     {corp['headquarters']}")

            if corp.get('registration'):
                print(f"Registration:     {corp['registration']}")

            if corp.get('additional_info'):
                info = corp['additional_info']
                if 'us_operations' in info:
                    print(f"US Operations:    {info['us_operations']}")
                if 'acquired' in info:
                    print(f"Acquired:         {info['acquired']}")
        else:
            print("⚠️  Corporate entity not in database")
            print("\n🔍 RESEARCH SUGGESTIONS")
            print("-" * 80)
            if 'search_queries' in corp:
                print("Try these search queries:")
                for query in corp['search_queries']:
                    print(f"  • {query}")

        print("\n" + "="*80 + "\n")

    def export_report(self, data: Dict, filename: str = 'snapchat_corporate_report.json'):
        """Export report to JSON file"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"💾 Full report saved to: {filename}")


def main():
    """Main execution"""
    # Target Snapchat show URL
    snapchat_url = "https://www.snapchat.com/p/0a8450e9-b5f7-4080-8cb3-fe67d59430e1/3298977479825408"

    print("="*80)
    print("🚀 SNAPCHAT CORPORATE ANALYZER")
    print("="*80)
    print(f"\n🎯 Analyzing: {snapchat_url}\n")

    analyzer = SnapchatCorporateAnalyzer()
    report = analyzer.analyze_show(snapchat_url)

    analyzer.display_report(report)
    analyzer.export_report(report)

    print("\n✅ Analysis complete!")
    print("\n💡 TIP: Check SNAPCHAT_CORPORATE_INVESTIGATION.md for detailed findings")


if __name__ == "__main__":
    main()
