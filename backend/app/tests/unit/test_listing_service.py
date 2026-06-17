from app.services.listing_service import slugify


def test_slugify_serbian_latin_characters():
    assert slugify("Štap za smuđa 2.40m") == "stap-za-smudja-2-40m"

