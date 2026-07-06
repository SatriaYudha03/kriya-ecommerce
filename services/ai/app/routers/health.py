from fastapi import APIRouter

router = APIRouter()


@router.get("/healthz")
def healthz():
    """M0 healthcheck → {"data": {"status": "ok"}}."""
    return {"data": {"status": "ok"}}
