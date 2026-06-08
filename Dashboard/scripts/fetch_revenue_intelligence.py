from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT.parent / '.env'
OUTPUT_PATH = ROOT / 'Pricing Tool Files' / 'Data' / 'revenue-intelligence.json'


def load_env() -> None:
    if not ENV_PATH.exists():
        return
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def fetch_revenue_intelligence() -> dict:
    load_env()
    url = os.environ['HGM_REVENUE_INTELLIGENCE_API_URL']
    api_key = os.environ['HGM_REVENUE_INTELLIGENCE_API_KEY']
    request = Request(
        url,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Accept': 'application/json',
        },
    )
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode('utf-8'))


if __name__ == '__main__':
    payload = fetch_revenue_intelligence()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '
')
    summary = payload.get('summary', {}) if isinstance(payload, dict) else {}
    print(json.dumps({
        'saved_to': str(OUTPUT_PATH),
        'propertyCount': summary.get('propertyCount'),
        'totalRevenue12m': summary.get('totalRevenue12m'),
        'avgAdr': summary.get('avgAdr'),
        'avgOccupancy': summary.get('avgOccupancy'),
        'monthlyTrendPoints': len(payload.get('monthlyTrend', [])) if isinstance(payload, dict) else 0,
        'propertyBreakdownCount': len(payload.get('propertyBreakdown', [])) if isinstance(payload, dict) else 0,
    }, indent=2))
