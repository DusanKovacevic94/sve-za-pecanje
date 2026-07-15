from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.listing import Listing
from app.services.search_utils import apply_listing_search


class SearchService:
    def __init__(self, db: Session):
        self.db = db

    def matching_count(self, query: str | None, filters: dict) -> int:
        statement = self._matching_statement(query, filters).with_only_columns(func.count(Listing.id)).order_by(None)
        return int(self.db.scalar(statement) or 0)

    def matching_listings(
        self,
        query: str | None,
        filters: dict,
        since: datetime | None = None,
        limit: int = 20,
    ) -> list[Listing]:
        statement = self._matching_statement(query, filters)
        if since:
            statement = statement.where(Listing.created_at > since)
        order = [Listing.is_featured.desc()]
        if query and self.db.bind is not None and self.db.bind.dialect.name == "postgresql":
            _, rank = apply_listing_search(select(Listing), query, "postgresql")
            if rank is not None:
                order.append(rank.desc())
        order.append(func.coalesce(Listing.bumped_at, Listing.created_at).desc())
        return list(self.db.scalars(statement.order_by(*order).limit(limit)).all())

    def _matching_statement(self, query: str | None, filters: dict):
        statement = select(Listing).where(Listing.status == "active")
        if query:
            dialect_name = self.db.bind.dialect.name if self.db.bind is not None else "sqlite"
            statement, _rank = apply_listing_search(statement, query, dialect_name)
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
        return statement
