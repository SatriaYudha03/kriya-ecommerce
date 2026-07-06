#!/usr/bin/env python3
"""Deterministic product generator for KRIYA seed data.

Usage:
    python data/scripts/generate_products.py

Output:
    data/seed/products.json  (kontrak KRIYA-MASTER.md Bagian 6)

Rules documented in data/prompts/product_generator.md.
"""

import json
import os
import random
from pathlib import Path

SEED = 42
random.seed(SEED)

ROOT = Path(__file__).resolve().parent.parent.parent
OUTPUT = ROOT / "data" / "seed" / "products.json"

CATEGORIES = [
    {"slug": "living-room", "name": "Living room"},
    {"slug": "bedroom", "name": "Bedroom"},
    {"slug": "workspace", "name": "Workspace"},
    {"slug": "dining-room", "name": "Dining room"},
    {"slug": "storage", "name": "Storage"},
    {"slug": "lighting", "name": "Lighting"},
]

PRICE_RANGES = {
    "living-room": (800_000, 8_500_000),
    "bedroom": (1_200_000, 12_000_000),
    "workspace": (750_000, 5_000_000),
    "dining-room": (900_000, 7_000_000),
    "storage": (350_000, 3_500_000),
    "lighting": (250_000, 2_500_000),
}

COLORS = ["natural", "white", "black", "walnut", "oak", "grey", "cream"]
COLOR_CODES = {
    "natural": "NAT",
    "white": "WHT",
    "black": "BLK",
    "walnut": "WNT",
    "oak": "OAK",
    "grey": "GRY",
    "cream": "CRM",
}
PREMIUM_COLORS = {"walnut", "black"}

MATERIALS = [
    "teak wood", "pine wood", "mahogany", "rattan", "steel", "aluminum",
    "tempered glass", "polyester fabric", "synthetic leather", "bamboo",
    "laminated MDF", "synthetic marble",
]

PRODUCT_DEFS = {
    "living-room": [
        ("TAMU", "sofa", "SFA", ["polyester fabric", "pine wood"], (180, 85, 80), 35.0,
         "A comfortable three-seater sofa with solid pine wood frame and soft polyester upholstery. Minimalist Scandinavian design that blends with any living room style.", 2_800_000),
        ("RUMA", "coffee table", "CT", ["teak wood", "steel"], (100, 55, 45), 12.5,
         "Elegant coffee table combining teak wood top with slender steel legs. Perfect centerpiece for a modern living room.", 1_500_000),
        ("SARI", "TV console", "TV", ["laminated MDF", "steel"], (150, 40, 50), 22.0,
         "Spacious TV console with cable management and two open shelves. Clean lines in laminated MDF with powder-coated steel frame.", 2_200_000),
        ("BUMI", "armchair", "AC", ["polyester fabric", "pine wood"], (75, 80, 85), 18.0,
         "Cozy single armchair with deep cushioning and wide armrests. Pine wood legs add a warm, natural touch to your living space.", 1_800_000),
        ("NALA", "side table", "ST", ["bamboo", "steel"], (45, 45, 55), 5.5,
         "Compact bamboo side table with a steel base. Ideal for placing next to a sofa or reading chair.", 800_000),
        ("WIRA", "bookshelf", "BS", ["pine wood"], (80, 30, 180), 25.0,
         "Tall open bookshelf with five tiers crafted from solid pine wood. A versatile piece for books, plants, and decor.", 2_400_000),
        ("KALA", "floor rug", "FR", ["polyester fabric"], (200, 140, 1), 3.2,
         "Soft woven polyester floor rug with a subtle geometric pattern. Adds warmth and texture to any living room floor.", 950_000),
        ("DARA", "accent cabinet", "AB", ["mahogany", "tempered glass"], (90, 40, 85), 28.0,
         "Handsome accent cabinet with mahogany body and tempered glass doors. Display your favorite pieces behind elegant glass panels.", 3_500_000),
        ("PURA", "wall shelf set", "WS", ["pine wood", "steel"], (120, 22, 15), 4.8,
         "Set of three floating wall shelves in pine wood with steel brackets. Easy to install and arrange in any configuration.", 1_100_000),
        ("MEGA", "lounge chair", "LC", ["synthetic leather", "steel"], (70, 78, 95), 20.0,
         "Premium lounge chair upholstered in synthetic leather with a chrome steel base. Statement piece for sophisticated living rooms.", 4_200_000),
    ],
    "bedroom": [
        ("NIRA", "bed frame", "BF", ["pine wood"], (160, 200, 90), 38.0,
         "Sturdy queen-size bed frame made from solid pine wood with slatted base. Scandinavian-inspired headboard for a clean bedroom look.", 4_500_000),
        ("GALA", "wardrobe", "WR", ["laminated MDF"], (120, 55, 200), 55.0,
         "Full-height two-door wardrobe with interior shelves and a hanging rail. Laminated MDF ensures durability and easy maintenance.", 5_800_000),
        ("SENA", "nightstand", "NS", ["teak wood"], (45, 40, 50), 8.5,
         "Compact teak wood nightstand with one drawer and open shelf. Warm tones complement any bedroom palette.", 1_400_000),
        ("LOKA", "dresser", "DR", ["mahogany"], (100, 45, 80), 30.0,
         "Six-drawer dresser in rich mahogany with brass-finished handles. Generous storage for a tidy, organized bedroom.", 4_800_000),
        ("AWAN", "vanity desk", "VD", ["pine wood", "tempered glass"], (90, 45, 75), 16.0,
         "Elegant vanity desk with a tempered glass top and pine wood frame. Includes a small drawer for accessories.", 2_600_000),
        ("TARA", "bedside lamp table", "BL", ["bamboo"], (35, 35, 60), 4.0,
         "Slim bamboo lamp table designed to fit beside any bed. Lightweight yet stable with a natural woven texture.", 1_200_000),
        ("RASI", "clothing rack", "CR", ["steel", "pine wood"], (100, 45, 150), 9.0,
         "Open clothing rack with a steel frame and pine wood shelf at the base. Perfect for displaying your favorite outfits.", 1_800_000),
        ("BAYU", "mattress topper", "MT", ["polyester fabric"], (160, 200, 5), 4.5,
         "Plush polyester mattress topper that adds an extra layer of comfort. Fits standard queen-size beds.", 1_500_000),
        ("CALA", "storage bench", "SB", ["pine wood", "polyester fabric"], (110, 40, 48), 14.0,
         "Upholstered storage bench with a lift-up seat and pine wood legs. Sits at the foot of your bed for extra blanket storage.", 2_200_000),
        ("DIAN", "full-length mirror", "FM", ["pine wood", "tempered glass"], (50, 5, 160), 12.0,
         "Full-length standing mirror with a solid pine wood frame. Lean it against the wall for a modern, relaxed aesthetic.", 1_900_000),
    ],
    "workspace": [
        ("TARU", "work desk", "WD", ["pine wood", "steel"], (120, 60, 75), 18.5,
         "Spacious work desk with a pine wood top and sturdy steel legs. Built-in cable tray keeps your workspace clutter-free.", 1_800_000),
        ("RAKA", "wall shelf", "WS", ["pine wood", "steel"], (80, 25, 30), 4.2,
         "Floating wall shelf with steel brackets and pine wood board. Mount above your desk for books and supplies.", 750_000),
        ("JATI", "office chair", "OC", ["polyester fabric", "steel"], (60, 60, 105), 14.0,
         "Ergonomic office chair with breathable polyester mesh back and adjustable height. Steel base with smooth-rolling casters.", 2_500_000),
        ("KASA", "filing cabinet", "FC", ["steel"], (40, 50, 65), 16.0,
         "Three-drawer steel filing cabinet with lock mechanism. Compact footprint fits under most desks.", 1_200_000),
        ("SULA", "monitor stand", "MS", ["bamboo"], (55, 25, 12), 2.0,
         "Bamboo monitor riser with storage space underneath for keyboard and stationery. Promotes ergonomic screen height.", 850_000),
        ("MERU", "standing desk", "SD", ["laminated MDF", "steel"], (140, 70, 120), 28.0,
         "Height-adjustable standing desk with a crank mechanism. Laminated MDF top on a robust steel frame for daily use.", 3_800_000),
        ("PENA", "desk organizer", "DO", ["bamboo"], (30, 20, 15), 1.2,
         "Multi-compartment bamboo desk organizer for pens, notes, and gadgets. Natural finish adds warmth to your workspace.", 450_000),
        ("GUNA", "task lamp", "TL", ["aluminum", "steel"], (18, 18, 50), 1.8,
         "Adjustable aluminum task lamp with a flexible neck and weighted steel base. Provides focused lighting for late-night work.", 650_000),
        ("LIPI", "pegboard panel", "PB", ["laminated MDF", "steel"], (60, 2, 90), 3.5,
         "Modular pegboard panel with included hooks and shelves. Mount on any wall to customize your workspace storage.", 980_000),
        ("SABA", "printer stand", "PS", ["pine wood", "steel"], (55, 45, 35), 7.0,
         "Compact printer stand with a lower shelf for paper supplies. Pine wood top and steel legs with leveling feet.", 1_100_000),
    ],
    "dining-room": [
        ("MEJA", "dining table", "DT", ["teak wood"], (150, 85, 75), 32.0,
         "Solid teak wood dining table seating up to six. Tapered legs and a smooth, oil-finished top for everyday meals.", 4_500_000),
        ("RUJI", "dining chair", "DC", ["pine wood", "polyester fabric"], (45, 52, 85), 6.5,
         "Pine wood dining chair with a padded polyester seat cushion. Stackable design saves space when not in use.", 1_200_000),
        ("PADI", "bench seat", "BE", ["teak wood"], (120, 35, 45), 12.0,
         "Teak wood dining bench that pairs with the MEJA table. Comfortably seats two to three people.", 1_800_000),
        ("NUSA", "buffet sideboard", "BU", ["mahogany", "steel"], (160, 45, 80), 38.0,
         "Generous mahogany sideboard with sliding doors and interior shelving. Steel legs lift it off the floor for a light profile.", 5_200_000),
        ("LARA", "bar cart", "BC", ["steel", "tempered glass"], (75, 40, 80), 10.0,
         "Two-tier bar cart with tempered glass shelves and a steel frame. Rolls smoothly on locking casters.", 2_100_000),
        ("KOPI", "kitchen island", "KI", ["pine wood", "steel"], (120, 60, 90), 28.0,
         "Versatile kitchen island with a butcher-block pine wood top and steel shelf below. Adds prep and storage space.", 3_800_000),
        ("TERA", "plate rack", "PR", ["bamboo"], (50, 25, 45), 3.0,
         "Open bamboo plate rack that holds up to twelve dinner plates. Air-dry or display your favorite dishware.", 900_000),
        ("GILI", "wine rack", "WR", ["pine wood"], (45, 25, 80), 5.5,
         "Vertical pine wood wine rack with twelve bottle slots. Compact design fits in a kitchen corner or dining room.", 1_400_000),
        ("HALU", "serving tray table", "TT", ["teak wood", "steel"], (60, 40, 65), 4.5,
         "Foldable tray table with a removable teak wood top. Ideal for serving guests or as an extra side table.", 1_600_000),
        ("WAJA", "stool set", "SS", ["pine wood"], (35, 35, 65), 4.0,
         "Set of two solid pine wood counter stools with footrests. Clean, rounded lines suit modern and rustic kitchens alike.", 1_500_000),
    ],
    "storage": [
        ("KOBU", "cube shelf", "CS", ["laminated MDF"], (80, 35, 80), 14.0,
         "Four-cube open shelf unit in laminated MDF. Modular design lets you stack multiple units for larger storage walls.", 850_000),
        ("LACI", "drawer unit", "DU", ["pine wood"], (40, 40, 65), 10.0,
         "Three-drawer pine wood storage unit on casters. Fits under desks or beside beds for flexible extra storage.", 1_200_000),
        ("BALE", "storage box set", "SX", ["bamboo"], (38, 28, 18), 2.5,
         "Set of three nesting bamboo storage boxes with lids. Keep shelves tidy and organized with a natural look.", 550_000),
        ("KODI", "wardrobe organizer", "WO", ["polyester fabric", "steel"], (45, 30, 120), 3.8,
         "Hanging wardrobe organizer with six fabric compartments on a steel hook. Maximize vertical closet space.", 450_000),
        ("PETI", "trunk chest", "TC", ["pine wood", "steel"], (80, 45, 45), 15.0,
         "Rustic pine wood trunk with steel corner brackets and a flat top. Double as a coffee table or entryway bench.", 2_200_000),
        ("RAGA", "basket set", "BK", ["rattan"], (40, 30, 25), 2.0,
         "Set of three handwoven rattan baskets in graduating sizes. Beautiful open storage for blankets, toys, or magazines.", 780_000),
        ("SIKU", "corner shelf", "CR", ["pine wood"], (35, 35, 150), 8.0,
         "Tall corner shelf with five tiers. Turns an unused corner into display and storage space with warm pine wood.", 1_400_000),
        ("TALI", "wall hook rack", "HR", ["pine wood", "steel"], (60, 8, 15), 1.5,
         "Pine wood wall rack with five steel hooks. Mount in an entryway, bedroom, or bathroom for coats, bags, and towels.", 380_000),
        ("UBIN", "shoe rack", "SR", ["bamboo", "steel"], (70, 28, 50), 4.5,
         "Three-tier bamboo shoe rack with a steel frame. Holds up to nine pairs and keeps your entryway neat.", 650_000),
        ("WATU", "modular cabinet", "MC", ["laminated MDF", "steel"], (60, 40, 80), 18.0,
         "Stackable modular cabinet with one door and one open shelf. Combine units to build your own storage system.", 1_600_000),
    ],
    "lighting": [
        ("SURU", "pendant lamp", "PL", ["rattan", "steel"], (35, 35, 30), 2.0,
         "Handwoven rattan pendant lamp casting warm, patterned shadows. Steel suspension hardware included for easy installation.", 850_000),
        ("OBOR", "floor lamp", "FL", ["steel", "polyester fabric"], (35, 35, 160), 6.5,
         "Tall floor lamp with a fabric drum shade and slender steel pole. Soft ambient lighting for living rooms and bedrooms.", 1_200_000),
        ("GITA", "table lamp", "TL", ["synthetic marble", "polyester fabric"], (22, 22, 40), 3.0,
         "Table lamp with a synthetic marble base and fabric shade. Adds a touch of elegance to nightstands and consoles.", 750_000),
        ("LUMA", "wall sconce", "WC", ["aluminum"], (12, 15, 20), 0.8,
         "Minimalist aluminum wall sconce with upward light direction. Energy-efficient and ideal for hallways and bedrooms.", 450_000),
        ("KILA", "desk lamp", "DL", ["steel", "aluminum"], (15, 20, 45), 1.5,
         "Industrial-style desk lamp with adjustable arm and steel shade. Focused beam for reading and detail work.", 580_000),
        ("BINA", "string lights", "SL", ["steel"], (0, 0, 500), 0.5,
         "Warm white LED string lights with small steel-cased bulbs. Five-meter length for indoor and covered outdoor use.", 350_000),
        ("RANI", "chandelier", "CH", ["steel", "tempered glass"], (55, 55, 40), 8.0,
         "Modern five-arm chandelier with tempered glass shades and a matte steel frame. Statement lighting for dining areas.", 2_400_000),
        ("TEJU", "lantern", "LN", ["bamboo", "tempered glass"], (20, 20, 35), 1.8,
         "Decorative bamboo lantern with tempered glass panels. Use with a candle or LED for a cozy atmosphere.", 480_000),
        ("PIJAR", "spotlight set", "SP", ["aluminum", "steel"], (8, 8, 12), 0.6,
         "Set of three adjustable aluminum spotlights on a steel track. Direct light to artwork, shelves, or accent walls.", 980_000),
        ("LENTERA", "outdoor lamp", "OL", ["steel", "tempered glass"], (18, 18, 30), 2.2,
         "Weather-resistant steel outdoor lamp with a tempered glass enclosure. Mounts on walls or posts for patio lighting.", 1_100_000),
    ],
}

ASSEMBLY_GUIDE_SLUGS = set()


def _make_slug(word: str, func: str) -> str:
    return f"{word.lower()}-{func.replace(' ', '-')}"


def _round_price(price: int) -> int:
    return round(price / 50_000) * 50_000


def _generate_variants(word: str, func_code: str, base_price: int, cat_slug: str) -> list:
    lo, hi = PRICE_RANGES[cat_slug]
    base_price = max(lo, min(hi, base_price))

    n_variants = random.randint(2, 4)
    chosen_colors = random.sample(COLORS, n_variants)

    variants = []
    for color in chosen_colors:
        price = base_price
        if color in PREMIUM_COLORS:
            price = int(price * random.uniform(1.05, 1.15))
        price = _round_price(price)
        price = max(lo, min(hi, price))

        sku = f"{word}-{func_code}-{COLOR_CODES[color]}"
        stock = random.randint(5, 30)
        variants.append({
            "sku": sku,
            "color": color,
            "size": None,
            "price": price,
            "stock": stock,
        })
    return variants


def _generate_images(slug: str) -> list:
    n = random.randint(1, 3)
    return [
        {
            "storage_path": f"products/{slug}-{i}.jpg",
            "alt": f"{slug.replace('-', ' ').title()} - view {i}",
        }
        for i in range(1, n + 1)
    ]


def generate() -> dict:
    global ASSEMBLY_GUIDE_SLUGS

    products = []
    guide_candidates = []

    for cat in CATEGORIES:
        cat_slug = cat["slug"]
        defs = PRODUCT_DEFS[cat_slug]
        for word, func, func_code, materials, dims, weight, desc, base_price in defs:
            slug = _make_slug(word, func)
            product = {
                "slug": slug,
                "name": f"{word} {func}",
                "category_slug": cat_slug,
                "description": desc,
                "materials": materials,
                "dimensions": {
                    "width_cm": dims[0],
                    "depth_cm": dims[1],
                    "height_cm": dims[2],
                },
                "weight_kg": weight,
                "has_assembly_guide": False,
                "images": _generate_images(slug),
                "variants": _generate_variants(word, func_code, base_price, cat_slug),
            }
            products.append(product)
            if weight >= 8.0:
                guide_candidates.append(product)

    guide_candidates.sort(key=lambda p: p["weight_kg"], reverse=True)
    for p in guide_candidates[:10]:
        p["has_assembly_guide"] = True
        ASSEMBLY_GUIDE_SLUGS.add(p["slug"])

    return {"categories": CATEGORIES, "products": products}


def main():
    data = generate()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Generated {len(data['products'])} products -> {OUTPUT}")
    print(f"Assembly guides: {sorted(ASSEMBLY_GUIDE_SLUGS)}")


if __name__ == "__main__":
    main()
