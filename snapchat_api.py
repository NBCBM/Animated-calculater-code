#!/usr/bin/env python3
"""
Snapchat Crawler REST API
Flask-based API for backend integration
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from snapchat_crawler import SnapchatCrawler
import sqlite3
from datetime import datetime
from typing import Dict, List
import json
import logging


app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Initialize crawler
crawler = SnapchatCrawler(
    cache_dir="./snapchat_cache",
    rate_limit=1.0,
    max_retries=3,
    max_workers=5
)

# Database setup
DB_NAME = "snapchat_data.db"


def init_db():
    """Initialize SQLite database"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id TEXT UNIQUE NOT NULL,
            name TEXT,
            description TEXT,
            followers INTEGER,
            image TEXT,
            url TEXT,
            raw_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scrape_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            success BOOLEAN,
            error TEXT,
            scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_profile_id ON profiles(profile_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_scraped_at ON scrape_logs(scraped_at)
    """)

    conn.commit()
    conn.close()


def save_to_db(profile_data: Dict):
    """Save profile data to database"""
    if not profile_data.get('success'):
        return False

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    data = profile_data.get('data', {})

    try:
        cursor.execute("""
            INSERT OR REPLACE INTO profiles
            (profile_id, name, description, followers, image, url, raw_data, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            profile_data.get('profile_id'),
            data.get('name'),
            data.get('description'),
            data.get('followers'),
            data.get('image'),
            profile_data.get('url'),
            json.dumps(profile_data),
            datetime.utcnow()
        ))

        # Log the scrape
        cursor.execute("""
            INSERT INTO scrape_logs (url, success, error)
            VALUES (?, ?, ?)
        """, (
            profile_data.get('url'),
            profile_data.get('success'),
            profile_data.get('error')
        ))

        conn.commit()
        return True

    except Exception as e:
        logging.error(f"Database error: {e}")
        return False
    finally:
        conn.close()


@app.route('/')
def index():
    """API information endpoint"""
    return jsonify({
        'service': 'Snapchat Crawler API',
        'version': '1.0.0',
        'endpoints': {
            '/scrape': 'POST - Scrape a single Snapchat profile',
            '/scrape/batch': 'POST - Scrape multiple profiles',
            '/profile/<profile_id>': 'GET - Retrieve stored profile data',
            '/profiles': 'GET - List all stored profiles',
            '/stats': 'GET - Get scraping statistics'
        }
    })


@app.route('/scrape', methods=['POST'])
def scrape_single():
    """
    Scrape a single Snapchat profile

    Body:
    {
        "url": "https://www.snapchat.com/p/...",
        "use_cache": true
    }
    """
    data = request.get_json()

    if not data or 'url' not in data:
        return jsonify({'error': 'URL required'}), 400

    url = data['url']
    use_cache = data.get('use_cache', True)

    try:
        result = crawler.scrape_profile(url, use_cache=use_cache)
        summary = crawler.get_profile_summary(result)

        # Save to database
        save_to_db(result)

        return jsonify({
            'success': True,
            'data': summary,
            'raw_data': result if data.get('include_raw') else None
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/scrape/batch', methods=['POST'])
def scrape_batch():
    """
    Scrape multiple Snapchat profiles

    Body:
    {
        "urls": ["url1", "url2", ...],
        "use_cache": true
    }
    """
    data = request.get_json()

    if not data or 'urls' not in data:
        return jsonify({'error': 'URLs array required'}), 400

    urls = data['urls']
    use_cache = data.get('use_cache', True)

    if not isinstance(urls, list) or len(urls) == 0:
        return jsonify({'error': 'URLs must be a non-empty array'}), 400

    try:
        results = crawler.scrape_batch(urls, use_cache=use_cache)

        # Save all to database
        for result in results:
            save_to_db(result)

        summaries = [crawler.get_profile_summary(r) for r in results]

        return jsonify({
            'success': True,
            'count': len(summaries),
            'data': summaries
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/profile/<profile_id>', methods=['GET'])
def get_profile(profile_id):
    """Retrieve stored profile data by profile_id"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT profile_id, name, description, followers, image, url, raw_data, updated_at
        FROM profiles
        WHERE profile_id = ?
    """, (profile_id,))

    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({'error': 'Profile not found'}), 404

    return jsonify({
        'success': True,
        'data': {
            'profile_id': row[0],
            'name': row[1],
            'description': row[2],
            'followers': row[3],
            'image': row[4],
            'url': row[5],
            'updated_at': row[7]
        },
        'raw_data': json.loads(row[6]) if request.args.get('include_raw') else None
    })


@app.route('/profiles', methods=['GET'])
def list_profiles():
    """List all stored profiles"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Pagination
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    offset = (page - 1) * per_page

    # Get total count
    cursor.execute("SELECT COUNT(*) FROM profiles")
    total = cursor.fetchone()[0]

    # Get paginated results
    cursor.execute("""
        SELECT profile_id, name, description, followers, image, url, updated_at
        FROM profiles
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?
    """, (per_page, offset))

    rows = cursor.fetchall()
    conn.close()

    profiles = [
        {
            'profile_id': row[0],
            'name': row[1],
            'description': row[2],
            'followers': row[3],
            'image': row[4],
            'url': row[5],
            'updated_at': row[6]
        }
        for row in rows
    ]

    return jsonify({
        'success': True,
        'data': profiles,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    })


@app.route('/search', methods=['GET'])
def search_profiles():
    """Search profiles by name or description"""
    query = request.args.get('q', '')

    if not query:
        return jsonify({'error': 'Search query required'}), 400

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT profile_id, name, description, followers, image, url, updated_at
        FROM profiles
        WHERE name LIKE ? OR description LIKE ?
        ORDER BY followers DESC
        LIMIT 50
    """, (f'%{query}%', f'%{query}%'))

    rows = cursor.fetchall()
    conn.close()

    results = [
        {
            'profile_id': row[0],
            'name': row[1],
            'description': row[2],
            'followers': row[3],
            'image': row[4],
            'url': row[5],
            'updated_at': row[6]
        }
        for row in rows
    ]

    return jsonify({
        'success': True,
        'count': len(results),
        'data': results
    })


@app.route('/stats', methods=['GET'])
def get_stats():
    """Get scraping statistics"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Total profiles
    cursor.execute("SELECT COUNT(*) FROM profiles")
    total_profiles = cursor.fetchone()[0]

    # Total scrapes
    cursor.execute("SELECT COUNT(*) FROM scrape_logs")
    total_scrapes = cursor.fetchone()[0]

    # Successful scrapes
    cursor.execute("SELECT COUNT(*) FROM scrape_logs WHERE success = 1")
    successful_scrapes = cursor.fetchone()[0]

    # Failed scrapes
    failed_scrapes = total_scrapes - successful_scrapes

    # Top profiles by followers
    cursor.execute("""
        SELECT name, followers
        FROM profiles
        ORDER BY followers DESC
        LIMIT 10
    """)
    top_profiles = [{'name': row[0], 'followers': row[1]} for row in cursor.fetchall()]

    # Recent scrapes
    cursor.execute("""
        SELECT url, success, scraped_at
        FROM scrape_logs
        ORDER BY scraped_at DESC
        LIMIT 10
    """)
    recent_scrapes = [
        {'url': row[0], 'success': bool(row[1]), 'scraped_at': row[2]}
        for row in cursor.fetchall()
    ]

    conn.close()

    return jsonify({
        'success': True,
        'stats': {
            'total_profiles': total_profiles,
            'total_scrapes': total_scrapes,
            'successful_scrapes': successful_scrapes,
            'failed_scrapes': failed_scrapes,
            'success_rate': f"{(successful_scrapes / total_scrapes * 100):.1f}%" if total_scrapes > 0 else "0%"
        },
        'top_profiles': top_profiles,
        'recent_scrapes': recent_scrapes
    })


@app.route('/cache/clear', methods=['POST'])
def clear_cache():
    """Clear crawler cache"""
    try:
        crawler.clear_cache()
        return jsonify({
            'success': True,
            'message': 'Cache cleared'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    # Initialize database
    init_db()

    # Run server
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
