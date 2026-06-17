from pydantic import BaseModel


class AttributeDefinitionOut(BaseModel):
    id: str
    key: str
    label_sr: str
    field_type: str
    unit: str | None
    required: bool
    filterable: bool
    searchable: bool
    options: dict
    validation: dict
    sort_order: int


class CategoryOut(BaseModel):
    id: str
    parent_id: str | None
    slug: str
    name_sr: str
    name_en: str
    description_sr: str | None
    sort_order: int
    children: list["CategoryOut"] = []
    attributes: list[AttributeDefinitionOut] = []


class BrandOut(BaseModel):
    id: str
    name: str
    slug: str
    is_verified: bool


CategoryOut.model_rebuild()

