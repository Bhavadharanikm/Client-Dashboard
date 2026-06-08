from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT.parent / ".env"
OUTPUT_PATH = ROOT / "Data" / "performance-dashboard.json"

SPREADSHEET_ID = "1VnojM0GKQV7RpAvqmrU3WsEFCkA9bMqU5uOtNu4NZaY"

EXCLUDED_SHEETS = {
    "Overview",
    "[Template]",
    "Template",
    "Copy of Template",
    "Copy of Template 1",
}

MANUAL_ROI_CLIENTS = {
    "bison ridge retreat": ("bison-ridge-retreat", "Bison Ridge Retreat"),
    "three suns cabins": ("three-suns", "Three Suns"),
}

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

MONTH_MAP = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}


# ---------------------------------------------------------------------------
# Auth & setup
# ---------------------------------------------------------------------------

def load_env():
    if not ENV_PATH.exists():
        return
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)


def build_service():
    load_env()
    email = os.environ["GOOGLE_SERVICE_ACCOUNT_EMAIL"]
    private_key = os.environ["GOOGLE_PRIVATE_KEY"].replace("\\n", "\n")
    creds = service_account.Credentials.from_service_account_info(
        {
            "type": "service_account",
            "client_email": email,
            "private_key": private_key,
            "token_uri": "https://oauth2.googleapis.com/token",
        },
        scopes=SCOPES,
    )
    return build("sheets", "v4", credentials=creds)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def slugify(value: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))


def clean_text(value) -> str:
    return " ".join(str(value or "").replace("\n", " ").split())


def normalize_name(value) -> str:
    text = clean_text(value).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text).strip()
    return " ".join(text.split())


def normalize_header(value) -> str:
    text = str(value or "").strip().lower()
    text = (
        text.replace("🎉", "")
        .replace("📈", "")
        .replace("👁️", "")
        .replace("/", " ")
        .replace("%", " pct ")
        .replace("#", " num ")
        .replace("$", " ")
    )
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


def is_explicit_na(value) -> bool:
    """Return True when the sheet cell explicitly says the data is not tracked."""
    if value is None or value == "":
        return False
    return str(value).strip().upper() in {"N/A", "NA", "#N/A"}


def num_or_na(value):
    """Return 'N/A' if the cell is explicitly not-tracked, None if empty/missing,
    or a float if it is a valid number."""
    if value is None or value == "":
        return None
    if is_explicit_na(value):
        return "N/A"
    return clean_number(value)  # returns None for truly unparseable values too


def pct_or_na(value):
    """Like num_or_na but converts whole-number percents (e.g. 24 → 0.24)."""
    n = num_or_na(value)
    if n is None or n == "N/A":
        return n
    return n / 100 if abs(n) > 1 else n


def text_or_na(value):
    """For percent-text display fields (e.g. total_view_growth).
    Returns 'N/A', None, or a formatted percent string."""
    if value is None or value == "":
        return None
    if is_explicit_na(str(value).strip()):
        return "N/A"
    return percent_text(value)


def to_decimal_pct(value):
    """Sheet stores splits as whole numbers (e.g. 24 for 24%).
    The JSON expects decimals (0.24). Divide by 100 if the value is > 1."""
    n = clean_number(value)
    if n is None:
        return None
    return n / 100 if abs(n) > 1 else n


def clean_number(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text or text.upper() in {"N/A", "#DIV/0!", "#VALUE!", "#REF!"}:
        return None
    negative = text.startswith("(") and text.endswith(")")
    text = text.strip("()").replace(",", "").replace("$", "").replace("%", "")
    try:
        number = float(text)
        return -number if negative else number
    except ValueError:
        return None


def percent_text(value):
    if value is None or value == "":
        return None
    if isinstance(value, str):
        return value.strip() or None
    number = clean_number(value)
    if number is None:
        return None
    if abs(number) <= 1:
        return f"{round(number * 100)}%"
    return f"{round(number)}%"


def get_value(row_map: dict, *keys: str):
    for key in keys:
        if key in row_map:
            return row_map[key]
    return None


def parse_date(value) -> tuple[int, int] | None:
    """Parse a date cell value into (year, month) or None."""
    if not value:
        return None
    text = str(value).strip()

    # Common date formats
    for fmt in (
        "%m/%d/%Y", "%m/%d/%y",
        "%Y-%m-%d", "%Y/%m/%d",
        "%B %Y", "%b %Y",
        "%B %d, %Y", "%b %d, %Y",
        "%d/%m/%Y", "%d-%b-%Y",
    ):
        try:
            dt = datetime.strptime(text, fmt)
            return dt.year, dt.month
        except ValueError:
            continue

    # Fallback: extract year + month name from text
    year_match = re.search(r"\b(20\d{2})\b", text)
    month_match = re.search(
        r"\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
        r"jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b",
        text.lower(),
    )
    if year_match and month_match:
        year = int(year_match.group(1))
        month = MONTH_MAP.get(month_match.group(1).lower())
        if month:
            return year, month

    return None


# ---------------------------------------------------------------------------
# Row building
# ---------------------------------------------------------------------------

def build_roi_row(row_map: dict, year: int, month: int) -> dict:
    return {
        "year": year,
        "month": month,
        # num_or_na returns "N/A" | None | float — no forced-zero fallbacks
        "total_views": num_or_na(get_value(row_map, "total_views")),
        "total_view_growth": text_or_na(get_value(row_map, "total_view_growth")),
        "ig_views": num_or_na(get_value(row_map, "ig_views")),
        "fb_views": num_or_na(get_value(row_map, "fb_views")),
        "tiktok_views": num_or_na(get_value(row_map, "tiktok_views")),
        "ig_followers": num_or_na(get_value(row_map, "ig_followers")),
        "fb_followers": num_or_na(get_value(row_map, "fb_followers")),
        "tiktok_followers": num_or_na(get_value(row_map, "tiktok_followers")),
        "ttl_followers": num_or_na(get_value(row_map, "ttl_followers")),
        "follower_growth_pct": num_or_na(get_value(row_map, "follower_growth")),
        "website_traffic": num_or_na(get_value(row_map, "website_traffic")),
        "ad_spend": num_or_na(get_value(row_map, "ad_spend")),
        "cost_per_follower": num_or_na(get_value(row_map, "cost_per_follower")),
        "cost_per_lead": num_or_na(get_value(row_map, "cost_per_lead")),
        "cost_per_booking": num_or_na(get_value(row_map, "cost_per_booking")),
        "new_leads": num_or_na(get_value(row_map, "new_leads")),
        "ttl_leads": num_or_na(get_value(row_map, "ttl_leads")),
        "lead_growth_pct": num_or_na(get_value(row_map, "lead_growth")),
        "total_booking_revenue": num_or_na(get_value(row_map, "total_booking_revenue")),
        "direct_booking_revenue": num_or_na(get_value(row_map, "direct_booking_revenue")),
        "direct_booking_split_pct": pct_or_na(get_value(row_map, "direct_booking_split")),
        "ly_total_booking_revenue": num_or_na(get_value(row_map, "ly_total_booking_revenue")),
        "ly_direct_booking_revenue": num_or_na(get_value(row_map, "ly_direct_booking_revenue")),
        "ly_direct_booking_split_pct": pct_or_na(get_value(row_map, "ly_direct_booking_split")),
        "notes": str(get_value(row_map, "notes_insights") or "").strip(),
    }


# ---------------------------------------------------------------------------
# Sheet fetching
# ---------------------------------------------------------------------------

def fetch_client_row(service, sheet_name: str, target_year: int, target_month: int) -> dict | None:
    """Fetch and return the ROI row for the target month from one client tab."""
    try:
        result = service.spreadsheets().values().get(
            spreadsheetId=SPREADSHEET_ID,
            range=f"'{sheet_name}'",
            valueRenderOption="FORMATTED_VALUE",
        ).execute()
    except Exception as e:
        print(f"    ⚠️  Could not read '{sheet_name}': {e}")
        return None

    values = result.get("values", [])
    if not values:
        return None

    # Find header row (first row containing 'timeline' or 'month')
    header_row_index = None
    headers: list[str] = []
    for i, row in enumerate(values[:6]):
        normalized = [normalize_header(cell) for cell in row]
        if "timeline" in normalized or "month" in normalized:
            header_row_index = i
            headers = normalized
            break

    if header_row_index is None:
        return None

    # Scan data rows for the target month
    for raw_row in values[header_row_index + 1:]:
        if not any(cell not in (None, "") for cell in raw_row):
            continue
        # Pad short rows so index access is safe
        padded = list(raw_row) + [""] * max(0, len(headers) - len(raw_row))
        row_map = {headers[i]: padded[i] for i in range(len(headers))}

        timeline_val = get_value(row_map, "timeline", "month")
        date = parse_date(timeline_val)
        if date == (target_year, target_month):
            return build_roi_row(row_map, target_year, target_month)

    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def fetch_month(target_month_key: str):
    year, month = int(target_month_key[:4]), int(target_month_key[5:])
    print(f"\n📅 Fetching {target_month_key} data from Google Sheets...\n")

    service = build_service()

    # Get all tab names
    spreadsheet = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    sheet_names = [s["properties"]["title"] for s in spreadsheet["sheets"]]

    # Load existing performance-dashboard.json
    if OUTPUT_PATH.exists():
        existing = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    else:
        existing = {"clients": [], "rowsByClientSlug": {}, "metaRowsByClientSlug": {}}

    client_map = {c["slug"]: c for c in existing.get("clients", [])}
    rows_by_slug = existing.get("rowsByClientSlug", {})

    updated = 0
    skipped = 0

    for sheet_name in sheet_names:
        if sheet_name in EXCLUDED_SHEETS:
            continue

        normalized = normalize_name(sheet_name)
        if normalized in MANUAL_ROI_CLIENTS:
            slug, name = MANUAL_ROI_CLIENTS[normalized]
        else:
            slug, name = slugify(sheet_name), sheet_name

        row = fetch_client_row(service, sheet_name, year, month)
        if row is None:
            print(f"  —  {name} (no data for {target_month_key})")
            skipped += 1
            continue

        # Register client
        client_map[slug] = {"slug": slug, "name": name}

        # Replace the month's row if it already exists, otherwise append
        existing_rows = rows_by_slug.get(slug, [])
        existing_rows = [r for r in existing_rows if not (r["year"] == year and r["month"] == month)]
        existing_rows.append(row)
        existing_rows.sort(key=lambda r: (r["year"], r["month"]))
        rows_by_slug[slug] = existing_rows

        print(f"  ✅  {name}")
        updated += 1

    # Write updated JSON
    existing["clients"] = sorted(client_map.values(), key=lambda c: c["name"].lower())
    existing["rowsByClientSlug"] = rows_by_slug
    OUTPUT_PATH.write_text(json.dumps(existing, indent=2), encoding="utf-8")

    print(f"\nDone — {updated} clients updated, {skipped} skipped.")
    print(f"Saved → {OUTPUT_PATH}\n")

    # Regenerate ROI analysis
    print("📊 Regenerating roi-analysis.json...")
    roi_script = Path(__file__).parent / "generate_roi_analysis.py"
    subprocess.run([sys.executable, str(roi_script)], check=True)
    print("✅ roi-analysis.json updated.\n")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python fetch_sheet_data.py 2026-05")
        sys.exit(1)

    month_arg = sys.argv[1].strip()
    if not re.match(r"^\d{4}-\d{2}$", month_arg):
        print("Error: month must be YYYY-MM format, e.g. 2026-05")
        sys.exit(1)

    fetch_month(month_arg)
