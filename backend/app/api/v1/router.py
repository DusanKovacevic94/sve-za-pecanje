from fastapi import APIRouter

from app.api.v1 import admin, auth, brands, categories, contact, listings, messages, reports, reviews, saved_searches, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(categories.router)
api_router.include_router(brands.router)
api_router.include_router(contact.router)
api_router.include_router(listings.router)
api_router.include_router(saved_searches.router)
api_router.include_router(messages.router)
api_router.include_router(reviews.router)
api_router.include_router(reports.router)
api_router.include_router(users.router)
api_router.include_router(admin.router)
