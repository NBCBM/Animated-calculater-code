#!/usr/bin/env python3
"""
LinkedIn Snapchat Publisher Crawler
Finds organizations/companies that run Snapchat shows by crawling LinkedIn
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
from typing import Dict, List, Optional
from urllib.parse import quote_plus, urljoin
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


class LinkedInSnapchatCrawler:
    """Crawl LinkedIn to find Snapchat show publishers"""

    def __init__(self, delay: float = 2.0):
        """
        Initialize crawler

        Args:
            delay: Delay between requests to avoid rate limiting
        """
        self.delay = delay
        self.session = self._create_session()

        # Keywords that indicate media/content companies
        self.media_keywords = [
            'media', 'entertainment', 'content', 'production', 'digital',
            'publisher', 'broadcast', 'studio', 'network', 'creative',
            'shows', 'video', 'streaming', 'social media', 'influencer'
        ]

        # Keywords indicating Snapchat involvement
        self.snapchat_keywords = [
            'snapchat', 'snap inc', 'snap show', 'snapchat show',
            'snapchat discover', 'snap discover', 'snapchat publisher',
            'snap content', 'snapchat content'
        ]

        self.results = []

    def _create_session(self) -> requests.Session:
        """Create requests session with browser-like headers"""
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
        })
        return session

    def search_google_linkedin(self, query: str, num_results: int = 50) -> List[Dict]:
        """
        Use Google to search LinkedIn profiles/companies

        Args:
            query: Search query
            num_results: Number of results to fetch

        Returns:
            List of LinkedIn URLs and snippets
        """
        logger.info(f"Searching Google for: {query}")

        results = []
        search_url = f"https://www.google.com/search?q=site:linkedin.com+{quote_plus(query)}&num={num_results}"

        try:
            time.sleep(self.delay)
            response = self.session.get(search_url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Find all search result links
            for result in soup.find_all('div', class_='g'):
                link_tag = result.find('a')
                if link_tag and 'href' in link_tag.attrs:
                    url = link_tag['href']

                    # Only LinkedIn URLs
                    if 'linkedin.com' in url:
                        # Extract snippet
                        snippet_tag = result.find('div', class_=['VwiC3b', 'yXK7lf'])
                        snippet = snippet_tag.get_text() if snippet_tag else ''

                        # Extract title
                        title_tag = result.find('h3')
                        title = title_tag.get_text() if title_tag else ''

                        results.append({
                            'url': url,
                            'title': title,
                            'snippet': snippet,
                            'source': 'google'
                        })

            logger.info(f"Found {len(results)} LinkedIn results")

        except Exception as e:
            logger.error(f"Google search failed: {e}")

        return results

    def extract_company_info(self, url: str) -> Optional[Dict]:
        """
        Extract company information from LinkedIn URL

        Args:
            url: LinkedIn URL (profile or company page)

        Returns:
            Company information dictionary
        """
        logger.info(f"Extracting from: {url}")

        try:
            time.sleep(self.delay)
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            text_content = soup.get_text().lower()

            # Extract company name
            company_name = None

            # Try different selectors
            selectors = [
                ('meta', {'property': 'og:title'}),
                ('title', {}),
                ('h1', {}),
            ]

            for tag, attrs in selectors:
                element = soup.find(tag, attrs)
                if element:
                    if tag == 'meta':
                        company_name = element.get('content', '')
                    else:
                        company_name = element.get_text().strip()
                    if company_name:
                        break

            # Extract description
            description = ''
            desc_tag = soup.find('meta', {'property': 'og:description'}) or \
                       soup.find('meta', {'name': 'description'})
            if desc_tag:
                description = desc_tag.get('content', '')

            # Check if media brand
            is_media = any(keyword in text_content for keyword in self.media_keywords)

            # Check if mentions Snapchat
            mentions_snapchat = any(keyword in text_content for keyword in self.snapchat_keywords)

            # Count Snapchat mentions
            snapchat_count = sum(text_content.count(keyword) for keyword in self.snapchat_keywords)

            # Determine URL type
            url_type = 'unknown'
            if '/company/' in url:
                url_type = 'company'
            elif '/in/' in url:
                url_type = 'profile'
            elif '/school/' in url:
                url_type = 'school'

            return {
                'url': url,
                'url_type': url_type,
                'company_name': company_name,
                'description': description[:500] if description else '',
                'is_media_brand': is_media,
                'mentions_snapchat': mentions_snapchat,
                'snapchat_mention_count': snapchat_count,
                'full_text_sample': text_content[:1000],
                'scraped_at': datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Failed to extract from {url}: {e}")
            return None

    def validate_snapchat_publisher(self, company_info: Dict) -> Dict:
        """
        Validate if company is likely a Snapchat show publisher

        Args:
            company_info: Company information dictionary

        Returns:
            Validation result with confidence score
        """
        score = 0
        reasons = []

        # Check if media brand
        if company_info.get('is_media_brand'):
            score += 30
            reasons.append("Identified as media brand")

        # Check Snapchat mentions
        snapchat_mentions = company_info.get('snapchat_mention_count', 0)
        if snapchat_mentions > 0:
            score += min(snapchat_mentions * 10, 50)  # Cap at 50
            reasons.append(f"Mentions Snapchat {snapchat_mentions} times")

        # Check description
        description = company_info.get('description', '').lower()
        if 'snapchat show' in description or 'snap discover' in description:
            score += 40
            reasons.append("Explicitly mentions Snapchat shows in description")

        # Check company page vs profile
        if company_info.get('url_type') == 'company':
            score += 10
            reasons.append("Is a company page (not personal profile)")

        # Determine confidence level
        if score >= 70:
            confidence = 'HIGH'
        elif score >= 40:
            confidence = 'MEDIUM'
        elif score > 0:
            confidence = 'LOW'
        else:
            confidence = 'NONE'

        return {
            'is_likely_publisher': score >= 40,
            'confidence': confidence,
            'score': score,
            'reasons': reasons
        }

    def crawl(self, search_queries: List[str], max_results_per_query: int = 20) -> List[Dict]:
        """
        Main crawl function

        Args:
            search_queries: List of search queries to use
            max_results_per_query: Max results per query

        Returns:
            List of validated publishers
        """
        logger.info(f"Starting crawl with {len(search_queries)} queries")

        all_linkedin_urls = []

        # Step 1: Collect LinkedIn URLs from Google
        for query in search_queries:
            logger.info(f"\n{'='*80}")
            logger.info(f"Query: {query}")
            logger.info(f"{'='*80}")

            search_results = self.search_google_linkedin(query, max_results_per_query)
            all_linkedin_urls.extend(search_results)

            # Avoid rate limiting
            time.sleep(self.delay * 2)

        # Deduplicate URLs
        unique_urls = {}
        for item in all_linkedin_urls:
            url = item['url']
            if url not in unique_urls:
                unique_urls[url] = item

        logger.info(f"\nFound {len(unique_urls)} unique LinkedIn URLs")

        # Step 2: Extract company info from each URL
        publishers = []

        for i, (url, search_result) in enumerate(unique_urls.items(), 1):
            logger.info(f"\n[{i}/{len(unique_urls)}] Processing: {url}")

            company_info = self.extract_company_info(url)

            if company_info:
                # Add search context
                company_info['search_title'] = search_result.get('title', '')
                company_info['search_snippet'] = search_result.get('snippet', '')

                # Validate
                validation = self.validate_snapchat_publisher(company_info)
                company_info['validation'] = validation

                # Only keep if has some relevance
                if validation['score'] > 0:
                    publishers.append(company_info)

                    logger.info(f"✓ {company_info['company_name']}")
                    logger.info(f"  Confidence: {validation['confidence']} (score: {validation['score']})")
                    logger.info(f"  Reasons: {', '.join(validation['reasons'])}")
                else:
                    logger.info(f"✗ Not relevant (score: 0)")

            # Rate limiting
            time.sleep(self.delay)

        # Sort by score
        publishers.sort(key=lambda x: x['validation']['score'], reverse=True)

        self.results = publishers
        return publishers

    def export_results(self, filename: str = 'linkedin_snapchat_publishers.json'):
        """Export results to JSON file"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        logger.info(f"\n💾 Results exported to: {filename}")

    def print_summary(self):
        """Print summary of findings"""
        print("\n" + "="*80)
        print("LINKEDIN SNAPCHAT PUBLISHER CRAWLER - SUMMARY")
        print("="*80)

        high_conf = [p for p in self.results if p['validation']['confidence'] == 'HIGH']
        medium_conf = [p for p in self.results if p['validation']['confidence'] == 'MEDIUM']
        low_conf = [p for p in self.results if p['validation']['confidence'] == 'LOW']

        print(f"\n📊 RESULTS:")
        print(f"  Total found: {len(self.results)}")
        print(f"  HIGH confidence: {len(high_conf)}")
        print(f"  MEDIUM confidence: {len(medium_conf)}")
        print(f"  LOW confidence: {len(low_conf)}")

        if high_conf:
            print(f"\n🎯 HIGH CONFIDENCE PUBLISHERS:")
            for pub in high_conf[:10]:  # Top 10
                print(f"\n  • {pub['company_name']}")
                print(f"    URL: {pub['url']}")
                print(f"    Score: {pub['validation']['score']}")
                print(f"    Type: {pub['url_type']}")
                print(f"    Reasons: {', '.join(pub['validation']['reasons'][:2])}")

        if medium_conf:
            print(f"\n⚠️  MEDIUM CONFIDENCE (Top 5):")
            for pub in medium_conf[:5]:
                print(f"  • {pub['company_name']} (score: {pub['validation']['score']})")

        print("\n" + "="*80)


def main():
    """Main execution"""
    print("="*80)
    print("🔍 LINKEDIN SNAPCHAT PUBLISHER CRAWLER")
    print("="*80)
    print("\nThis crawler finds companies that run Snapchat shows by:")
    print("  1. Searching LinkedIn via Google")
    print("  2. Extracting company information")
    print("  3. Validating if they're media brands")
    print("  4. Checking for Snapchat show mentions")
    print()

    # Search queries
    search_queries = [
        # Direct Snapchat queries
        '"Snapchat show" producer',
        '"Snapchat discover" publisher',
        '"Snap publisher" content',
        'Snapchat content partner',

        # Media + Snapchat
        'media company Snapchat shows',
        'digital media Snapchat publisher',
        'entertainment company Snapchat',

        # Specific roles
        'Snapchat producer media',
        'Snapchat content creator company',
        'Snapchat show creator',

        # Publisher terms
        '"publisher" "Snapchat discover"',
        '"content studio" "Snapchat"',
        '"media brand" "Snapchat shows"',
    ]

    # Initialize crawler
    crawler = LinkedInSnapchatCrawler(delay=2.0)

    # Run crawl
    publishers = crawler.crawl(search_queries, max_results_per_query=15)

    # Export results
    crawler.export_results('linkedin_snapchat_publishers.json')

    # Print summary
    crawler.print_summary()

    print(f"\n✅ Crawl complete!")
    print(f"📄 Full results: linkedin_snapchat_publishers.json")


if __name__ == "__main__":
    main()
