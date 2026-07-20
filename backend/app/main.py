import logging
from datetime import UTC, datetime

import redis
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.sentry import init_sentry
from app.db.session import engine

configure_logging()
init_sentry()

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

app.include_router(api_router, prefix="/api/v1")
app.mount("/uploads", StaticFiles(directory=settings.local_storage_path, check_dir=False), name="uploads")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "ERROR", "message": str(exc.detail), "details": {}}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for raw_error in exc.errors():
        error = dict(raw_error)
        if error.get("ctx"):
            error["ctx"] = {
                key: str(value) for key, value in error["ctx"].items()
            }
        errors.append(error)
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Podaci nisu ispravni.",
                "details": {"errors": errors},
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if hasattr(exc, "status_code") and hasattr(exc, "detail"):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    logger.exception(
        "unhandled exception",
        extra={"path": request.url.path, "method": request.method},
    )
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "SERVER_ERROR", "message": "Došlo je do greške.", "details": {}}},
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/live")
def health_live():
    return {"status": "ok"}


@app.get("/health/ready")
def health_ready():
    checks: dict[str, str] = {}
    status_code = 200

    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
        checks["db"] = "ok"
    except Exception:
        logger.exception("database health check failed")
        checks["db"] = "failed"
        status_code = 503

    try:
        client = redis.Redis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1)
        client.ping()
        checks["redis"] = "ok"
        heartbeat = client.get(settings.worker_heartbeat_key)
        if heartbeat is None:
            checks["worker"] = "missing"
            status_code = 503
        else:
            heartbeat_at = datetime.fromisoformat(heartbeat.decode("utf-8"))
            heartbeat_age = (datetime.now(UTC) - heartbeat_at).total_seconds()
            checks["worker"] = "ok" if heartbeat_age <= settings.worker_heartbeat_max_age_seconds else "stale"
            if heartbeat_age > settings.worker_heartbeat_max_age_seconds:
                status_code = 503
    except Exception:
        logger.exception("redis health check failed")
        checks["redis"] = "failed"
        checks.setdefault("worker", "unknown")
        status_code = 503

    return JSONResponse(
        status_code=status_code,
        content={"status": "ok" if status_code == 200 else "degraded", "checks": checks},
    )
