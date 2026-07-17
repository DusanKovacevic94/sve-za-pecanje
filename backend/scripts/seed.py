from sqlalchemy import select

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app import models  # noqa: F401
from app.models.brand import Brand
from app.models.category import AttributeDefinition, Category, City
from app.models.listing import Listing
from app.models.profile import UserProfile
from app.models.user import User
from app.core.security import hash_password
from app.core.category_catalog import CATEGORY_ATTRIBUTES
from app.core.category_taxonomy import LEAF_CATEGORIES
from app.services.listing_service import slugify


BRANDS = [
    "Shimano",
    "Daiwa",
    "Rapala",
    "Savage Gear",
    "Abu Garcia",
    "Okuma",
    "Major Craft",
    "Favorite",
    "Westin",
    "Gunki",
    "Sakura",
    "Delphin",
    "Formax",
    "Berkley",
    "Spro",
    "Fox Rage",
    "Illex",
    "Duo",
    "Megabass",
    "Lucky Craft",
    "Owner",
    "VMC",
    "Mustad",
    "Gamakatsu",
    "St. Croix",
    "Sportex",
    "Garmin",
    "Lowrance",
    "Humminbird",
    "Minn Kota",
]

CITIES = [
    "Beograd",
    "Novi Sad",
    "Niš",
    "Kragujevac",
    "Subotica",
    "Zrenjanin",
    "Leskovac",
    "Pančevo",
    "Čačak",
    "Kraljevo",
    "Novi Pazar",
    "Smederevo",
    "Valjevo",
    "Kruševac",
    "Šabac",
    "Sombor",
    "Kikinda",
    "Užice",
    "Loznica",
    "Vranje",
    "Zaječar",
    "Sremska Mitrovica",
    "Jagodina",
    "Požarevac",
    "Pirot",
]

CATEGORIES = [
    ("stapovi", "Štapovi", "Rods"),
    ("masinice", "Mašinice", "Reels"),
    ("varalice", "Varalice", "Lures"),
    ("najlon-struna-zavrsni-pribor", "Najlon, struna i završni pribor", "Lines and terminal tackle"),
    ("elektronika", "Elektronika", "Electronics"),
    ("camci-i-oprema", "Čamci i oprema", "Boats and watercraft"),
    ("torbe-kutije-pribor", "Torbe, kutije i pribor", "Bags, boxes and accessories"),
    ("odeca-i-obuca", "Odeća i obuća", "Clothing and footwear"),
    ("kompleti", "Kompleti", "Bundles"),
    ("ostalo", "Ostalo", "Other"),
]

DEMO_LISTINGS = [
    ("Shimano Stradic FL 2500", "masinice", "Shimano", "Stradic FL 2500", 140, "EUR", "Beograd", {"reel_type": "spinning", "reel_size": "2500", "gear_ratio": "6.0:1"}),
    ("Daiwa Legalis LT 3000", "masinice", "Daiwa", "Legalis LT 3000", 9500, "RSD", "Novi Sad", {"reel_type": "spinning", "reel_size": "3000"}),
    ("Major Craft spin štap 240 cm 7-28 g", "stapovi", "Major Craft", "Solpara", 85, "EUR", "Niš", {"rod_type": "spinning", "length_cm": 240, "casting_weight_min_g": 7, "casting_weight_max_g": 28}),
    ("Savage Gear silikonske varalice komplet", "varalice", "Savage Gear", None, 2200, "RSD", "Kragujevac", {"lure_type": "soft_plastic", "pack_quantity": 12}),
    ("Rapala vobleri komplet za smuđa", "varalice", "Rapala", None, 45, "EUR", "Subotica", {"lure_type": "crankbait", "buoyancy": "floating"}),
    ("Lowrance fish finder sa sondom", "elektronika", "Lowrance", "Hook Reveal", 260, "EUR", "Čačak", {"device_type": "fish_finder", "screen_size_inches": 7, "transducer_included": True}),
    ("Gumeni čamac 300 cm", "camci-i-oprema", None, None, 380, "EUR", "Šabac", {"boat_type": "inflatable", "length_cm": 300, "material": "pvc"}),
    ("Komplet šaranskih štapova 3 komada", "stapovi", "Sportex", None, 210, "EUR", "Sombor", {"rod_type": "carp", "length_cm": 360, "sections": 2}),
    ("Feeder štap 3.60 m", "stapovi", "Delphin", None, 6500, "RSD", "Kraljevo", {"rod_type": "feeder", "length_cm": 360}),
    ("Polarizovane naočare za ribolov", "odeca-i-obuca", "Spro", None, 2800, "RSD", "Valjevo", {"clothing_type": "glasses"}),
]


def ensure_category(
    db,
    slug: str,
    name_sr: str,
    name_en: str,
    sort_order: int,
    parent_id: str | None = None,
) -> Category:
    category = db.scalar(select(Category).where(Category.slug == slug))
    if category:
        category.name_sr = name_sr
        category.name_en = name_en
        category.sort_order = sort_order
        category.parent_id = parent_id
        return category
    category = Category(
        slug=slug,
        name_sr=name_sr,
        name_en=name_en,
        sort_order=sort_order,
        parent_id=parent_id,
    )
    db.add(category)
    db.flush()
    return category


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        category_by_slug: dict[str, Category] = {}
        for index, (slug, name_sr, name_en) in enumerate(CATEGORIES):
            category_by_slug[slug] = ensure_category(db, slug, name_sr, name_en, index)
        leaf_order: dict[str, int] = {}
        for item in LEAF_CATEGORIES:
            parent = category_by_slug[item["parent_slug"]]
            sort_order = leaf_order.get(parent.slug, 0)
            category_by_slug[item["slug"]] = ensure_category(
                db,
                item["slug"],
                item["name_sr"],
                item["name_en"],
                sort_order,
                parent.id,
            )
            leaf_order[parent.slug] = sort_order + 1

        for slug, definitions in CATEGORY_ATTRIBUTES.items():
            category = category_by_slug[slug]
            for index, definition in enumerate(definitions):
                existing = db.scalar(
                    select(AttributeDefinition).where(
                        AttributeDefinition.category_id == category.id,
                        AttributeDefinition.key == definition["key"],
                    )
                )
                values = {
                    "label_sr": definition["label_sr"],
                    "field_type": definition["field_type"],
                    "unit": definition["unit"],
                    "required": definition["required"],
                    "filterable": definition["filterable"],
                    "searchable": definition["searchable"],
                    "options": definition["options"],
                    "validation": definition["validation"],
                    "sort_order": index,
                }
                if existing:
                    for key, value in values.items():
                        setattr(existing, key, value)
                else:
                    db.add(
                        AttributeDefinition(
                            category_id=category.id,
                            key=definition["key"],
                            **values,
                        )
                    )

        brand_by_name: dict[str, Brand] = {}
        for name in BRANDS:
            slug = slugify(name)
            brand = db.scalar(select(Brand).where(Brand.slug == slug))
            if not brand:
                brand = Brand(name=name, slug=slug, is_verified=True)
                db.add(brand)
                db.flush()
            brand_by_name[name] = brand

        for city in CITIES:
            if not db.scalar(select(City).where(City.name == city)):
                db.add(City(name=city))

        # Pydantic email validation rejects the special-use .local TLD, so the
        # demo account needs a real-looking domain to be able to log in.
        seller = db.scalar(select(User).where(User.username == "demo_pecaros"))
        if seller and seller.email.endswith(".local"):
            seller.email = "demo@svezapecanje.rs"
        if not seller:
            seller = User(
                email="demo@svezapecanje.rs",
                username="demo_pecaros",
                password_hash=hash_password("Demo12345!"),
                role="user",
                status="active",
            )
            seller.profile = UserProfile(display_name="Demo pecaroš", city="Beograd", bio="Demo prodavac za lokalni razvoj.")
            db.add(seller)
            db.flush()

        for title, category_slug, brand_name, model, price, currency, city, attributes in DEMO_LISTINGS:
            if db.scalar(select(Listing).where(Listing.title == title)):
                continue
            public_id = slugify(title)[0:4] + str(len(title))
            listing_category_slug = next(
                (
                    item["slug"]
                    for item in LEAF_CATEGORIES
                    if item["parent_slug"] == category_slug
                    and attributes.get(item["discriminator_key"])
                    in item["discriminator_values"]
                ),
                category_slug,
            )
            db.add(
                Listing(
                    public_id=public_id,
                    seller_id=seller.id,
                    category_id=category_by_slug[listing_category_slug].id,
                    brand_id=brand_by_name[brand_name].id if brand_name else None,
                    model=model,
                    title=title,
                    slug=f"{slugify(title)}-{public_id}",
                    description=f"Demo oglas za lokalni razvoj. {title} je primer unosa sa strukturiranim poljima za ribolovnu opremu.",
                    condition="used_excellent",
                    price_amount=price,
                    currency=currency,
                    city=city,
                    status="active",
                    attributes=attributes,
                    allow_messages=True,
                )
            )

        db.commit()
        print("Seed data created.")


if __name__ == "__main__":
    main()
