from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.listing import Listing


class SearchService:
    def __init__(self, db: Session):
        self.db = db

    def matching_count(self, query: str | None, filters: dict) -> int:
        statement = select(func.count(Listing.id)).where(Listing.status == "active")
        if query:
            pattern = f"%{query}%"
            statement = statement.where(Listing.title.ilike(pattern) | Listing.description.ilike(pattern))
        if filters.get("category"):
            from app.models.category import Category

            statement = statement.join(Category).where(Category.slug == filters["category"])
        if filters.get("currency"):
            statement = statement.where(Listing.currency == filters["currency"])
        if filters.get("city"):
            statement = statement.where(Listing.city == filters["city"])
        if filters.get("price_min"):
            statement = statement.where(Listing.price_amount >= filters["price_min"])
        if filters.get("price_max"):
            statement = statement.where(Listing.price_amount <= filters["price_max"])
        return int(self.db.scalar(statement) or 0)

