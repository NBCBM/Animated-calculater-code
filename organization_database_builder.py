#!/usr/bin/env python3
"""
Organization Database Builder
Builds a database of organizations that run Snapchat shows
Combines LinkedIn crawling with Snapchat profile data
"""

import sqlite3
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


class OrganizationDatabaseBuilder:
    """Build and manage organization database"""

    def __init__(self, db_name: str = 'snapchat_organizations.db'):
        """
        Initialize database builder

        Args:
            db_name: SQLite database filename
        """
        self.db_name = db_name
        self.conn = None
        self.init_database()

    def init_database(self):
        """Initialize SQLite database with schema"""
        self.conn = sqlite3.connect(self.db_name)
        cursor = self.conn.cursor()

        # Organizations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS organizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                linkedin_url TEXT,
                website TEXT,
                description TEXT,
                company_type TEXT,
                is_media_brand BOOLEAN,
                confidence_level TEXT,
                score INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Snapchat shows table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS snapchat_shows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                show_name TEXT NOT NULL,
                profile_id TEXT UNIQUE NOT NULL,
                description TEXT,
                followers INTEGER,
                profile_url TEXT,
                organization_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations (id)
            )
        """)

        # LinkedIn mentions table (tracks all mentions found)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS linkedin_mentions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                organization_id INTEGER,
                linkedin_url TEXT,
                mention_type TEXT,
                context TEXT,
                snapchat_mention_count INTEGER,
                found_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations (id)
            )
        """)

        # Validation logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS validation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                organization_id INTEGER,
                validation_type TEXT,
                result TEXT,
                details TEXT,
                validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations (id)
            )
        """)

        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_org_name ON organizations(name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_show_profile ON snapchat_shows(profile_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_org_confidence ON organizations(confidence_level, score)")

        self.conn.commit()
        logger.info(f"✓ Database initialized: {self.db_name}")

    def add_organization(self, org_data: Dict) -> int:
        """
        Add or update organization

        Args:
            org_data: Organization data dictionary

        Returns:
            Organization ID
        """
        cursor = self.conn.cursor()

        cursor.execute("""
            INSERT OR REPLACE INTO organizations
            (name, linkedin_url, website, description, company_type,
             is_media_brand, confidence_level, score, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            org_data.get('name'),
            org_data.get('linkedin_url'),
            org_data.get('website'),
            org_data.get('description'),
            org_data.get('company_type'),
            org_data.get('is_media_brand', False),
            org_data.get('confidence_level', 'UNKNOWN'),
            org_data.get('score', 0),
            datetime.utcnow()
        ))

        self.conn.commit()

        # Get the organization ID
        cursor.execute("SELECT id FROM organizations WHERE name = ?", (org_data.get('name'),))
        org_id = cursor.fetchone()[0]

        logger.info(f"✓ Added organization: {org_data.get('name')} (ID: {org_id})")
        return org_id

    def add_snapchat_show(self, show_data: Dict, organization_id: Optional[int] = None) -> int:
        """
        Add Snapchat show

        Args:
            show_data: Show data dictionary
            organization_id: Optional organization ID to link

        Returns:
            Show ID
        """
        cursor = self.conn.cursor()

        cursor.execute("""
            INSERT OR REPLACE INTO snapchat_shows
            (show_name, profile_id, description, followers, profile_url, organization_id, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            show_data.get('name'),
            show_data.get('profile_id'),
            show_data.get('description'),
            show_data.get('followers'),
            show_data.get('url'),
            organization_id,
            datetime.utcnow()
        ))

        self.conn.commit()

        cursor.execute("SELECT id FROM snapchat_shows WHERE profile_id = ?", (show_data.get('profile_id'),))
        show_id = cursor.fetchone()[0]

        logger.info(f"✓ Added show: {show_data.get('name')} (ID: {show_id})")
        return show_id

    def link_show_to_organization(self, show_id: int, organization_id: int):
        """Link a show to an organization"""
        cursor = self.conn.cursor()

        cursor.execute("""
            UPDATE snapchat_shows
            SET organization_id = ?, updated_at = ?
            WHERE id = ?
        """, (organization_id, datetime.utcnow(), show_id))

        self.conn.commit()
        logger.info(f"✓ Linked show {show_id} to organization {organization_id}")

    def import_linkedin_results(self, results_file: str):
        """
        Import results from LinkedIn crawler

        Args:
            results_file: JSON file with LinkedIn crawler results
        """
        with open(results_file, 'r') as f:
            results = json.load(f)

        logger.info(f"Importing {len(results)} LinkedIn results...")

        for result in results:
            org_data = {
                'name': result.get('company_name', 'Unknown'),
                'linkedin_url': result.get('url'),
                'website': '',
                'description': result.get('description', ''),
                'company_type': result.get('url_type', 'unknown'),
                'is_media_brand': result.get('is_media_brand', False),
                'confidence_level': result['validation']['confidence'],
                'score': result['validation']['score']
            }

            org_id = self.add_organization(org_data)

            # Add LinkedIn mention
            cursor = self.conn.cursor()
            cursor.execute("""
                INSERT INTO linkedin_mentions
                (organization_id, linkedin_url, mention_type, context, snapchat_mention_count)
                VALUES (?, ?, ?, ?, ?)
            """, (
                org_id,
                result.get('url'),
                result.get('url_type'),
                result.get('search_snippet', ''),
                result.get('snapchat_mention_count', 0)
            ))
            self.conn.commit()

        logger.info("✓ LinkedIn results imported")

    def import_snapchat_shows(self, shows_file: str):
        """
        Import Snapchat shows from JSON

        Args:
            shows_file: JSON file with Snapchat show data
        """
        with open(shows_file, 'r') as f:
            shows = json.load(f)

        if not isinstance(shows, list):
            shows = [shows]

        logger.info(f"Importing {len(shows)} Snapchat shows...")

        for show in shows:
            if 'data' in show:
                show_data = {
                    'name': show['data'].get('name'),
                    'profile_id': show.get('profile_id'),
                    'description': show['data'].get('description'),
                    'followers': show['data'].get('followers'),
                    'url': show.get('url')
                }
            else:
                show_data = show

            self.add_snapchat_show(show_data)

        logger.info("✓ Snapchat shows imported")

    def match_shows_to_organizations(self):
        """
        Automatically match shows to organizations based on keywords
        """
        cursor = self.conn.cursor()

        # Get unlinked shows
        cursor.execute("""
            SELECT id, show_name, description
            FROM snapchat_shows
            WHERE organization_id IS NULL
        """)

        shows = cursor.fetchall()
        logger.info(f"Matching {len(shows)} unlinked shows...")

        # Get all organizations
        cursor.execute("""
            SELECT id, name, description
            FROM organizations
            WHERE is_media_brand = 1
        """)

        organizations = cursor.fetchall()

        matches = 0

        for show_id, show_name, show_desc in shows:
            show_text = f"{show_name} {show_desc}".lower()

            for org_id, org_name, org_desc in organizations:
                org_text = f"{org_name} {org_desc}".lower()

                # Simple keyword matching
                # Check if organization name appears in show description
                org_name_clean = org_name.lower().replace(' ', '')

                if org_name_clean in show_text.replace(' ', ''):
                    self.link_show_to_organization(show_id, org_id)
                    matches += 1
                    break

        logger.info(f"✓ Matched {matches} shows to organizations")

    def get_stats(self) -> Dict:
        """Get database statistics"""
        cursor = self.conn.cursor()

        stats = {}

        # Total organizations
        cursor.execute("SELECT COUNT(*) FROM organizations")
        stats['total_organizations'] = cursor.fetchone()[0]

        # Media brands
        cursor.execute("SELECT COUNT(*) FROM organizations WHERE is_media_brand = 1")
        stats['media_brands'] = cursor.fetchone()[0]

        # By confidence
        for confidence in ['HIGH', 'MEDIUM', 'LOW']:
            cursor.execute("SELECT COUNT(*) FROM organizations WHERE confidence_level = ?", (confidence,))
            stats[f'confidence_{confidence.lower()}'] = cursor.fetchone()[0]

        # Total shows
        cursor.execute("SELECT COUNT(*) FROM snapchat_shows")
        stats['total_shows'] = cursor.fetchone()[0]

        # Linked shows
        cursor.execute("SELECT COUNT(*) FROM snapchat_shows WHERE organization_id IS NOT NULL")
        stats['linked_shows'] = cursor.fetchone()[0]

        # Unlinked shows
        stats['unlinked_shows'] = stats['total_shows'] - stats['linked_shows']

        return stats

    def export_report(self, filename: str = 'organization_report.json'):
        """Export comprehensive report"""
        cursor = self.conn.cursor()

        # Get all organizations with their shows
        cursor.execute("""
            SELECT
                o.id, o.name, o.linkedin_url, o.website,
                o.description, o.company_type, o.is_media_brand,
                o.confidence_level, o.score
            FROM organizations o
            ORDER BY o.score DESC
        """)

        orgs = []
        for row in cursor.fetchall():
            org = {
                'id': row[0],
                'name': row[1],
                'linkedin_url': row[2],
                'website': row[3],
                'description': row[4],
                'company_type': row[5],
                'is_media_brand': bool(row[6]),
                'confidence_level': row[7],
                'score': row[8],
                'shows': []
            }

            # Get shows for this org
            cursor.execute("""
                SELECT show_name, profile_id, followers, profile_url
                FROM snapchat_shows
                WHERE organization_id = ?
            """, (org['id'],))

            for show_row in cursor.fetchall():
                org['shows'].append({
                    'name': show_row[0],
                    'profile_id': show_row[1],
                    'followers': show_row[2],
                    'url': show_row[3]
                })

            orgs.append(org)

        report = {
            'generated_at': datetime.utcnow().isoformat(),
            'stats': self.get_stats(),
            'organizations': orgs
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        logger.info(f"✓ Report exported to: {filename}")

    def print_summary(self):
        """Print database summary"""
        stats = self.get_stats()

        print("\n" + "="*80)
        print("ORGANIZATION DATABASE SUMMARY")
        print("="*80)

        print(f"\n📊 STATISTICS:")
        print(f"  Total Organizations: {stats['total_organizations']}")
        print(f"  Media Brands: {stats['media_brands']}")
        print(f"  HIGH Confidence: {stats['confidence_high']}")
        print(f"  MEDIUM Confidence: {stats['confidence_medium']}")
        print(f"  LOW Confidence: {stats['confidence_low']}")
        print(f"\n  Total Shows: {stats['total_shows']}")
        print(f"  Linked Shows: {stats['linked_shows']}")
        print(f"  Unlinked Shows: {stats['unlinked_shows']}")

        # Top organizations
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT o.name, o.confidence_level, o.score, COUNT(s.id) as show_count
            FROM organizations o
            LEFT JOIN snapchat_shows s ON s.organization_id = o.id
            WHERE o.is_media_brand = 1
            GROUP BY o.id
            ORDER BY o.score DESC, show_count DESC
            LIMIT 10
        """)

        print(f"\n🏆 TOP ORGANIZATIONS:")
        for row in cursor.fetchall():
            print(f"  • {row[0]}")
            print(f"    Confidence: {row[1]} (score: {row[2]})")
            print(f"    Shows: {row[3]}")

        print("\n" + "="*80)

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()


def main():
    """Example usage"""
    print("="*80)
    print("🗄️  ORGANIZATION DATABASE BUILDER")
    print("="*80)

    db = OrganizationDatabaseBuilder('snapchat_organizations.db')

    # Example: Add known organization (Literally Media)
    db.add_organization({
        'name': 'Literally Media Ltd.',
        'linkedin_url': 'https://www.linkedin.com/company/literally-media/',
        'website': 'https://literally.media',
        'description': 'Network of legacy, iconic internet brands',
        'company_type': 'Media Production',
        'is_media_brand': True,
        'confidence_level': 'HIGH',
        'score': 100
    })

    # Import Snapchat shows if available
    import os
    if os.path.exists('snapchat_crawl_batch.json'):
        logger.info("Importing Snapchat shows...")
        db.import_snapchat_shows('snapchat_crawl_batch.json')

    # Import LinkedIn results if available
    if os.path.exists('linkedin_snapchat_publishers.json'):
        logger.info("Importing LinkedIn results...")
        db.import_linkedin_results('linkedin_snapchat_publishers.json')

    # Match shows to organizations
    db.match_shows_to_organizations()

    # Print summary
    db.print_summary()

    # Export report
    db.export_report('organization_report.json')

    db.close()


if __name__ == "__main__":
    main()
