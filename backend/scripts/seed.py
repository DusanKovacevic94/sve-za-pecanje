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

ATTRIBUTES = {
    "stapovi": [
        ("rod_type", "Tip štapa", "enum", None, True, ["spinning", "feeder", "carp", "match", "fly", "telescopic", "baitcasting", "other"]),
        ("length_cm", "Dužina", "integer", "cm", True, []),
        ("casting_weight_min_g", "Težina bacanja od", "integer", "g", False, []),
        ("casting_weight_max_g", "Težina bacanja do", "integer", "g", False, []),
        ("sections", "Broj delova", "integer", None, False, []),
        ("technique", "Tehnika", "multi_enum", None, False, ["spin", "feeder", "carp", "fly"]),
    ],
    "masinice": [
        ("reel_type", "Tip mašinice", "enum", None, True, ["spinning", "baitcasting", "carp", "fly", "multiplier", "other"]),
        ("reel_size", "Veličina", "string", None, True, []),
        ("gear_ratio", "Prenos", "string", None, False, []),
        ("max_drag_kg", "Maksimalna kočnica", "decimal", "kg", False, []),
        ("handle_side", "Ručica", "enum", None, False, ["left", "right", "left_right"]),
    ],
    "varalice": [
        ("lure_type", "Tip varalice", "enum", None, True, ["soft_plastic", "jig_head", "crankbait", "jerkbait", "spinner", "spoon", "topwater", "swimbait", "blade_bait", "other"]),
        ("weight_g", "Težina", "decimal", "g", False, []),
        ("length_mm", "Dužina", "integer", "mm", False, []),
        ("buoyancy", "Plovnost", "enum", None, False, ["floating", "suspending", "slow_sinking", "sinking", "not_applicable"]),
    ],
    "elektronika": [
        ("device_type", "Tip uređaja", "enum", None, True, ["fish_finder", "sonar", "gps", "battery", "charger", "transducer", "other"]),
        ("screen_size_inches", "Veličina ekrana", "decimal", "in", False, []),
        ("gps_included", "GPS", "boolean", None, False, []),
        ("transducer_included", "Sonda uključena", "boolean", None, False, []),
    ],
    "camci-i-oprema": [
        ("boat_type", "Tip plovila", "enum", None, True, ["inflatable", "aluminum", "kayak", "belly_boat", "electric_motor", "accessory", "other"]),
        ("length_cm", "Dužina", "integer", "cm", False, []),
        ("material", "Materijal", "string", None, False, []),
        ("registration_required", "Registracija potrebna", "boolean", None, False, []),
    ],
    "odeca-i-obuca": [
        ("clothing_type", "Tip", "enum", None, True, ["waders", "boots", "jacket", "glasses", "gloves", "other"]),
        ("size", "Veličina", "string", None, False, []),
        ("shoe_size_eu", "Broj obuće", "integer", None, False, []),
        ("waterproof", "Vodootporno", "boolean", None, False, []),
    ],
}

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


def ensure_category(db, slug: str, name_sr: str, name_en: str, sort_order: int) -> Category:
    category = db.scalar(select(Category).where(Category.slug == slug))
    if category:
        return category
    category = Category(slug=slug, name_sr=name_sr, name_en=name_en, sort_order=sort_order)
    db.add(category)
    db.flush()
    return category


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        category_by_slug: dict[str, Category] = {}
        for index, (slug, name_sr, name_en) in enumerate(CATEGORIES):
            category_by_slug[slug] = ensure_category(db, slug, name_sr, name_en, index)

        for slug, definitions in ATTRIBUTES.items():
            category = category_by_slug[slug]
            for index, (key, label, field_type, unit, required, options) in enumerate(definitions):
                existing = db.scalar(
                    select(AttributeDefinition).where(
                        AttributeDefinition.category_id == category.id,
                        AttributeDefinition.key == key,
                    )
                )
                if not existing:
                    db.add(
                        AttributeDefinition(
                            category_id=category.id,
                            key=key,
                            label_sr=label,
                            field_type=field_type,
                            unit=unit,
                            required=required,
                            filterable=True,
                            searchable=field_type in {"string", "enum"},
                            options={"options": [{"value": value, "label_sr": value} for value in options]},
                            sort_order=index,
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
            db.add(
                Listing(
                    public_id=public_id,
                    seller_id=seller.id,
                    category_id=category_by_slug[category_slug].id,
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

