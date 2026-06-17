from typing import Any

from fastapi import HTTPException


def data_response(data: Any, meta: dict[str, Any] | None = None) -> dict[str, Any]:
    response = {"data": data}
    if meta is not None:
        response["meta"] = meta
    return response


def api_error(
    code: str,
    message: str,
    status_code: int = 400,
    details: dict[str, Any] | None = None,
) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"error": {"code": code, "message": message, "details": details or {}}},
    )

