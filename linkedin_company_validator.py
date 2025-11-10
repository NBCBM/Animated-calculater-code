#!/usr/bin/env python3
"""
LinkedIn Company Validator
Validates if a company is a media brand running Snapchat shows
"""

import requests
from bs4 import BeautifulSoup
import json
import re
from typing import Dict, List, Optional
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CompanyValidator:
    """Validate companies as media brands/Snapchat publishers"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        })

        # Media brand indicators
        self.media_indicators = {
            'keywords': [
                'media', 'entertainment', 'content', 'production', 'publisher',
                'broadcast', 'network', 'studio', 'digital media', 'streaming',
                'video production', 'content creation', 'social media',
                'influencer', 'creator', 'shows', 'series', 'episodes'
            ],
            'company_types': [
                'media production', 'entertainment', 'internet', 'online media',
                'broadcast media', 'media & telecommunications', 'publishing',
                'advertising', 'marketing', 'digital marketing'
            ]
        }

        # Snapchat indicators
        self.snapchat_indicators = [
            'snapchat', 'snap inc', 'snap discover', 'snapchat show',
            'snapchat content', 'snapchat partner', 'snapchat publisher',
            'snap show', 'snap content', 'snapchat discover'
        ]

    def validate_linkedin_company(self, company_url: str) -> Dict:
        """
        Validate a LinkedIn company page

        Args:
            company_url: LinkedIn company page URL

        Returns:
            Validation results
        """
        try:
            response = self.session.get(company_url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            text_lower = soup.get_text().lower()

            # Extract company info
            company_name = self._extract_company_name(soup)
            description = self._extract_description(soup)
            company_type = self._extract_company_type(soup)
            website = self._extract_website(soup)

            # Validation checks
            is_media = self._is_media_brand(text_lower, description, company_type)
            snapchat_score = self._calculate_snapchat_score(text_lower, description)

            # Overall score
            total_score = 0

            if is_media:
                total_score += 40

            total_score += min(snapchat_score, 60)

            return {
                'company_url': company_url,
                'company_name': company_name,
                'description': description[:300] if description else '',
                'company_type': company_type,
                'website': website,
                'is_media_brand': is_media,
                'snapchat_score': snapchat_score,
                'total_score': total_score,
                'confidence': self._get_confidence_level(total_score),
                'is_likely_publisher': total_score >= 50
            }

        except Exception as e:
            logger.error(f"Validation failed for {company_url}: {e}")
            return {
                'company_url': company_url,
                'error': str(e),
                'total_score': 0,
                'confidence': 'ERROR'
            }

    def _extract_company_name(self, soup: BeautifulSoup) -> str:
        """Extract company name"""
        # Try og:title first
        og_title = soup.find('meta', property='og:title')
        if og_title:
            return og_title.get('content', '').strip()

        # Try h1
        h1 = soup.find('h1')
        if h1:
            return h1.get_text().strip()

        return 'Unknown'

    def _extract_description(self, soup: BeautifulSoup) -> str:
        """Extract company description"""
        # Try og:description
        og_desc = soup.find('meta', property='og:description')
        if og_desc:
            return og_desc.get('content', '').strip()

        # Try meta description
        meta_desc = soup.find('meta', {'name': 'description'})
        if meta_desc:
            return meta_desc.get('content', '').strip()

        return ''

    def _extract_company_type(self, soup: BeautifulSoup) -> str:
        """Extract company type/industry"""
        text = soup.get_text().lower()

        # Look for industry mentions
        for industry in self.media_indicators['company_types']:
            if industry in text:
                return industry

        return 'Unknown'

    def _extract_website(self, soup: BeautifulSoup) -> str:
        """Extract company website"""
        # Look for website links
        for link in soup.find_all('a', href=True):
            href = link['href']
            if 'linkedin.com' not in href and href.startswith('http'):
                # Likely external website
                return href

        return ''

    def _is_media_brand(self, text: str, description: str, company_type: str) -> bool:
        """Check if company is a media brand"""
        # Check keywords in text
        keyword_count = sum(1 for keyword in self.media_indicators['keywords'] if keyword in text)

        # Check company type
        type_match = any(ct in company_type.lower() for ct in self.media_indicators['company_types'])

        # Check description
        desc_match = description and any(keyword in description.lower() for keyword in self.media_indicators['keywords'][:10])

        return keyword_count >= 3 or type_match or desc_match

    def _calculate_snapchat_score(self, text: str, description: str) -> int:
        """Calculate Snapchat relevance score"""
        score = 0

        # Count mentions in full text
        for indicator in self.snapchat_indicators:
            count = text.count(indicator)
            score += count * 5  # 5 points per mention

        # Bonus for description mentions
        if description:
            for indicator in self.snapchat_indicators:
                if indicator in description.lower():
                    score += 20

        return min(score, 100)  # Cap at 100

    def _get_confidence_level(self, score: int) -> str:
        """Get confidence level from score"""
        if score >= 70:
            return 'HIGH'
        elif score >= 50:
            return 'MEDIUM'
        elif score >= 30:
            return 'LOW'
        else:
            return 'VERY_LOW'


def main():
    """Test the validator"""
    validator = CompanyValidator()

    # Test URLs
    test_urls = [
        'https://www.linkedin.com/company/literally-media/',
        'https://www.linkedin.com/company/know-your-meme/',
    ]

    print("="*80)
    print("COMPANY VALIDATOR TEST")
    print("="*80)

    for url in test_urls:
        print(f"\nValidating: {url}")
        result = validator.validate_linkedin_company(url)

        print(f"  Company: {result.get('company_name')}")
        print(f"  Media Brand: {result.get('is_media_brand')}")
        print(f"  Snapchat Score: {result.get('snapchat_score')}")
        print(f"  Total Score: {result.get('total_score')}")
        print(f"  Confidence: {result.get('confidence')}")
        print(f"  Likely Publisher: {result.get('is_likely_publisher')}")

        time.sleep(2)


if __name__ == "__main__":
    main()
