from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.responses import data_response
from app.db.session import get_db
from app.models.user import User
from app.schemas.shop import ShopProfileUpdate, ShopSubscriptionCreate
from app.services.shop_service import (
    ShopService,
    serialize_shop_detail,
    serialize_shop_subscription_request,
    serialize_shop_summary,
)

router = APIRouter(prefix="/shops", tags=["shops"])


@router.get("/plans")
def shop_plans(db: Session = Depends(get_db)):
    return data_response(ShopService(db).list_plans())


@router.get("/")
def public_shops(db: Session = Depends(get_db)):
    shops = ShopService(db).list_public_shops()
    return data_response([serialize_shop_summary(shop) for shop in shops])


@router.get("/me")
def my_shop(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return data_response(ShopService(db).get_me(user))


@router.patch("/me")
def update_my_shop(
    payload: ShopProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return data_response(ShopService(db).update_profile(user, payload))


@router.get("/me/subscription-requests")
def my_shop_subscription_requests(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    requests = ShopService(db).list_my_requests(user)
    return data_response([serialize_shop_subscription_request(request) for request in requests])


@router.post("/me/subscription-requests")
def create_shop_subscription_request(
    payload: ShopSubscriptionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    request = ShopService(db).create_subscription_request(user, payload.plan)
    return data_response(serialize_shop_subscription_request(request))


@router.get("/{slug}")
def public_shop(slug: str, db: Session = Depends(get_db)):
    service = ShopService(db)
    profile = service.get_public_shop(slug)
    listings = service.shop_listings(profile)
    return data_response(serialize_shop_detail(profile, listings))
