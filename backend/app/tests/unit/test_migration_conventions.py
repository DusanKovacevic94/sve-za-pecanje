from __future__ import annotations

import ast
import re
from pathlib import Path

from app import models  # noqa: F401
from app.db.base import Base
from app.db.migration_conventions import MANAGED_POSTGRES_INDEXES

MIGRATIONS_DIR = Path(__file__).parents[3] / "db" / "migrations" / "versions"
RAW_CREATE_INDEX = re.compile(
    r"CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+"
    r"(?P<name>[A-Za-z_][A-Za-z0-9_]*)",
    re.IGNORECASE,
)


def _postgres_indexes_managed_outside_model_metadata() -> set[str]:
    discovered: set[str] = set()
    for migration_path in MIGRATIONS_DIR.glob("*.py"):
        tree = ast.parse(migration_path.read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                discovered.update(
                    match.group("name") for match in RAW_CREATE_INDEX.finditer(node.value)
                )
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue
            if node.func.attr != "create_index" or not node.args:
                continue
            using = next(
                (
                    keyword.value.value
                    for keyword in node.keywords
                    if keyword.arg == "postgresql_using"
                    and isinstance(keyword.value, ast.Constant)
                    and isinstance(keyword.value.value, str)
                ),
                None,
            )
            if using == "gin" and isinstance(node.args[0], ast.Constant):
                discovered.add(str(node.args[0].value))
    return discovered


def test_managed_index_registry_exactly_covers_postgres_raw_and_gin_indexes():
    assert _postgres_indexes_managed_outside_model_metadata() == set(
        MANAGED_POSTGRES_INDEXES
    )


def test_unique_indexes_are_explicitly_named_in_model_metadata():
    implicit_unique_index_columns = [
        f"{table.name}.{column.name}"
        for table in Base.metadata.sorted_tables
        for column in table.columns
        if column.unique and column.index
    ]
    unnamed_unique_indexes = [
        f"{table.name}({', '.join(column.name for column in index.columns)})"
        for table in Base.metadata.sorted_tables
        for index in table.indexes
        if index.unique and not index.name
    ]

    assert implicit_unique_index_columns == []
    assert unnamed_unique_indexes == []
