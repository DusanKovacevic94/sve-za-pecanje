from app.models.category import AttributeDefinition
from app.services.attribute_service import validate_and_coerce_attributes
from app.services.search_service import SearchService


def add_definition(
    db,
    category,
    key,
    label,
    field_type,
    *,
    required=False,
    options=None,
    validation=None,
    filterable=True,
    sort_order=0,
):
    definition = AttributeDefinition(
        category_id=category.id,
        key=key,
        label_sr=label,
        field_type=field_type,
        required=required,
        filterable=filterable,
        searchable=False,
        options={"options": options or []},
        validation=validation or {},
        sort_order=sort_order,
    )
    db.add(definition)
    db.commit()
    return definition


def test_typed_range_multi_and_interval_filters(client, db, factories):
    seller = factories.user()
    rods = factories.category(slug="stapovi", name="Štapovi")
    add_definition(
        db,
        rods,
        "rod_type",
        "Tip štapa",
        "enum",
        required=True,
        options=[
            {"value": "spinning", "label_sr": "Spin"},
            {"value": "feeder", "label_sr": "Feeder"},
        ],
        validation={"filter_mode": "multi"},
    )
    add_definition(
        db,
        rods,
        "length_cm",
        "Dužina",
        "integer",
        validation={"filter_mode": "range", "min": 30, "max": 1500},
        sort_order=1,
    )
    add_definition(
        db,
        rods,
        "casting_weight_min_g",
        "Težina bacanja",
        "integer",
        validation={
            "filter_mode": "interval",
            "interval_end": "casting_weight_max_g",
            "min": 0,
            "max": 1000,
        },
        sort_order=2,
    )
    add_definition(
        db,
        rods,
        "casting_weight_max_g",
        "Težina bacanja do",
        "integer",
        filterable=False,
        validation={"filter_mode": "none"},
        sort_order=3,
    )
    add_definition(
        db,
        rods,
        "target_species",
        "Ciljana riba",
        "multi_enum",
        options=[
            {"value": "stuka", "label_sr": "Štuka"},
            {"value": "saran", "label_sr": "Šaran"},
        ],
        validation={"filter_mode": "multi"},
        sort_order=4,
    )
    add_definition(
        db,
        rods,
        "spare_tip",
        "Rezervni vrh",
        "boolean",
        validation={"filter_mode": "boolean"},
        sort_order=5,
    )
    spin = factories.listing(
        seller,
        rods,
        attributes={
            "rod_type": "spinning",
            "length_cm": 240,
            "casting_weight_min_g": 7,
            "casting_weight_max_g": 28,
            "target_species": ["stuka"],
            "spare_tip": False,
        },
    )
    feeder = factories.listing(
        seller,
        rods,
        attributes={
            "rod_type": "feeder",
            "length_cm": 360,
            "casting_weight_min_g": 40,
            "casting_weight_max_g": 120,
            "target_species": ["saran"],
            "spare_tip": True,
        },
    )

    response = client.get(
        "/api/v1/listings",
        params=[
            ("category", "stapovi"),
            ("attributes[rod_type]", "spinning"),
            ("attributes[rod_type]", "feeder"),
            ("attributes[length_cm][min]", "200"),
            ("attributes[length_cm][max]", "300"),
            ("attributes[casting_weight_min_g][min]", "20"),
            ("attributes[casting_weight_min_g][max]", "35"),
            ("attributes[target_species]", "stuka"),
            ("attributes[spare_tip]", "false"),
        ],
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["data"]] == [spin.id]
    assert feeder.id not in {item["id"] for item in response.json()["data"]}
    invalid = client.get(
        "/api/v1/listings",
        params={"category": "stapovi", "attributes[unknown]": "value"},
    )
    assert invalid.status_code == 422


def test_parent_category_includes_leaf_and_saved_search_matches(client, db, factories):
    seller = factories.user()
    rods = factories.category(slug="stapovi", name="Štapovi")
    leaf = factories.category(slug="spin-stapovi", name="Spin štapovi")
    leaf.parent_id = rods.id
    db.commit()
    add_definition(
        db,
        rods,
        "rod_type",
        "Tip štapa",
        "enum",
        required=True,
        options=[{"value": "spinning", "label_sr": "Spin"}],
    )
    add_definition(
        db,
        rods,
        "length_cm",
        "Dužina",
        "integer",
        validation={"filter_mode": "range"},
        sort_order=1,
    )
    parent_listing = factories.listing(seller, rods)
    leaf_listing = factories.listing(seller, leaf)

    parent_response = client.get("/api/v1/listings", params={"category": "stapovi"})
    leaf_response = client.get("/api/v1/listings", params={"category": "spin-stapovi"})
    matching_count = SearchService(db).matching_count(None, {"category": "stapovi"})
    categories = client.get("/api/v1/categories").json()["data"]
    serialized_leaf = categories[0]["children"][0]

    assert {item["id"] for item in parent_response.json()["data"]} == {
        parent_listing.id,
        leaf_listing.id,
    }
    assert [item["id"] for item in leaf_response.json()["data"]] == [leaf_listing.id]
    assert matching_count == 2
    assert [item["key"] for item in serialized_leaf["attributes"]] == ["length_cm"]


def test_attribute_validation_coerces_types_and_applies_conditions(db, factories):
    clothing = factories.category(slug="odeca-i-obuca")
    add_definition(
        db,
        clothing,
        "clothing_type",
        "Tip",
        "enum",
        required=True,
        options=[
            {"value": "boots", "label_sr": "Čizme"},
            {"value": "jacket", "label_sr": "Jakna"},
        ],
    )
    add_definition(
        db,
        clothing,
        "shoe_size_eu",
        "Broj obuće",
        "integer",
        validation={
            "min": 20,
            "max": 55,
            "visible_when": {"clothing_type": "boots"},
            "required_when": {"clothing_type": "boots"},
        },
        sort_order=1,
    )

    result = validate_and_coerce_attributes(
        db,
        clothing.id,
        {"clothing_type": "boots", "shoe_size_eu": "43"},
    )

    assert result == {"clothing_type": "boots", "shoe_size_eu": 43}
