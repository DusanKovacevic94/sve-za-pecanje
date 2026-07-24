from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class PopularSearchQuery(Base, TimestampMixin):
    __tablename__ = "popular_search_queries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    query_normalized: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    search_count: Mapped[int] = mapped_column(Integer, default=0)
    distinct_user_count: Mapped[int] = mapped_column(Integer, default=0)
    window_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    refreshed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class SearchQueryBlacklist(Base, TimestampMixin):
    __tablename__ = "search_query_blacklist"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    term_normalized: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    created_by_admin_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id"),
        index=True,
    )


class SearchDiscoveryState(Base):
    __tablename__ = "search_discovery_state"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    refreshed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
