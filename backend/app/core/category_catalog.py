"""Versioned category attribute catalog used by seed and runtime validation."""

from __future__ import annotations

from typing import Any


def options(*items: tuple[str, str]) -> dict[str, list[dict[str, str]]]:
    return {"options": [{"value": value, "label_sr": label} for value, label in items]}


def attribute(
    key: str,
    label: str,
    field_type: str,
    *,
    required: bool = False,
    unit: str | None = None,
    choices: tuple[tuple[str, str], ...] = (),
    filter_mode: str | None = None,
    validation: dict[str, Any] | None = None,
    visible_when: dict[str, Any] | None = None,
    required_when: dict[str, Any] | None = None,
) -> dict[str, Any]:
    rules = dict(validation or {})
    rules["filter_mode"] = filter_mode or {
        "integer": "range",
        "decimal": "range",
        "boolean": "boolean",
        "enum": "multi",
        "multi_enum": "multi",
    }.get(field_type, "exact")
    if visible_when:
        rules["visible_when"] = visible_when
    if required_when:
        rules["required_when"] = required_when
    return {
        "key": key,
        "label_sr": label,
        "field_type": field_type,
        "unit": unit,
        "required": required,
        "filterable": rules["filter_mode"] != "none",
        "searchable": field_type in {"string", "enum", "multi_enum"},
        "options": options(*choices),
        "validation": rules,
    }


TECHNIQUES = (
    ("spin", "Spin"),
    ("feeder", "Feeder"),
    ("carp", "Šaranski ribolov"),
    ("match", "Meč"),
    ("fly", "Mušičarenje"),
    ("float", "Plovak"),
    ("bottom", "Dubinski ribolov"),
    ("trolling", "Troling"),
)
SPECIES = (
    ("smudj", "Smuđ"),
    ("stuka", "Štuka"),
    ("som", "Som"),
    ("saran", "Šaran"),
    ("pastrmka", "Pastrmka"),
    ("grgec", "Grgeč"),
    ("klen", "Klen"),
    ("mrena", "Mrena"),
    ("deverika", "Deverika"),
    ("bela_riba", "Bela riba"),
    ("bas", "Bas"),
    ("ostalo", "Ostalo"),
)

CATEGORY_ATTRIBUTES: dict[str, list[dict[str, Any]]] = {
    "stapovi": [
        attribute("rod_type", "Tip štapa", "enum", required=True, choices=(
            ("spinning", "Spin"), ("feeder", "Feeder"), ("carp", "Šaranski"),
            ("match", "Meč"), ("fly", "Mušičarski"), ("telescopic", "Teleskopski"),
            ("baitcasting", "Baitcasting"), ("other", "Ostalo"),
        )),
        attribute("length_cm", "Dužina", "integer", required=True, unit="cm",
                  validation={"min": 30, "max": 1500, "step": 1}),
        attribute("casting_weight_min_g", "Težina bacanja od", "integer", unit="g",
                  filter_mode="interval",
                  validation={
                      "min": 0,
                      "max": 1000,
                      "step": 1,
                      "interval_end": "casting_weight_max_g",
                  }),
        attribute("casting_weight_max_g", "Težina bacanja do", "integer", unit="g",
                  filter_mode="none", validation={"min": 0, "max": 1000, "step": 1}),
        attribute("sections", "Broj delova", "integer", validation={"min": 1, "max": 20}),
        attribute("transport_length_cm", "Transportna dužina", "integer", unit="cm",
                  validation={"min": 20, "max": 500}),
        attribute("rod_power", "Snaga", "enum", choices=(
            ("ultralight", "Ultra light"), ("light", "Light"), ("medium_light", "Medium light"),
            ("medium", "Medium"), ("medium_heavy", "Medium heavy"), ("heavy", "Heavy"),
            ("extra_heavy", "Extra heavy"),
        )),
        attribute("rod_action", "Akcija", "enum", choices=(
            ("slow", "Slow"), ("moderate", "Moderate"), ("moderate_fast", "Moderate fast"),
            ("fast", "Fast"), ("extra_fast", "Extra fast"),
        )),
        attribute("technique", "Tehnika", "multi_enum", choices=TECHNIQUES),
        attribute("target_species", "Ciljana riba", "multi_enum", choices=SPECIES),
        attribute("material", "Materijal", "enum", choices=(
            ("carbon", "Karbon"), ("composite", "Kompozit"), ("fiberglass", "Fiberglas"),
            ("bamboo", "Bambus"), ("other", "Ostalo"),
        )),
    ],
    "masinice": [
        attribute("reel_type", "Tip mašinice", "enum", required=True, choices=(
            ("spinning", "Spin"), ("baitcasting", "Baitcasting"), ("carp", "Šaranska"),
            ("fly", "Mušičarska"), ("multiplier", "Multiplikator"), ("other", "Ostalo"),
        )),
        attribute("reel_size", "Veličina", "enum", required=True, choices=tuple(
            (size, size) for size in ("500", "1000", "2000", "2500", "3000", "4000", "5000",
                                     "6000", "8000", "10000", "12000", "14000", "other")
        )),
        attribute("gear_ratio", "Prenos", "decimal", unit=":1",
                  validation={"min": 1, "max": 15, "step": 0.1}),
        attribute("bearings_count", "Broj ležajeva", "integer", validation={"min": 0, "max": 30}),
        attribute("max_drag_kg", "Maksimalna kočnica", "decimal", unit="kg",
                  validation={"min": 0, "max": 100, "step": 0.1}),
        attribute("weight_g", "Težina", "integer", unit="g", validation={"min": 20, "max": 5000}),
        attribute("spool_material", "Materijal špulne", "enum", choices=(
            ("aluminum", "Aluminijum"), ("graphite", "Grafit"), ("plastic", "Plastika"),
            ("other", "Ostalo"),
        )),
        attribute("handle_side", "Ručica", "enum", choices=(
            ("left", "Leva"), ("right", "Desna"), ("left_right", "Leva/desna"),
        )),
        attribute("spare_spool_included", "Rezervna špulna", "boolean"),
    ],
    "varalice": [
        attribute("lure_type", "Tip varalice", "enum", required=True, choices=(
            ("soft_plastic", "Silikonac"), ("jig_head", "Džig glava"), ("crankbait", "Vobler"),
            ("jerkbait", "Jerkbait"), ("spinner", "Leptir"), ("spoon", "Kašika"),
            ("topwater", "Površinska"), ("swimbait", "Swimbait"), ("blade_bait", "Cikada"),
            ("other", "Ostalo"),
        )),
        attribute("weight_g", "Težina", "decimal", required=True, unit="g",
                  validation={"min": 0.1, "max": 2000, "step": 0.1}),
        attribute("length_mm", "Dužina", "integer", unit="mm", validation={"min": 5, "max": 1000}),
        attribute("buoyancy", "Plovnost", "enum", choices=(
            ("floating", "Plivajuća"), ("suspending", "Suspending"),
            ("slow_sinking", "Sporo tonuća"), ("sinking", "Tonuća"),
            ("not_applicable", "Nije primenljivo"),
        )),
        attribute("diving_depth_m", "Dubina rada", "decimal", unit="m",
                  validation={"min": 0, "max": 100, "step": 0.1}),
        attribute("color", "Boja/dekor", "string", filter_mode="exact"),
        attribute("pack_quantity", "Količina u pakovanju", "integer",
                  validation={"min": 1, "max": 1000}),
        attribute("target_species", "Ciljana riba", "multi_enum", choices=SPECIES),
    ],
    "najlon-struna-zavrsni-pribor": [
        attribute("terminal_type", "Tip proizvoda", "enum", required=True, choices=(
            ("braided_line", "Pletenica"), ("monofilament", "Monofil"), ("fluorocarbon", "Fluorokarbon"),
            ("leader", "Predvez"), ("hook", "Udica"), ("swivel_snap", "Virbla/kopča"),
            ("sinker_weight", "Olovo"), ("float", "Plovak"), ("feeder", "Hranilica"),
            ("rig", "Gotov sistem"), ("other", "Ostalo"),
        )),
        attribute("diameter_mm", "Prečnik", "decimal", unit="mm",
                  validation={"min": 0.01, "max": 10, "step": 0.01},
                  visible_when={"terminal_type": ["braided_line", "monofilament", "fluorocarbon", "leader"]}),
        attribute("breaking_strength_kg", "Nosivost", "decimal", unit="kg",
                  validation={"min": 0.1, "max": 500, "step": 0.1},
                  visible_when={"terminal_type": ["braided_line", "monofilament", "fluorocarbon", "leader"]}),
        attribute("spool_length_m", "Dužina kotura", "integer", unit="m",
                  validation={"min": 1, "max": 10000},
                  visible_when={"terminal_type": ["braided_line", "monofilament", "fluorocarbon"]}),
        attribute("hook_type", "Tip udice", "enum", choices=(
            ("single", "Jednokraka"), ("double", "Dvokraka"), ("treble", "Trokraka"),
            ("circle", "Circle"), ("offset", "Offset"), ("other", "Ostalo"),
        ), visible_when={"terminal_type": "hook"}),
        attribute("hook_size", "Veličina udice", "string", filter_mode="exact",
                  visible_when={"terminal_type": "hook"}),
        attribute("weight_g", "Težina", "decimal", unit="g",
                  validation={"min": 0.1, "max": 5000, "step": 0.1},
                  visible_when={"terminal_type": ["sinker_weight", "float", "feeder"]}),
        attribute("pack_quantity", "Količina", "integer", validation={"min": 1, "max": 10000}),
        attribute("technique", "Tehnika", "multi_enum", choices=TECHNIQUES),
        attribute("target_species", "Ciljana riba", "multi_enum", choices=SPECIES),
    ],
    "elektronika": [
        attribute("device_type", "Tip uređaja", "enum", required=True, choices=(
            ("fish_finder", "Fish finder"), ("sonar", "Sonar"), ("gps", "GPS"),
            ("battery", "Baterija"), ("charger", "Punjač"), ("transducer", "Sonda"),
            ("other", "Ostalo"),
        )),
        attribute("screen_size_inches", "Veličina ekrana", "decimal", unit="in",
                  validation={"min": 1, "max": 30, "step": 0.1},
                  visible_when={"device_type": ["fish_finder", "sonar", "gps"]}),
        attribute("gps_included", "GPS", "boolean",
                  visible_when={"device_type": ["fish_finder", "sonar"]}),
        attribute("transducer_included", "Sonda uključena", "boolean",
                  visible_when={"device_type": ["fish_finder", "sonar"]}),
        attribute("battery_included", "Baterija uključena", "boolean",
                  visible_when={"device_type": ["fish_finder", "sonar", "gps"]}),
        attribute("touchscreen", "Ekran na dodir", "boolean",
                  visible_when={"device_type": ["fish_finder", "sonar", "gps"]}),
        attribute("sonar_technology", "Sonar tehnologija", "multi_enum", choices=(
            ("traditional", "Klasični sonar"), ("chirp", "CHIRP"), ("downscan", "DownScan"),
            ("sidescan", "SideScan"), ("live", "Live sonar"),
        ), visible_when={"device_type": ["fish_finder", "sonar"]}),
        attribute("voltage_v", "Napon", "decimal", unit="V",
                  validation={"min": 1, "max": 240, "step": 0.1},
                  visible_when={"device_type": ["battery", "charger"]}),
        attribute("capacity_ah", "Kapacitet", "decimal", unit="Ah",
                  validation={"min": 0.1, "max": 1000, "step": 0.1},
                  visible_when={"device_type": "battery"}),
        attribute("warranty_valid", "Garancija važi", "boolean"),
    ],
    "camci-i-oprema": [
        attribute("boat_type", "Tip plovila/opreme", "enum", required=True, choices=(
            ("inflatable", "Gumeni čamac"), ("aluminum", "Aluminijumski čamac"),
            ("kayak", "Kajak"), ("belly_boat", "Belly boat"), ("electric_motor", "Elektromotor"),
            ("accessory", "Oprema za čamac"), ("other", "Ostalo"),
        )),
        attribute("length_cm", "Dužina", "integer", unit="cm", validation={"min": 20, "max": 3000}),
        attribute("width_cm", "Širina", "integer", unit="cm", validation={"min": 20, "max": 1000}),
        attribute("material", "Materijal", "enum", choices=(
            ("pvc", "PVC"), ("hypalon", "Hypalon"), ("aluminum", "Aluminijum"),
            ("polyethylene", "Polietilen"), ("fiberglass", "Fiberglas"), ("other", "Ostalo"),
        )),
        attribute("capacity_persons", "Kapacitet osoba", "integer",
                  validation={"min": 1, "max": 30}),
        attribute("max_load_kg", "Maksimalno opterećenje", "decimal", unit="kg",
                  validation={"min": 1, "max": 10000}),
        attribute("motor_included", "Motor uključen", "boolean"),
        attribute("motor_thrust_lb", "Potisak motora", "decimal", unit="lb",
                  validation={"min": 1, "max": 500},
                  visible_when={"boat_type": "electric_motor"}),
        attribute("motor_voltage_v", "Napon motora", "decimal", unit="V",
                  validation={"min": 1, "max": 240},
                  visible_when={"boat_type": "electric_motor"}),
        attribute("registration_required", "Registracija potrebna", "boolean"),
    ],
    "torbe-kutije-pribor": [
        attribute("accessory_type", "Tip pribora", "enum", required=True, choices=(
            ("tackle_box", "Kutija"), ("fishing_bag", "Torba"), ("landing_net", "Meredov"),
            ("rod_holder", "Držač štapa"), ("rod_pod", "Rod pod"), ("chair_bedchair", "Stolica/ležaljka"),
            ("umbrella_shelter", "Kišobran/šator"), ("tools", "Alat"), ("bait_bucket", "Kanta"),
            ("other", "Ostalo"),
        )),
        attribute("waterproof", "Vodootporno", "boolean"),
        attribute("material", "Materijal", "string", filter_mode="exact"),
        attribute("length_cm", "Dužina", "integer", unit="cm", validation={"min": 1, "max": 1000}),
        attribute("width_cm", "Širina", "integer", unit="cm", validation={"min": 1, "max": 1000}),
        attribute("height_cm", "Visina", "integer", unit="cm", validation={"min": 1, "max": 1000}),
        attribute("rod_capacity", "Kapacitet štapova", "integer", validation={"min": 1, "max": 50}),
        attribute("handle_length_cm", "Dužina drške", "integer", unit="cm",
                  validation={"min": 10, "max": 1000}),
        attribute("net_head_width_cm", "Širina glave meredova", "integer", unit="cm",
                  validation={"min": 10, "max": 500}),
    ],
    "odeca-i-obuca": [
        attribute("clothing_type", "Tip", "enum", required=True, choices=(
            ("waders", "Kombinezon"), ("boots", "Čizme/obuća"), ("jacket", "Jakna"),
            ("glasses", "Polarizovane naočare"), ("gloves", "Rukavice"),
            ("shirt", "Majica/duks"), ("other", "Ostalo"),
        )),
        attribute("size", "Veličina", "enum", choices=tuple(
            (size.lower(), size) for size in ("XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL")
        ) + (("other", "Ostalo"),)),
        attribute("shoe_size_eu", "Broj obuće", "integer", validation={"min": 20, "max": 55},
                  visible_when={"clothing_type": ["waders", "boots"]},
                  required_when={"clothing_type": "boots"}),
        attribute("gender", "Pol", "enum", choices=(
            ("men", "Muški"), ("women", "Ženski"), ("unisex", "Unisex"), ("children", "Dečji"),
        )),
        attribute("waterproof", "Vodootporno", "boolean"),
        attribute("season", "Sezona", "enum", choices=(
            ("summer", "Letnja"), ("winter", "Zimska"), ("all_season", "Sve sezone"),
        )),
        attribute("wader_type", "Tip kombinezona", "enum", choices=(
            ("chest", "Grudni"), ("waist", "Do struka"), ("hip", "Do kukova"),
            ("stockingfoot", "Stockingfoot"), ("bootfoot", "Sa čizmom"),
        ), visible_when={"clothing_type": "waders"},
           required_when={"clothing_type": "waders"}),
    ],
    "kompleti": [
        attribute("bundle_type", "Tip kompleta", "enum", required=True, choices=(
            ("rod_reel", "Štap i mašinica"), ("carp_set", "Šaranski komplet"),
            ("feeder_set", "Feeder komplet"), ("lure_set", "Komplet varalica"),
            ("terminal_set", "Komplet završnog pribora"), ("mixed", "Mešoviti komplet"),
            ("other", "Ostalo"),
        )),
        attribute("item_count", "Broj komada", "integer", validation={"min": 2, "max": 1000}),
        attribute("rod_count", "Broj štapova", "integer", validation={"min": 0, "max": 100}),
        attribute("reel_count", "Broj mašinica", "integer", validation={"min": 0, "max": 100}),
        attribute("technique", "Tehnika", "multi_enum", choices=TECHNIQUES),
        attribute("target_species", "Ciljana riba", "multi_enum", choices=SPECIES),
    ],
    "ostalo": [
        attribute("other_type", "Tip proizvoda", "enum", required=True, choices=(
            ("bait_additives", "Mamci i aditivi"), ("spare_parts", "Rezervni delovi"),
            ("maintenance", "Održavanje"), ("books_media", "Knjige i mediji"),
            ("collectibles", "Kolekcionarski predmet"), ("other", "Ostalo"),
        )),
        attribute("item_count", "Količina", "integer", validation={"min": 1, "max": 1000}),
        attribute("technique", "Tehnika", "multi_enum", choices=TECHNIQUES),
        attribute("target_species", "Ciljana riba", "multi_enum", choices=SPECIES),
    ],
}
