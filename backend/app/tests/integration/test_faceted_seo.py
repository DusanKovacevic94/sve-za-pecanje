from sqlalchemy import func, select

from app.models.audit import AuditLog
from app.models.brand import Brand
from app.models.category import Category
from app.models.seo_landing import SeoLandingPage


def landing_payload(
    category_id: str,
    brand_id: str | None = None,
    **overrides,
):
    payload = {
        "category_id": category_id,
        "brand_id": brand_id,
        "title": "Shimano mašinice za ribolov | Sve Za Pecanje",
        "meta_description": (
            "Pregledajte aktivne Shimano mašinice, uporedite ponude i "
            "pronađite odgovarajuću ribolovnu opremu."
        ),
        "intro_copy": (
            "Izabrani aktivni oglasi sa jasnim cenama, stanjem i "
            "mogućnostima preuzimanja ili dostave."
        ),
        "indexing_enabled": True,
        "minimum_active_listings": 5 if brand_id else 3,
        "threshold_override": False,
        "override_reason": None,
    }
    payload.update(overrides)
    return payload


def brand(db, category: Category, suffix: str = "shimano-seo") -> Brand:
    item = Brand(
        name="Shimano SEO",
        slug=suffix,
        aliases=[],
        category_scope=[category.slug],
        is_verified=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def add_inventory(factories, db, seller, category, count, item_brand=None):
    rows = []
    for index in range(count):
        listing = factories.listing(
            seller,
            category,
            title=f"SEO oglas {category.slug} {index}",
        )
        listing.brand_id = item_brand.id if item_brand else None
        rows.append(listing)
    db.commit()
    return rows


def test_category_threshold_and_filter_engine_parity(client, db, factories):
    seller = factories.user()
    category = factories.category(slug="seo-kategorija")
    add_inventory(factories, db, seller, category, 2)

    thin = client.get(f"/api/v1/seo/landing/{category.slug}")
    assert thin.status_code == 200
    assert thin.json()["data"]["active_listing_count"] == 2
    assert thin.json()["data"]["minimum_active_listings"] == 3
    assert thin.json()["data"]["is_indexable"] is False

    add_inventory(factories, db, seller, category, 1)
    eligible = client.get(f"/api/v1/seo/landing/{category.slug}")
    listings = client.get(
        "/api/v1/listings",
        params={"category": category.slug, "page_size": 1},
    )
    assert eligible.json()["data"]["active_listing_count"] == 3
    assert eligible.json()["data"]["active_listing_count"] == listings.json()["meta"]["total"]
    assert eligible.json()["data"]["is_indexable"] is True
    assert eligible.json()["data"]["canonical_path"] == (
        f"/kategorije/{category.slug}"
    )


def test_category_brand_requires_curated_record_and_five_listings(
    client, db, factories, login_user
):
    admin = factories.user(role="admin")
    seller = factories.user()
    category = factories.category(slug="seo-masinice")
    item_brand = brand(db, category)
    add_inventory(factories, db, seller, category, 4, item_brand)

    uncurated = client.get(
        f"/api/v1/seo/landing/{category.slug}/brand/{item_brand.slug}"
    )
    assert uncurated.status_code == 200
    assert uncurated.json()["data"]["is_curated"] is False
    assert uncurated.json()["data"]["is_indexable"] is False

    login_user(admin)
    created = client.post(
        "/api/v1/admin/seo-landings",
        json=landing_payload(category.id, item_brand.id),
    )
    assert created.status_code == 200
    assert created.json()["data"]["active_listing_count"] == 4
    assert created.json()["data"]["is_indexable"] is False

    add_inventory(factories, db, seller, category, 1, item_brand)
    eligible = client.get(
        f"/api/v1/seo/landing/{category.slug}/brand/{item_brand.slug}"
    )
    assert eligible.json()["data"]["is_indexable"] is True
    assert eligible.json()["data"]["active_listing_count"] == 5

    sitemap = client.get("/api/v1/seo/landings").json()["data"]
    paths = {item["path"] for item in sitemap}
    assert f"/kategorije/{category.slug}" in paths
    assert (
        f"/kategorije/{category.slug}/brend/{item_brand.slug}" in paths
    )
    resolution = client.get(
        "/api/v1/seo/resolve",
        params={"category_slug": category.slug, "brand_id": item_brand.id},
    )
    assert resolution.json()["data"]["canonical_path"].endswith(
        f"/brend/{item_brand.slug}"
    )


def test_override_is_reasoned_audited_and_never_indexes_empty_inventory(
    client, db, factories, login_user
):
    admin = factories.user(role="admin")
    seller = factories.user()
    category = factories.category(slug="seo-override")
    item_brand = brand(db, category, "daiwa-seo")
    login_user(admin)

    missing_reason = landing_payload(
        category.id,
        item_brand.id,
        threshold_override=True,
        override_reason=None,
    )
    assert (
        client.post("/api/v1/admin/seo-landings", json=missing_reason).status_code
        == 422
    )
    too_low_without_override = landing_payload(
        category.id,
        item_brand.id,
        minimum_active_listings=1,
    )
    response = client.post(
        "/api/v1/admin/seo-landings",
        json=too_low_without_override,
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "SEO_OVERRIDE_REQUIRED"

    override = landing_payload(
        category.id,
        item_brand.id,
        threshold_override=True,
        override_reason="Važna sezonska kategorija sa potvrđenom kampanjom.",
    )
    created = client.post("/api/v1/admin/seo-landings", json=override)
    assert created.status_code == 200
    assert created.json()["data"]["is_indexable"] is False

    add_inventory(factories, db, seller, category, 1, item_brand)
    public = client.get(
        f"/api/v1/seo/landing/{category.slug}/brand/{item_brand.slug}"
    )
    assert public.json()["data"]["active_listing_count"] == 1
    assert public.json()["data"]["is_indexable"] is True
    audit = db.scalar(
        select(AuditLog).where(
            AuditLog.action == "seo_landing.threshold_override"
        )
    )
    assert audit
    assert audit.metadata_json["reason"].startswith("Važna sezonska")


def test_admin_preview_does_not_persist_and_suspended_taxonomy_is_hidden(
    client, db, factories, login_user
):
    admin = factories.user(role="admin")
    category = factories.category(slug="seo-preview")
    item_brand = brand(db, category, "preview-brand")
    login_user(admin)
    preview = client.post(
        "/api/v1/admin/seo-landings/preview",
        json=landing_payload(category.id, item_brand.id),
    )
    assert preview.status_code == 200
    assert preview.json()["data"]["canonical_path"].endswith(
        "/brend/preview-brand"
    )
    assert db.scalar(select(func.count(SeoLandingPage.id))) == 0

    category.is_active = False
    db.commit()
    assert client.get(f"/api/v1/seo/landing/{category.slug}").status_code == 404
    assert all(
        category.slug not in item["path"]
        for item in client.get("/api/v1/seo/landings").json()["data"]
    )


def test_seo_admin_requires_authorization(client, factories, login_user):
    category = factories.category(slug="seo-auth")
    user = factories.user()
    login_user(user)
    assert client.get("/api/v1/admin/seo-landings").status_code == 403
    assert (
        client.post(
            "/api/v1/admin/seo-landings/preview",
            json=landing_payload(category.id),
        ).status_code
        == 403
    )
