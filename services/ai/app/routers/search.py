import json
import httpx
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
import psycopg
from app.db import get_db
from app.embeddings import embed_text, embed_texts
from app.config import settings

router = APIRouter(prefix="/ai/v1")

class SearchResponseItem(BaseModel):
    product_id: str
    slug: str
    name: str
    price_min: int
    thumbnail_url: str
    score: float

class Meta(BaseModel):
    mode: str

class SearchResponse(BaseModel):
    data: List[SearchResponseItem]
    meta: Meta

# To get product details by slug, we query the Go API since AI service shouldn't 
# read/duplicate logic from commerce tables if we can avoid it, but the instruction 
# says "fallback ILIKE ke tabel products", which implies we CAN query products table directly!
# Yes! "Tabel commerce: read boleh, write dilarang". So we will query `products` directly.

@router.get("/search", response_model=SearchResponse)
async def search(
    q: str,
    limit: int = 12,
    db: psycopg.Connection = Depends(get_db)
):
    if not q.strip():
        return {"data": [], "meta": {"mode": "keyword_fallback"}}

    emb = embed_text(q)
    
    # match_documents returns (id, content, metadata, similarity)
    cur = db.cursor()
    cur.execute(
        "SELECT metadata, similarity FROM match_documents(%s, %s, 'product')",
        (emb, limit)
    )
    results = cur.fetchall()
    
    matched_slugs = []
    for meta_dict, sim in results:
        if sim >= 0.35:
            matched_slugs.append((meta_dict["ref"], sim))
            
    mode = "semantic"
    
    if not matched_slugs:
        # Fallback keyword
        mode = "keyword_fallback"
        cur.execute(
            "SELECT slug FROM products WHERE name ILIKE %s OR description ILIKE %s LIMIT %s",
            (f"%{q}%", f"%{q}%", limit)
        )
        for (slug,) in cur.fetchall():
            matched_slugs.append((slug, 1.0))

    if not matched_slugs:
        return {"data": [], "meta": {"mode": mode}}

    # Fetch product details for slugs
    slugs_only = [slug for slug, _ in matched_slugs]
    slugs_param = tuple(slugs_only)
    
    # Assuming products have thumbnail_url via first image, and price_min via variants.
    # Actually, we need to join product_variants and product_images.
    query = """
    SELECT 
        p.id, 
        p.slug, 
        p.name, 
        (SELECT MIN(price) FROM product_variants WHERE product_id = p.id) as price_min,
        (SELECT storage_path FROM product_images WHERE product_id = p.id ORDER BY id ASC LIMIT 1) as storage_path
    FROM products p
    WHERE p.slug = ANY(%s)
    """
    cur.execute(query, (list(slugs_param),))
    prod_data = {row[1]: row for row in cur.fetchall()}
    
    # Construct storage public url (base URL without /storage/v1/object/public/ is usually configured)
    # The BE builds it like: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{storage_path}
    # Bucket is usually "products". Wait, fetch_images sets bucket="products" and storage_path="products/...".
    # We will build it exactly like BE does.
    base_url = settings.supabase_db_url.split("@")[1].split(".")[0] # approximate
    # Let's just use the known URL
    public_base = "https://nmlhpeqpahihfwzbqmzp.supabase.co/storage/v1/object/public"
    
    items = []
    for slug, sim in matched_slugs:
        if slug in prod_data:
            row = prod_data[slug]
            pid, _, pname, pmin, spath = row
            # strip "products/" if it's there
            path_clean = spath.replace("products/", "") if spath else ""
            thumb_url = f"{public_base}/products/{path_clean}"
            
            items.append({
                "product_id": str(pid),
                "slug": slug,
                "name": pname,
                "price_min": pmin or 0,
                "thumbnail_url": thumb_url,
                "score": sim
            })
            
    # Remove duplicates preserving order
    seen = set()
    final_items = []
    for item in items:
        if item["slug"] not in seen:
            seen.add(item["slug"])
            final_items.append(item)
            
    return {"data": final_items[:limit], "meta": {"mode": mode}}

class SimilarResponse(BaseModel):
    data: List[SearchResponseItem]

@router.get("/products/{id}/similar", response_model=SimilarResponse)
async def similar(
    id: str,
    limit: int = 6,
    db: psycopg.Connection = Depends(get_db)
):
    cur = db.cursor()
    # first find the slug for this ID
    cur.execute("SELECT slug FROM products WHERE id = %s", (id,))
    res = cur.fetchone()
    if not res:
        raise HTTPException(status_code=404, detail="Product not found")
    
    slug = res[0]
    
    # get embedding of this product
    cur.execute("SELECT embedding FROM documents WHERE metadata->>'type' = 'product' AND metadata->>'ref' = %s LIMIT 1", (slug,))
    res = cur.fetchone()
    if not res:
        return {"data": []}
        
    emb = res[0]
    
    # search using embedding
    cur.execute(
        "SELECT metadata, similarity FROM match_documents(%s, %s, 'product')",
        (emb, limit + 1)
    )
    
    matched_slugs = []
    for meta_dict, sim in cur.fetchall():
        if meta_dict["ref"] != slug:
            matched_slugs.append((meta_dict["ref"], sim))
            
    matched_slugs = matched_slugs[:limit]
    
    if not matched_slugs:
        return {"data": []}
        
    slugs_param = [s for s, _ in matched_slugs]
    
    query = """
    SELECT 
        p.id, 
        p.slug, 
        p.name, 
        (SELECT MIN(price) FROM product_variants WHERE product_id = p.id) as price_min,
        (SELECT storage_path FROM product_images WHERE product_id = p.id ORDER BY id ASC LIMIT 1) as storage_path
    FROM products p
    WHERE p.slug = ANY(%s)
    """
    cur.execute(query, (list(slugs_param),))
    prod_data = {row[1]: row for row in cur.fetchall()}
    
    public_base = "https://nmlhpeqpahihfwzbqmzp.supabase.co/storage/v1/object/public"
    
    items = []
    for s, sim in matched_slugs:
        if s in prod_data:
            row = prod_data[s]
            pid, _, pname, pmin, spath = row
            path_clean = spath.replace("products/", "") if spath else ""
            thumb_url = f"{public_base}/products/{path_clean}"
            
            items.append({
                "product_id": str(pid),
                "slug": s,
                "name": pname,
                "price_min": pmin or 0,
                "thumbnail_url": thumb_url,
                "score": sim
            })
            
    return {"data": items}

class EmbedRequest(BaseModel):
    texts: List[str]

@router.post("/embed")
async def embed_endpoint(
    req: EmbedRequest,
    request: Request
):
    internal_key = request.headers.get("X-Internal-Key")
    if internal_key != settings.internal_api_key:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    embeddings = embed_texts(req.texts)
    return {"data": {"embeddings": embeddings}}
