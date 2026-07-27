from sqlalchemy import Boolean, ForeignKey, Index, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_pk


class Category(Base, TimestampMixin):
    __tablename__ = "categories"
    __table_args__ = (Index("ix_categories_slug", "slug", unique=True),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), index=True)
    slug: Mapped[str] = mapped_column(String(120))
    name_sr: Mapped[str] = mapped_column(String(120))
    name_en: Mapped[str] = mapped_column(String(120))
    description_sr: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    parent: Mapped["Category | None"] = relationship(remote_side=[id], back_populates="children")
    children: Mapped[list["Category"]] = relationship(back_populates="parent")
    attributes: Mapped[list["AttributeDefinition"]] = relationship(
        back_populates="category", cascade="all, delete-orphan"
    )


class AttributeDefinition(Base, TimestampMixin):
    __tablename__ = "attribute_definitions"
    __table_args__ = (UniqueConstraint("category_id", "key", name="uq_attribute_category_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    category_id: Mapped[str] = mapped_column(ForeignKey("categories.id"), index=True)
    key: Mapped[str] = mapped_column(String(120), index=True)
    label_sr: Mapped[str] = mapped_column(String(160))
    field_type: Mapped[str] = mapped_column(String(30))
    unit: Mapped[str | None] = mapped_column(String(20))
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    filterable: Mapped[bool] = mapped_column(Boolean, default=True)
    searchable: Mapped[bool] = mapped_column(Boolean, default=False)
    options: Mapped[dict] = mapped_column(JSON, default=dict)
    validation: Mapped[dict] = mapped_column(JSON, default=dict)
    sort_order: Mapped[int] = mapped_column(default=0)

    category: Mapped[Category] = relationship(back_populates="attributes")


class City(Base):
    __tablename__ = "cities"
    __table_args__ = (Index("ix_cities_name", "name", unique=True),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    name: Mapped[str] = mapped_column(String(120))
