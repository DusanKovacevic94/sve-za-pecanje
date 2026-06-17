from fastapi import Depends

from app.api.v1.deps import get_current_user
from app.models.user import User


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {"admin", "super_admin"}:
        from app.core.responses import api_error

        raise api_error("ADMIN_REQUIRED", "Administratorski pristup je obavezan.", 403)
    return current_user

