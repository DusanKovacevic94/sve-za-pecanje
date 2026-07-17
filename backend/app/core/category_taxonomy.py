"""Stable phase-two leaf taxonomy and discriminator mappings."""

from __future__ import annotations

from typing import TypedDict


class LeafCategory(TypedDict):
    parent_slug: str
    slug: str
    name_sr: str
    name_en: str
    discriminator_key: str
    discriminator_values: tuple[str, ...]


def leaf(
    parent_slug: str,
    slug: str,
    name_sr: str,
    name_en: str,
    key: str,
    *values: str,
) -> LeafCategory:
    return {
        "parent_slug": parent_slug,
        "slug": slug,
        "name_sr": name_sr,
        "name_en": name_en,
        "discriminator_key": key,
        "discriminator_values": values,
    }


LEAF_CATEGORIES: tuple[LeafCategory, ...] = (
    leaf("stapovi", "spin-stapovi", "Spin štapovi", "Spinning rods", "rod_type", "spinning"),
    leaf("stapovi", "feeder-stapovi", "Feeder štapovi", "Feeder rods", "rod_type", "feeder"),
    leaf("stapovi", "saranski-stapovi", "Šaranski štapovi", "Carp rods", "rod_type", "carp"),
    leaf("stapovi", "mec-stapovi", "Meč štapovi", "Match rods", "rod_type", "match"),
    leaf("stapovi", "musicarski-stapovi", "Mušičarski štapovi", "Fly rods", "rod_type", "fly"),
    leaf(
        "stapovi",
        "teleskopski-stapovi",
        "Teleskopski štapovi",
        "Telescopic rods",
        "rod_type",
        "telescopic",
    ),
    leaf("stapovi", "ostali-stapovi", "Ostali štapovi", "Other rods", "rod_type", "other"),
    leaf("masinice", "spin-masinice", "Spin mašinice", "Spinning reels", "reel_type", "spinning"),
    leaf(
        "masinice",
        "baitcasting-masinice",
        "Baitcasting mašinice",
        "Baitcasting reels",
        "reel_type",
        "baitcasting",
    ),
    leaf("masinice", "saranske-masinice", "Šaranske mašinice", "Carp reels", "reel_type", "carp"),
    leaf("masinice", "musicarske-masinice", "Mušičarske mašinice", "Fly reels", "reel_type", "fly"),
    leaf(
        "masinice",
        "ostale-masinice",
        "Ostale mašinice",
        "Other reels",
        "reel_type",
        "multiplier",
        "other",
    ),
    leaf("varalice", "silikonci", "Silikonci", "Soft plastics", "lure_type", "soft_plastic"),
    leaf("varalice", "dzig-glave", "Džig glave", "Jig heads", "lure_type", "jig_head"),
    leaf("varalice", "vobleri", "Vobleri", "Crankbaits", "lure_type", "crankbait"),
    leaf("varalice", "jerkbait", "Jerkbait varalice", "Jerkbaits", "lure_type", "jerkbait"),
    leaf("varalice", "leptiri", "Leptiri", "Spinners", "lure_type", "spinner"),
    leaf("varalice", "kasike", "Kašike", "Spoons", "lure_type", "spoon"),
    leaf("varalice", "povrsinske-varalice", "Površinske varalice", "Topwater", "lure_type", "topwater"),
    leaf(
        "varalice",
        "ostale-varalice",
        "Ostale varalice",
        "Other lures",
        "lure_type",
        "swimbait",
        "blade_bait",
        "other",
    ),
    leaf(
        "najlon-struna-zavrsni-pribor",
        "pletenice",
        "Pletenice",
        "Braided line",
        "terminal_type",
        "braided_line",
    ),
    leaf(
        "najlon-struna-zavrsni-pribor",
        "monofili",
        "Monofili",
        "Monofilament",
        "terminal_type",
        "monofilament",
    ),
    leaf(
        "najlon-struna-zavrsni-pribor",
        "fluorokarbon",
        "Fluorokarbon",
        "Fluorocarbon",
        "terminal_type",
        "fluorocarbon",
    ),
    leaf("najlon-struna-zavrsni-pribor", "udice", "Udice", "Hooks", "terminal_type", "hook"),
    leaf(
        "najlon-struna-zavrsni-pribor",
        "virble-kopce",
        "Virble i kopče",
        "Swivels and snaps",
        "terminal_type",
        "swivel_snap",
    ),
    leaf(
        "najlon-struna-zavrsni-pribor",
        "predvezi",
        "Predvezi",
        "Leaders",
        "terminal_type",
        "leader",
    ),
    leaf(
        "najlon-struna-zavrsni-pribor",
        "olova",
        "Olova",
        "Weights",
        "terminal_type",
        "sinker_weight",
    ),
    leaf("elektronika", "fish-finderi", "Fish finder uređaji", "Fish finders", "device_type", "fish_finder"),
    leaf("elektronika", "sonari", "Sonari", "Sonars", "device_type", "sonar"),
    leaf("elektronika", "gps-uredjaji", "GPS uređaji", "GPS devices", "device_type", "gps"),
    leaf("elektronika", "baterije", "Baterije", "Batteries", "device_type", "battery"),
    leaf(
        "elektronika",
        "elektronska-oprema",
        "Elektronska oprema",
        "Electronic accessories",
        "device_type",
        "charger",
        "transducer",
        "other",
    ),
    leaf("camci-i-oprema", "gumeni-camci", "Gumeni čamci", "Inflatable boats", "boat_type", "inflatable"),
    leaf(
        "camci-i-oprema",
        "aluminijumski-camci",
        "Aluminijumski čamci",
        "Aluminum boats",
        "boat_type",
        "aluminum",
    ),
    leaf("camci-i-oprema", "kajaci", "Kajaci", "Kayaks", "boat_type", "kayak"),
    leaf(
        "camci-i-oprema",
        "elektromotori",
        "Elektromotori",
        "Electric motors",
        "boat_type",
        "electric_motor",
    ),
    leaf(
        "camci-i-oprema",
        "oprema-za-camce",
        "Oprema za čamce",
        "Boat accessories",
        "boat_type",
        "accessory",
    ),
    leaf("torbe-kutije-pribor", "kutije-za-pribor", "Kutije za pribor", "Tackle boxes", "accessory_type", "tackle_box"),
    leaf("torbe-kutije-pribor", "ribolovacke-torbe", "Ribolovačke torbe", "Fishing bags", "accessory_type", "fishing_bag"),
    leaf("torbe-kutije-pribor", "meredovi", "Meredovi", "Landing nets", "accessory_type", "landing_net"),
    leaf("torbe-kutije-pribor", "drzaci-stapova", "Držači štapova", "Rod holders", "accessory_type", "rod_holder"),
    leaf("torbe-kutije-pribor", "rod-podovi", "Rod podovi", "Rod pods", "accessory_type", "rod_pod"),
    leaf("torbe-kutije-pribor", "ribolovacki-alat", "Ribolovački alat", "Tools", "accessory_type", "tools"),
    leaf("odeca-i-obuca", "kombinezoni", "Kombinezoni", "Waders", "clothing_type", "waders"),
    leaf("odeca-i-obuca", "ribolovacke-cizme", "Ribolovačke čizme", "Boots", "clothing_type", "boots"),
    leaf("odeca-i-obuca", "ribolovacke-jakne", "Ribolovačke jakne", "Jackets", "clothing_type", "jacket"),
    leaf(
        "odeca-i-obuca",
        "polarizovane-naocare",
        "Polarizovane naočare",
        "Polarized glasses",
        "clothing_type",
        "glasses",
    ),
    leaf("odeca-i-obuca", "ribolovacke-rukavice", "Ribolovačke rukavice", "Gloves", "clothing_type", "gloves"),
)

LEAF_BY_SLUG = {item["slug"]: item for item in LEAF_CATEGORIES}
LEAVES_BY_PARENT = {
    parent: tuple(item for item in LEAF_CATEGORIES if item["parent_slug"] == parent)
    for parent in {item["parent_slug"] for item in LEAF_CATEGORIES}
}
