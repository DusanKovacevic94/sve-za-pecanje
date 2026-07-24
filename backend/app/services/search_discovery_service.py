from __future__ import annotations

from datetime import UTC, datetime, timedelta
from difflib import SequenceMatcher
from typing import Literal, TypedDict

from sqlalchemy import delete, func, literal, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.analytics import AnalyticsEvent
from app.models.brand import Brand
from app.models.category import Category
from app.models.listing import PUBLIC_LISTING_STATUSES, Listing
from app.models.search_discovery import (
    PopularSearchQuery,
    SearchDiscoveryState,
    SearchQueryBlacklist,
)
from app.models.user import User
from app.services.search_utils import normalize_search_text

POPULAR_QUERY_WINDOW_DAYS = 30
POPULAR_QUERY_MIN_USERS = 5
POPULAR_QUERY_LIMIT = 20
SUGGESTION_LIMIT = 10
CURATED_SEARCHES = (
    "Shimano",
    "Daiwa",
    "feeder štap",
    "varalice",
    "mašinica 4000",
    "najlon 0.25",
)

SuggestionType = Literal["category", "brand", "common_query", "listing"]


class SearchSuggestion(TypedDict):
    id: str
    type: SuggestionType
    display: str
    value: str
    href: str
    description: str | None
    source: str


def normalize_query(value: str) -> str:
    return " ".join(normalize_search_text(value).split())[:160]


def _is_blacklisted(query: str, terms: set[str]) -> bool:
    normalized = normalize_query(query)
    return any(term and term in normalized for term in terms)


def refresh_popular_search_queries(db: Session) -> int:
    now = datetime.now(UTC)
    cutoff = now - timedelta(days=POPULAR_QUERY_WINDOW_DAYS)
    query_value = AnalyticsEvent.properties["query_normalized"].as_string()
    actor = func.coalesce(
        literal("user:") + AnalyticsEvent.user_id,
        literal("anonymous:") + AnalyticsEvent.anonymous_id,
    )
    rows = db.execute(
        select(
            query_value.label("query"),
            func.count(AnalyticsEvent.id).label("search_count"),
            func.count(func.distinct(actor)).label("distinct_users"),
        )
        .where(
            AnalyticsEvent.event_name == "search_performed",
            AnalyticsEvent.created_at >= cutoff,
            query_value.is_not(None),
            actor.is_not(None),
        )
        .group_by(query_value)
        .having(func.count(func.distinct(actor)) >= POPULAR_QUERY_MIN_USERS)
        .order_by(
            func.count(func.distinct(actor)).desc(),
            func.count(AnalyticsEvent.id).desc(),
        )
        .limit(POPULAR_QUERY_LIMIT * 4)
    ).all()
    blacklisted = set(db.scalars(select(SearchQueryBlacklist.term_normalized)).all())
    db.execute(delete(PopularSearchQuery))
    exposed = 0
    for query, search_count, distinct_users in rows:
        normalized = normalize_query(str(query or ""))
        if not normalized or _is_blacklisted(normalized, blacklisted):
            continue
        db.add(
            PopularSearchQuery(
                query_normalized=normalized,
                search_count=int(search_count),
                distinct_user_count=int(distinct_users),
                window_started_at=cutoff,
                refreshed_at=now,
            )
        )
        exposed += 1
        if exposed >= POPULAR_QUERY_LIMIT:
            break
    state = db.get(SearchDiscoveryState, "popular_queries")
    if state:
        state.refreshed_at = now
    else:
        db.add(
            SearchDiscoveryState(id="popular_queries", refreshed_at=now)
        )
    db.commit()
    return exposed


class SearchDiscoveryService:
    def __init__(self, db: Session):
        self.db = db
        self.dialect = db.bind.dialect.name if db.bind is not None else "sqlite"

    def popular_searches(self, limit: int = 6) -> list[SearchSuggestion]:
        limit = min(max(limit, 1), 12)
        blacklisted = set(
            self.db.scalars(select(SearchQueryBlacklist.term_normalized)).all()
        )
        dynamic = list(
            self.db.scalars(
                select(PopularSearchQuery)
                .order_by(
                    PopularSearchQuery.distinct_user_count.desc(),
                    PopularSearchQuery.search_count.desc(),
                    PopularSearchQuery.query_normalized.asc(),
                )
                .limit(limit)
            ).all()
        )
        items = [
            self._suggestion(
                "common_query",
                item.query_normalized,
                item.query_normalized,
                f"/oglasi?q={self._quote(item.query_normalized)}",
                f"Popularna pretraga · {item.distinct_user_count} korisnika",
                "dynamic",
                item.id,
            )
            for item in dynamic
            if not _is_blacklisted(item.query_normalized, blacklisted)
        ]
        seen = {normalize_query(item["value"]) for item in items}
        for term in CURATED_SEARCHES:
            normalized = normalize_query(term)
            if (
                len(items) >= limit
                or normalized in seen
                or _is_blacklisted(normalized, blacklisted)
            ):
                continue
            items.append(
                self._suggestion(
                    "common_query",
                    term,
                    term,
                    f"/oglasi?q={self._quote(term)}",
                    "Predložena pretraga",
                    "curated",
                    normalized,
                )
            )
            seen.add(normalized)
        return items

    def suggestions(self, query: str, limit: int = SUGGESTION_LIMIT) -> list[SearchSuggestion]:
        query = " ".join(query.split())[:80]
        normalized = normalize_query(query)
        if len(normalized) < 2:
            return []
        limit = min(max(limit, 1), 12)
        candidates: list[tuple[float, int, SearchSuggestion]] = []
        for category in self._categories(query, limit=4):
            score = self._score(normalized, category.name_sr)
            candidates.append(
                (
                    score,
                    0,
                    self._suggestion(
                        "category",
                        category.name_sr,
                        category.name_sr,
                        f"/oglasi?category={self._quote(category.slug)}",
                        "Kategorija",
                        "catalog",
                        category.id,
                    ),
                )
            )
        for brand in self._brands(query, limit=4):
            score = self._score(normalized, brand.name)
            candidates.append(
                (
                    score,
                    1,
                    self._suggestion(
                        "brand",
                        brand.name,
                        brand.name,
                        f"/oglasi?q={self._quote(brand.name)}",
                        "Brend",
                        "catalog",
                        brand.id,
                    ),
                )
            )
        for item in self._popular_matches(query, limit=4):
            score = self._score(normalized, item.query_normalized)
            candidates.append(
                (
                    score,
                    2,
                    self._suggestion(
                        "common_query",
                        item.query_normalized,
                        item.query_normalized,
                        f"/oglasi?q={self._quote(item.query_normalized)}",
                        "Popularna pretraga",
                        "dynamic",
                        item.id,
                    ),
                )
            )
        for listing in self._listings(query, limit=4):
            score = self._score(normalized, listing.title)
            candidates.append(
                (
                    score,
                    3,
                    self._suggestion(
                        "listing",
                        listing.title,
                        listing.title,
                        f"/oglasi/{self._quote(listing.slug)}",
                        f"Oglas · {listing.city}",
                        "listing",
                        listing.id,
                    ),
                )
            )
        candidates.sort(key=lambda item: (-item[0], item[1], item[2]["display"]))
        result: list[SearchSuggestion] = []
        seen: set[tuple[str, str]] = set()
        for _score, _type_rank, suggestion in candidates:
            key = (suggestion["type"], normalize_query(suggestion["value"]))
            if key in seen:
                continue
            seen.add(key)
            result.append(suggestion)
            if len(result) >= limit:
                break
        return result

    def spelling_suggestions(self, query: str, limit: int = 3) -> list[SearchSuggestion]:
        normalized = normalize_query(query)
        if len(normalized) < 3:
            return []
        suggestions = self.suggestions(query, limit=12)
        close = [
            suggestion
            for suggestion in suggestions
            if normalize_query(suggestion["value"]) != normalized
            and self._score(normalized, suggestion["value"]) >= 0.52
        ]
        return close[: min(max(limit, 1), 3)]

    def related_categories(self, slugs: list[str], limit: int = 6) -> list[dict]:
        if not slugs:
            return []
        selected = list(
            self.db.scalars(select(Category).where(Category.slug.in_(slugs))).all()
        )
        if not selected:
            return []
        ids = {item.id for item in selected}
        parent_ids = {item.parent_id for item in selected if item.parent_id}
        candidates: list[Category] = []
        if parent_ids:
            candidates.extend(
                self.db.scalars(
                    select(Category).where(
                        Category.parent_id.in_(parent_ids),
                        Category.id.not_in(ids),
                        Category.is_active.is_(True),
                    )
                ).all()
            )
            candidates.extend(
                self.db.scalars(
                    select(Category).where(
                        Category.id.in_(parent_ids),
                        Category.is_active.is_(True),
                    )
                ).all()
            )
        else:
            candidates.extend(
                self.db.scalars(
                    select(Category).where(
                        Category.parent_id.in_(ids),
                        Category.is_active.is_(True),
                    )
                ).all()
            )
            candidates.extend(
                self.db.scalars(
                    select(Category).where(
                        Category.parent_id.is_(None),
                        Category.id.not_in(ids),
                        Category.is_active.is_(True),
                    )
                ).all()
            )
        unique = {item.id: item for item in candidates}
        return [
            {
                "id": item.id,
                "slug": item.slug,
                "name_sr": item.name_sr,
                "parent_id": item.parent_id,
            }
            for item in sorted(unique.values(), key=lambda item: item.sort_order)[:limit]
        ]

    def recent_recovery_listings(
        self, category_slugs: list[str], limit: int = 3
    ) -> list[Listing]:
        statement = (
            select(Listing)
            .options(
                selectinload(Listing.seller).selectinload(User.profile),
                selectinload(Listing.category).selectinload(Category.attributes),
                selectinload(Listing.category)
                .selectinload(Category.parent)
                .selectinload(Category.attributes),
                selectinload(Listing.brand),
                selectinload(Listing.images),
            )
            .where(Listing.status.in_(PUBLIC_LISTING_STATUSES))
        )
        if category_slugs:
            categories = list(
                self.db.scalars(
                    select(Category).where(Category.slug.in_(category_slugs))
                ).all()
            )
            root_ids = {item.parent_id or item.id for item in categories}
            related_ids = list(root_ids)
            related_ids.extend(
                self.db.scalars(
                    select(Category.id).where(Category.parent_id.in_(root_ids))
                ).all()
            )
            if related_ids:
                statement = statement.where(Listing.category_id.in_(related_ids))
        return list(
            self.db.scalars(
                statement.order_by(
                    Listing.is_featured.desc(),
                    func.coalesce(Listing.bumped_at, Listing.created_at).desc(),
                ).limit(min(max(limit, 1), 6))
            ).all()
        )

    def blacklist(self, term: str, admin_id: str) -> SearchQueryBlacklist:
        normalized = normalize_query(term)
        existing = self.db.scalar(
            select(SearchQueryBlacklist).where(
                SearchQueryBlacklist.term_normalized == normalized
            )
        )
        if existing:
            return existing
        item = SearchQueryBlacklist(
            term_normalized=normalized,
            created_by_admin_id=admin_id,
        )
        self.db.add(item)
        popular = list(
            self.db.scalars(select(PopularSearchQuery)).all()
        )
        for query in popular:
            if _is_blacklisted(query.query_normalized, {normalized}):
                self.db.delete(query)
        self.db.commit()
        self.db.refresh(item)
        return item

    def remove_blacklist(self, item_id: str) -> None:
        item = self.db.get(SearchQueryBlacklist, item_id)
        if item:
            self.db.delete(item)
            self.db.commit()

    def list_blacklist(self) -> list[SearchQueryBlacklist]:
        return list(
            self.db.scalars(
                select(SearchQueryBlacklist).order_by(
                    SearchQueryBlacklist.term_normalized.asc()
                )
            ).all()
        )

    def _categories(self, query: str, limit: int) -> list[Category]:
        return list(
            self.db.scalars(
                self._match_statement(
                    select(Category).where(Category.is_active.is_(True)),
                    Category.name_sr,
                    query,
                ).limit(limit)
            ).all()
        )

    def _brands(self, query: str, limit: int) -> list[Brand]:
        return list(
            self.db.scalars(
                self._match_statement(
                    select(Brand).where(Brand.is_verified.is_(True)),
                    Brand.name,
                    query,
                ).limit(limit)
            ).all()
        )

    def _popular_matches(self, query: str, limit: int) -> list[PopularSearchQuery]:
        return list(
            self.db.scalars(
                self._match_statement(
                    select(PopularSearchQuery),
                    PopularSearchQuery.query_normalized,
                    query,
                ).limit(limit)
            ).all()
        )

    def _listings(self, query: str, limit: int) -> list[Listing]:
        return list(
            self.db.scalars(
                self._match_statement(
                    select(Listing).where(
                        Listing.status.in_(PUBLIC_LISTING_STATUSES)
                    ),
                    Listing.title,
                    query,
                )
                .order_by(Listing.is_featured.desc(), Listing.created_at.desc())
                .limit(limit)
            ).all()
        )

    def _match_statement(self, statement, column, query: str):
        if self.dialect == "postgresql":
            normalized_column = func.lower(func.immutable_unaccent(column))
            normalized_query = func.lower(func.immutable_unaccent(query))
            similarity = func.similarity(normalized_column, normalized_query)
            prefix = normalized_column.like(normalized_query + "%")
            trigram_match = normalized_column.op("%")(normalized_query)
            return statement.where(or_(prefix, trigram_match)).order_by(
                prefix.desc(), similarity.desc(), column.asc()
            )
        normalized = normalize_query(query)
        expression = func.lower(func.coalesce(column, ""))
        replacements = (("š", "s"), ("đ", "dj"), ("č", "c"), ("ć", "c"), ("ž", "z"))
        for source, target in replacements:
            expression = func.replace(expression, source, target)
        prefix = expression.like(f"{normalized}%")
        contains = expression.like(f"%{normalized}%")
        # SQLite is used for local development and tests. Fetching a bounded
        # lexical candidate set lets Python ranking provide typo recovery.
        first = normalized[:2]
        lexical = expression.like(f"%{first}%") if first else contains
        return statement.where(or_(prefix, contains, lexical)).order_by(
            prefix.desc(), contains.desc(), column.asc()
        )

    @staticmethod
    def _score(normalized_query: str, candidate: str) -> float:
        normalized_candidate = normalize_query(candidate)
        if normalized_candidate == normalized_query:
            return 2.0
        if normalized_candidate.startswith(normalized_query):
            return 1.5 + len(normalized_query) / max(len(normalized_candidate), 1)
        if normalized_query in normalized_candidate:
            return 1.0 + len(normalized_query) / max(len(normalized_candidate), 1)
        lexical_candidates = [normalized_candidate, *normalized_candidate.split()]
        return max(
            SequenceMatcher(None, normalized_query, candidate).ratio()
            for candidate in lexical_candidates
        )

    @staticmethod
    def _quote(value: str) -> str:
        from urllib.parse import quote

        return quote(value, safe="")

    @staticmethod
    def _suggestion(
        type_: SuggestionType,
        display: str,
        value: str,
        href: str,
        description: str | None,
        source: str,
        stable_id: str,
    ) -> SearchSuggestion:
        return {
            "id": f"{type_}:{stable_id}",
            "type": type_,
            "display": display,
            "value": value,
            "href": href,
            "description": description,
            "source": source,
        }
