# Search discovery

Task 052 adds suggestions and recovery around the existing exact full-text search. Selecting
`Da li ste mislili?` is always explicit: the backend never silently changes the submitted
query.

## Suggestion contract

`GET /api/v1/search/suggestions?q=shim&limit=10` returns at most 12 typed items:

- `category` — a category landing filter
- `brand` — a search for the brand name
- `common_query` — a privacy-safe popular or curated query
- `listing` — a direct public listing result

Every item has stable `id`, `type`, `display`, `value`, `href`, `description`, and `source`
fields. PostgreSQL uses unaccented prefix and trigram matching. SQLite uses normalized
Serbian Latin variants for development and tests. The browser waits 250 ms, cancels the
previous request, and ignores any response whose sequence is no longer current.

The combobox follows the ARIA combobox/listbox pattern, supports up/down arrows, Enter and
Escape, and announces result counts and the active option. If the endpoint fails, the input
remains a normal search field and Enter submits the exact text.

## Popular-query privacy

The worker refreshes `popular_search_queries` from the previous 30 days of
`search_performed` analytics:

- the query must have at least five distinct authenticated or hashed anonymous users;
- email addresses and phone numbers are rejected before analytics storage;
- only normalized aggregate text and counts enter the public rollup;
- terms matching `search_query_blacklist` are excluded;
- administrators manage the blacklist at `/admin/pretraga`;
- curated searches fill empty slots while soft-launch traffic is below the threshold.

Suggestion analytics store only query length, suggestion type/count/position, and recovery
action. They do not store the suggestion value or new raw query text.

## Zero-result recovery

The empty browse state leaves every filter unchanged and offers explicit actions:

- spelling suggestions;
- removal of one selected filter while retaining all others;
- parent or neighboring categories;
- recent listings from the same category family;
- saving the unchanged search.

## Performance budget

The current architecture remains PostgreSQL-native. Before considering a separate search
service, the production-like target is:

- suggestion endpoint p95 below **150 ms** with 100,000 public listings;
- recovery endpoint p95 below **250 ms**;
- response size capped at 12 suggestions.

Run the benchmark against a staging snapshot:

```bash
cd backend
uv run python -m scripts.benchmark_search_discovery \
  --minimum-listings 100000 --iterations 30 --budget-ms 150
```

The integration suite also exercises the same ranking path against a bounded fixture and
fails if a suggestion request takes one second or more. The staging benchmark is the
release gate for materially larger catalogues because SQLite timing is not a substitute for
PostgreSQL query planning.

## Deployment

No new environment variables are required. Migration `0014_search_discovery` creates the
rollup and blacklist tables, enables `pg_trgm`, and adds trigram indexes. Deploy with:

```bash
cd backend
uv run alembic upgrade head
```

The normal worker cycle then creates the first privacy-safe dynamic rollup. Until it does,
the public endpoint and homepage use curated fallbacks.
