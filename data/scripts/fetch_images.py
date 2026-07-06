#!/usr/bin/env python3
"""Fetch furniture images from Pexels and upload to Supabase Storage.

Usage:
    python data/scripts/fetch_images.py

Requires env vars (reads from .env in repo root automatically):
    PEXELS_API_KEY           — from https://www.pexels.com/api/
    NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (for Storage upload)

Reads:  data/seed/products.json
Writes: updates storage_path in products.json, creates data/seed/image_credits.md
"""

import json
import os
import sys
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent.parent
PRODUCTS_FILE = ROOT / "data" / "seed" / "products.json"
CREDITS_FILE = ROOT / "data" / "seed" / "image_credits.md"
BUCKET = "products"
ENV_FILE = ROOT / ".env"

PEXELS_API = "https://api.pexels.com/v1"

PRODUCT_TYPE_QUERIES = {
    "sofa": "modern sofa living room",
    "coffee table": "wooden coffee table",
    "TV console": "tv stand console furniture",
    "armchair": "armchair furniture",
    "side table": "side table furniture",
    "bookshelf": "wooden bookshelf",
    "floor rug": "floor rug interior",
    "accent cabinet": "glass cabinet furniture",
    "wall shelf set": "floating wall shelf",
    "lounge chair": "leather lounge chair",
    "bed frame": "wooden bed frame bedroom",
    "wardrobe": "wardrobe closet furniture",
    "nightstand": "nightstand bedside table",
    "dresser": "wooden dresser drawer",
    "vanity desk": "vanity desk mirror",
    "bedside lamp table": "bedside table",
    "clothing rack": "clothing rack",
    "mattress topper": "mattress bedroom",
    "storage bench": "storage bench bedroom",
    "full-length mirror": "full length mirror",
    "work desk": "minimal work desk",
    "wall shelf": "wall shelf wood",
    "office chair": "ergonomic office chair",
    "filing cabinet": "filing cabinet office",
    "monitor stand": "monitor stand desk",
    "standing desk": "standing desk office",
    "desk organizer": "desk organizer wood",
    "task lamp": "desk task lamp",
    "pegboard panel": "pegboard wall organizer",
    "printer stand": "printer stand furniture",
    "dining table": "wooden dining table",
    "dining chair": "dining chair wood",
    "bench seat": "wooden dining bench",
    "buffet sideboard": "sideboard buffet furniture",
    "bar cart": "bar cart furniture",
    "kitchen island": "kitchen island wood",
    "plate rack": "plate rack kitchen",
    "wine rack": "wine rack wood",
    "serving tray table": "serving tray table",
    "stool set": "counter stool wood",
    "cube shelf": "cube shelf modular",
    "drawer unit": "drawer unit furniture",
    "storage box set": "storage box bamboo",
    "wardrobe organizer": "closet organizer",
    "trunk chest": "trunk chest wood",
    "basket set": "rattan basket storage",
    "corner shelf": "corner shelf wood",
    "wall hook rack": "wall hook rack",
    "shoe rack": "shoe rack furniture",
    "modular cabinet": "modular cabinet furniture",
    "pendant lamp": "pendant lamp rattan",
    "floor lamp": "floor lamp interior",
    "table lamp": "table lamp",
    "wall sconce": "wall sconce light",
    "desk lamp": "desk lamp industrial",
    "string lights": "string lights indoor",
    "chandelier": "modern chandelier",
    "lantern": "decorative lantern",
    "spotlight set": "spotlight track lighting",
    "outdoor lamp": "outdoor wall lamp",
}


def load_dotenv():
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip()
        if not os.environ.get(key):
            os.environ[key] = value


def get_pexels_key() -> str:
    key = os.environ.get("PEXELS_API_KEY", "")
    if not key:
        print("ERROR: PEXELS_API_KEY not set.")
        print("Get a free key at https://www.pexels.com/api/ (instant approval).")
        print("Add PEXELS_API_KEY=your_key to .env")
        sys.exit(1)
    return key


def get_supabase_config() -> tuple[str, str]:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env")
        sys.exit(1)
    return url, key


def search_pexels(client: httpx.Client, query: str, api_key: str, per_page: int = 3) -> list[dict]:
    resp = client.get(
        f"{PEXELS_API}/search",
        params={
            "query": query,
            "per_page": per_page,
            "orientation": "landscape",
            "size": "medium",
        },
        headers={"Authorization": api_key},
    )
    resp.raise_for_status()
    return resp.json().get("photos", [])


def download_image(client: httpx.Client, url: str) -> bytes:
    resp = client.get(url, follow_redirects=True)
    resp.raise_for_status()
    return resp.content


def ensure_bucket(client: httpx.Client, supabase_url: str, service_key: str):
    create_url = f"{supabase_url}/storage/v1/bucket"
    resp = client.post(
        create_url,
        json={"id": BUCKET, "name": BUCKET, "public": True},
        headers={
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
        },
    )
    if resp.status_code in (200, 201):
        print(f"  Bucket '{BUCKET}' created.")
    elif resp.status_code == 409 or "already exists" in resp.text.lower():
        print(f"  Bucket '{BUCKET}' already exists.")
    else:
        print(f"  Bucket check: {resp.status_code} {resp.text}")
        resp.raise_for_status()


def upload_to_storage(client: httpx.Client, supabase_url: str, service_key: str, path: str, data: bytes) -> str:
    upload_url = f"{supabase_url}/storage/v1/object/{BUCKET}/{path}"
    resp = client.post(
        upload_url,
        content=data,
        headers={
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "image/jpeg",
            "x-upsert": "true",
        },
    )
    resp.raise_for_status()
    return f"{supabase_url}/storage/v1/object/public/{BUCKET}/{path}"


def extract_product_type(name: str) -> str:
    parts = name.split(" ", 1)
    return parts[1] if len(parts) > 1 else name


def main():
    load_dotenv()
    api_key = get_pexels_key()
    supabase_url, service_key = get_supabase_config()

    with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    credits: list[dict] = []
    client = httpx.Client(timeout=30)
    uploaded = 0
    skipped = 0

    try:
        ensure_bucket(client, supabase_url, service_key)

        for product in data["products"]:
            product_type = extract_product_type(product["name"])
            query = PRODUCT_TYPE_QUERIES.get(product_type, product_type)
            images_needed = len(product["images"])

            print(f"  {product['name']} — query: \"{query}\" ({images_needed} images)")

            try:
                results = search_pexels(client, query, api_key, per_page=images_needed)
            except httpx.HTTPStatusError as e:
                print(f"    WARN: Pexels search failed: {e}")
                skipped += images_needed
                continue

            for i, img_slot in enumerate(product["images"]):
                if i >= len(results):
                    print(f"    WARN: Not enough results for image {i+1}")
                    skipped += 1
                    break

                photo = results[i]
                photo_url = photo["src"]["large"]
                storage_path = img_slot["storage_path"]

                try:
                    img_data = download_image(client, photo_url)
                except httpx.HTTPStatusError:
                    print(f"    WARN: Download failed for photo {photo['id']}")
                    skipped += 1
                    continue

                try:
                    upload_to_storage(client, supabase_url, service_key, storage_path, img_data)
                    uploaded += 1
                except httpx.HTTPStatusError as e:
                    print(f"    WARN: Upload failed {storage_path}: {e}")
                    skipped += 1
                    continue

                credits.append({
                    "product": product["name"],
                    "storage_path": storage_path,
                    "pexels_id": photo["id"],
                    "photographer": photo["photographer"],
                    "photographer_url": photo["photographer_url"],
                    "pexels_url": photo["url"],
                })

                time.sleep(0.15)

            time.sleep(0.35)
    finally:
        client.close()

    with open(PRODUCTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    lines = [
        "# Image Credits",
        "",
        "Images sourced from [Pexels](https://www.pexels.com) under the Pexels License.",
        "",
    ]
    for c in credits:
        lines.append(
            f"- **{c['product']}** (`{c['storage_path']}`): "
            f"Photo by [{c['photographer']}]({c['photographer_url']}) "
            f"on [Pexels]({c['pexels_url']})"
        )

    with open(CREDITS_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\nDone. Uploaded: {uploaded}, Skipped: {skipped}")
    print(f"Credits: {CREDITS_FILE}")


if __name__ == "__main__":
    main()
