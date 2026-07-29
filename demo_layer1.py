"""
Quick demo of Layer 1: fetch breast cancer trials and print a summary.

Run from the project root:
    python demo_layer1.py
"""

import asyncio
import json
from backend.ingestion import TrialFetcher


async def main():
    fetcher = TrialFetcher(max_pages=1, page_size=10)
    print("Fetching recruiting breast cancer trials from clinicaltrials.gov...")
    trials = await fetcher.fetch("breast cancer")

    print(f"\nFetched {len(trials)} trials.\n")
    print("=" * 70)

    for t in trials[:3]:
        print(f"NCT ID    : {t.nct_id}")
        print(f"Title     : {t.brief_title[:80]}")
        print(f"Status    : {t.overall_status}")
        print(f"Phase     : {', '.join(t.phases) or 'N/A'}")
        print(f"Age range : {t.minimum_age or '?'} – {t.maximum_age or '?'}")
        print(f"Sex       : {t.sex}")
        print(f"Sites     : {len(t.locations)} location(s)")
        if t.locations:
            loc = t.locations[0]
            print(f"  First   : {loc.city}, {loc.state}  lat={loc.lat} lon={loc.lon}")
        print(f"Eligibility snippet:\n  {(t.eligibility_criteria or '')[:200]}...")
        print("-" * 70)

    # Show raw JSON of the first trial so you can see every field
    if trials:
        print("\nRaw RawTrial dict (first result):")
        print(json.dumps(trials[0].model_dump(), indent=2))


if __name__ == "__main__":
    asyncio.run(main())
