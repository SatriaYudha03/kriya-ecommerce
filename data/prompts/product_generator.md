# Prompt: KRIYA Product Generator

Prompt ini digunakan untuk menghasilkan data sintetis `products.json`.
Hasil akhir digenerate oleh script `data/scripts/generate_products.py` yang
menerapkan aturan-aturan di bawah secara deterministik (tanpa memanggil LLM).

## Aturan penamaan

- Pola: `{KATA_NUSANTARA} {function}` — contoh: "TARU work desk", "RAKA wall shelf".
- KATA_NUSANTARA: 1–2 suku kata, huruf kapital semua, diambil dari kosakata
  bahasa Nusantara (Jawa, Sunda, Bali, Minang, dll.) yang bermakna relevan
  dengan furnitur/alam/rumah.
- DILARANG memakai nama IKEA, brand nyata, atau merek terdaftar.
- Function name in lowercase English.

## Kategori (6, slug tetap)

| Slug | Name | Target jumlah produk |
|---|---|---|
| `living-room` | Living room | 10 |
| `bedroom` | Bedroom | 10 |
| `workspace` | Workspace | 10 |
| `dining-room` | Dining room | 10 |
| `storage` | Storage | 10 |
| `lighting` | Lighting | 10 |

Total: 60 produk.

## Aturan harga (Rupiah, integer, tanpa sen)

| Kategori | Rentang harga dasar |
|---|---|
| living-room | 800.000 – 8.500.000 |
| bedroom | 1.200.000 – 12.000.000 |
| workspace | 750.000 – 5.000.000 |
| dining-room | 900.000 – 7.000.000 |
| storage | 350.000 – 3.500.000 |
| lighting | 250.000 – 2.500.000 |

Varian warna yang lebih premium (misal walnut, black) boleh +5–15% dari harga dasar.

## Aturan varian

- Setiap produk punya 2–4 varian warna.
- Palet warna tersedia: natural, white, black, walnut, oak, grey, cream.
- Field `size`: null kecuali produk memang punya varian ukuran (misal rak S/M/L).
- SKU: `{KATA}-{KODE_FUNGSI}-{WARNA_3HURUF}` — contoh: `TARU-WD-NAT`.
- Stok per varian: 5–30 unit.

## Aturan dimensi & berat

- `width_cm`, `depth_cm`, `height_cm`: integer, realistis untuk jenis furniture.
- `weight_kg`: float 1 desimal, realistis untuk flat-pack.

## Aturan gambar

- `images`: array 1–3 objek `{"storage_path": "products/{slug}-{n}.jpg", "alt": "..."}`.
- Alt text descriptive in English.
- File gambar aktual akan diisi oleh `fetch_images.py`.

## Aturan material

- Array string, 1–3 material in English: "teak wood", "pine wood", "mahogany",
  "rattan", "steel", "aluminum", "tempered glass", "polyester fabric",
  "synthetic leather", "bamboo", "laminated MDF", "synthetic marble".

## Aturan deskripsi

- 2–3 sentences in English.
- Mention main materials, style, and room suitability.
- Do not mention price or stock.

## Aturan assembly guide

- `has_assembly_guide`: true untuk 10 produk unggulan (ditandai di script),
  false untuk sisanya.

## Format output

Mengikuti kontrak `docs/agents/KRIYA-MASTER.md` Bagian 6 — Kontrak file seed, byte-per-byte:

```json
{
  "categories": [{"slug": "living-room", "name": "Living room"}, ...],
  "products": [{
    "slug": "taru-work-desk",
    "name": "TARU work desk",
    "category_slug": "workspace",
    "description": "...",
    "materials": ["pine wood", "steel"],
    "dimensions": {"width_cm": 120, "depth_cm": 60, "height_cm": 75},
    "weight_kg": 18.5,
    "has_assembly_guide": true,
    "images": [{"storage_path": "products/taru-work-desk-1.jpg", "alt": "..."}],
    "variants": [{"sku": "TARU-WD-NAT", "color": "natural", "size": null, "price": 1250000, "stock": 12}]
  }]
}
```
