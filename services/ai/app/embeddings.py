import os
import httpx
from typing import List
from app.config import settings

def embed_texts(texts: List[str]) -> List[List[float]]:
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not set")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key={settings.gemini_api_key}"
    
    payload = {
        "requests": [
            {
                "model": "models/text-embedding-004",
                "content": {
                    "parts": [{"text": text}]
                }
            }
            for text in texts
        ]
    }
    
    # Use httpx sync client
    with httpx.Client() as client:
        response = client.post(url, json=payload, timeout=60.0)
        
    if response.status_code != 200:
        raise RuntimeError(f"Gemini API error: {response.text}")
        
    data = response.json()
    embeddings = [item["values"] for item in data["embeddings"]]
    return embeddings

def embed_text(text: str) -> List[float]:
    return embed_texts([text])[0]
