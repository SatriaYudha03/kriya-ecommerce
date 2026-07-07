from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health
from app.routers import search

app = FastAPI(title="KRIYA AI Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# healthz tersedia di root dan di prefix kontrak /ai/v1.
app.include_router(health.router)
app.include_router(health.router, prefix="/ai/v1")
app.include_router(search.router)
