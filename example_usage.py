#!/usr/bin/env python3
"""
Example usage of the Snapchat Crawler
Demonstrates various use cases for backend integration
"""

from snapchat_crawler import SnapchatCrawler
import json


def example_single_scrape():
    """Example: Scrape a single profile"""
    print("\n" + "="*80)
    print("EXAMPLE 1: Single Profile Scrape")
    print("="*80 + "\n")

    crawler = SnapchatCrawler(
        cache_dir="./snapchat_cache",
        rate_limit=1.0,
        max_retries=3
    )

    url = "https://www.snapchat.com/p/0a8450e9-b5f7-4080-8cb3-fe67d59430e1/3298977479825408"

    result = crawler.scrape_profile(url)
    summary = crawler.get_profile_summary(result)

    if summary['success']:
        print(f"✓ Successfully scraped!")
        print(f"\nProfile Details:")
        print(f"  Name: {summary['name']}")
        print(f"  Followers: {summary['followers']:,}")
        print(f"  Description: {summary['description']}")
        print(f"  Profile ID: {summary['profile_id']}")
    else:
        print(f"✗ Failed: {summary['error']}")


def example_batch_scrape():
    """Example: Batch scrape multiple profiles"""
    print("\n" + "="*80)
    print("EXAMPLE 2: Batch Scraping")
    print("="*80 + "\n")

    crawler = SnapchatCrawler(
        rate_limit=0.5,  # Faster rate for batch
        max_workers=5    # 5 concurrent workers
    )

    urls = [
        "https://www.snapchat.com/p/0a8450e9-b5f7-4080-8cb3-fe67d59430e1/3298977479825408",
        "https://www.snapchat.com/p/7c94b2b8-a716-425d-bc0e-6a7ad13eae8f/63115248932864"
    ]

    results = crawler.scrape_batch(urls)

    print(f"Scraped {len(results)} profiles:\n")
    for result in results:
        summary = crawler.get_profile_summary(result)
        if summary['success']:
            print(f"  ✓ {summary['name']}: {summary['followers']:,} followers")
        else:
            print(f"  ✗ Failed: {summary.get('error')}")

    # Export results
    crawler.export_to_json(results, "batch_results.json")
    print(f"\n💾 Results saved to: batch_results.json")


def example_cache_usage():
    """Example: Using cache for fast repeated access"""
    print("\n" + "="*80)
    print("EXAMPLE 3: Cache Usage")
    print("="*80 + "\n")

    crawler = SnapchatCrawler(cache_dir="./snapchat_cache")

    url = "https://www.snapchat.com/p/0a8450e9-b5f7-4080-8cb3-fe67d59430e1/3298977479825408"

    print("First request (scraping from web)...")
    import time
    start = time.time()
    result1 = crawler.scrape_profile(url, use_cache=True)
    time1 = time.time() - start

    print("Second request (from cache)...")
    start = time.time()
    result2 = crawler.scrape_profile(url, use_cache=True)
    time2 = time.time() - start

    print(f"\nPerformance comparison:")
    print(f"  First request:  {time1:.2f}s (from web)")
    print(f"  Second request: {time2:.4f}s (from cache)")
    print(f"  Speed improvement: {time1/time2:.0f}x faster!")


def example_data_extraction():
    """Example: Extract specific data fields"""
    print("\n" + "="*80)
    print("EXAMPLE 4: Data Extraction")
    print("="*80 + "\n")

    crawler = SnapchatCrawler()

    url = "https://www.snapchat.com/p/0a8450e9-b5f7-4080-8cb3-fe67d59430e1/3298977479825408"

    result = crawler.scrape_profile(url)

    if result['success']:
        data = result['data']

        print("📊 Extracted Data Fields:\n")

        # Basic info
        print(f"Show Name: {data.get('name')}")
        print(f"Description: {data.get('description')}")
        print(f"Followers: {data.get('followers'):,}")
        print(f"Profile Image: {data.get('image')}")

        # OpenGraph data
        og = data.get('opengraph', {})
        print(f"\n🌐 OpenGraph Data:")
        print(f"  OG Title: {og.get('title')}")
        print(f"  OG Image: {og.get('image')}")

        # Twitter Card data
        twitter = data.get('twitter', {})
        print(f"\n🐦 Twitter Card Data:")
        print(f"  Card Type: {twitter.get('card')}")
        print(f"  Site: {twitter.get('site')}")

        # Structured data (Schema.org)
        structured = data.get('structured_data', {})
        print(f"\n📋 Schema.org Data:")
        print(f"  Type: {structured.get('@type')}")
        if 'mainEntity' in structured:
            entity = structured['mainEntity']
            print(f"  Entity Type: {entity.get('@type')}")


def example_error_handling():
    """Example: Proper error handling"""
    print("\n" + "="*80)
    print("EXAMPLE 5: Error Handling")
    print("="*80 + "\n")

    crawler = SnapchatCrawler(max_retries=2, timeout=5)

    # Try scraping an invalid URL
    invalid_url = "https://www.snapchat.com/p/invalid-id/123"

    result = crawler.scrape_profile(invalid_url)

    if not result['success']:
        print(f"✗ Scrape failed as expected")
        print(f"  Error: {result.get('error')}")
        print(f"  Error Type: {result.get('error_type')}")
        print(f"\n✓ Error was properly handled and logged")
    else:
        print(f"✓ Unexpectedly succeeded")


def example_custom_config():
    """Example: Custom crawler configuration"""
    print("\n" + "="*80)
    print("EXAMPLE 6: Custom Configuration")
    print("="*80 + "\n")

    # Create crawler with custom settings
    crawler = SnapchatCrawler(
        cache_dir="./custom_cache",
        rate_limit=0.5,        # 2 requests per second
        max_retries=5,         # More aggressive retries
        timeout=15,            # Longer timeout
        max_workers=10         # More concurrent workers
    )

    print("✓ Crawler configured with custom settings:")
    print(f"  Cache Directory: ./custom_cache")
    print(f"  Rate Limit: 0.5s (2 req/sec)")
    print(f"  Max Retries: 5")
    print(f"  Timeout: 15s")
    print(f"  Max Workers: 10")

    # Use custom headers
    crawler.session.headers['Accept-Language'] = 'en-GB,en;q=0.9'

    print(f"\n✓ Custom headers applied")


def example_export_formats():
    """Example: Different export formats"""
    print("\n" + "="*80)
    print("EXAMPLE 7: Export Formats")
    print("="*80 + "\n")

    crawler = SnapchatCrawler()

    url = "https://www.snapchat.com/p/0a8450e9-b5f7-4080-8cb3-fe67d59430e1/3298977479825408"

    result = crawler.scrape_profile(url)
    summary = crawler.get_profile_summary(result)

    # Export full data
    crawler.export_to_json(result, "full_data.json")
    print("✓ Exported full data to: full_data.json")

    # Export summary only
    crawler.export_to_json(summary, "summary_data.json")
    print("✓ Exported summary to: summary_data.json")

    # Custom format - CSV-like
    csv_data = f"{summary['name']},{summary['followers']},{summary['profile_id']}\n"
    with open("export.csv", "w") as f:
        f.write("Name,Followers,ProfileID\n")
        f.write(csv_data)
    print("✓ Exported CSV to: export.csv")


def main():
    """Run all examples"""
    print("\n" + "="*80)
    print("🚀 SNAPCHAT CRAWLER - USAGE EXAMPLES")
    print("="*80)

    examples = [
        ("Single Scrape", example_single_scrape),
        ("Batch Scrape", example_batch_scrape),
        ("Cache Usage", example_cache_usage),
        ("Data Extraction", example_data_extraction),
        ("Error Handling", example_error_handling),
        ("Custom Config", example_custom_config),
        ("Export Formats", example_export_formats)
    ]

    print("\nAvailable examples:")
    for i, (name, _) in enumerate(examples, 1):
        print(f"  {i}. {name}")

    print("\nRunning all examples...\n")

    for name, example_func in examples:
        try:
            example_func()
            print(f"\n✓ {name} completed\n")
        except Exception as e:
            print(f"\n✗ {name} failed: {e}\n")

    print("="*80)
    print("✓ All examples completed!")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
