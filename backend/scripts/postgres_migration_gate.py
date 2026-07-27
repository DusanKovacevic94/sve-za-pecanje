"""Run the production-like Alembic release gate against a local PostgreSQL server."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict
from sqlalchemy.engine import URL

DATABASE_NAME = "szp_migration_gate"
ADMIN_ROLE = "szp_gate_admin"
APPLICATION_ROLE = "szp_gate_app"
REQUIRED_EXTENSIONS = ("unaccent", "pg_trgm")
PRIVILEGE_PROBE_EXTENSION = "hstore"
ALLOWED_HOSTS = {"127.0.0.1", "::1", "localhost"}
BACKEND_DIR = Path(__file__).resolve().parents[1]


class GateError(RuntimeError):
    pass


def _connection_parameters() -> dict[str, str]:
    bootstrap_url = os.environ.get("MIGRATION_GATE_BOOTSTRAP_URL", "")
    if not bootstrap_url:
        raise GateError(
            "MIGRATION_GATE_BOOTSTRAP_URL is required. "
            "Use `make migration-gate-postgres` to start an isolated PostgreSQL 16 server."
        )
    parameters = conninfo_to_dict(bootstrap_url)
    host = parameters.get("host", "")
    database = parameters.get("dbname", "")
    if host not in ALLOWED_HOSTS:
        raise GateError(
            "The migration gate only accepts a loopback PostgreSQL host; "
            "production and remote databases are intentionally rejected."
        )
    if database != "postgres":
        raise GateError(
            "The bootstrap connection must use the local `postgres` maintenance database."
        )
    return parameters


def _role_parameters(
    bootstrap_parameters: dict[str, str],
    role: str,
    database: str,
) -> dict[str, str]:
    return {
        key: value
        for key, value in {
            "host": bootstrap_parameters.get("host"),
            "port": bootstrap_parameters.get("port"),
            "user": role,
            "dbname": database,
        }.items()
        if value
    }


def _application_database_url(bootstrap_parameters: dict[str, str]) -> str:
    return URL.create(
        "postgresql+psycopg",
        username=APPLICATION_ROLE,
        host=bootstrap_parameters.get("host"),
        port=int(bootstrap_parameters["port"]) if bootstrap_parameters.get("port") else None,
        database=DATABASE_NAME,
    ).render_as_string(hide_password=False)


def _reset_roles_and_database(bootstrap_parameters: dict[str, str]) -> None:
    print(
        "Preparing isolated database-admin and application migration roles...",
        flush=True,
    )
    with psycopg.connect(**bootstrap_parameters, autocommit=True) as connection:
        connection.execute(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            "WHERE datname = %s AND pid <> pg_backend_pid()",
            (DATABASE_NAME,),
        )
        connection.execute(
            sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(DATABASE_NAME))
        )
        connection.execute(
            sql.SQL("DROP ROLE IF EXISTS {}").format(sql.Identifier(APPLICATION_ROLE))
        )
        connection.execute(sql.SQL("DROP ROLE IF EXISTS {}").format(sql.Identifier(ADMIN_ROLE)))
        connection.execute(
            sql.SQL(
                "CREATE ROLE {} LOGIN NOSUPERUSER CREATEDB CREATEROLE NOINHERIT"
            ).format(sql.Identifier(ADMIN_ROLE))
        )

    admin_parameters = _role_parameters(bootstrap_parameters, ADMIN_ROLE, "postgres")
    with psycopg.connect(**admin_parameters, autocommit=True) as connection:
        connection.execute(
            sql.SQL(
                "CREATE ROLE {} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT"
            ).format(sql.Identifier(APPLICATION_ROLE))
        )
        connection.execute(
            sql.SQL("CREATE DATABASE {}").format(sql.Identifier(DATABASE_NAME))
        )


def _install_extensions_and_grant_privileges(
    bootstrap_parameters: dict[str, str],
) -> None:
    print("Installing required extensions with the database-admin role...", flush=True)
    admin_parameters = _role_parameters(
        bootstrap_parameters,
        ADMIN_ROLE,
        DATABASE_NAME,
    )
    with psycopg.connect(**admin_parameters, autocommit=True) as connection:
        for extension in REQUIRED_EXTENSIONS:
            connection.execute(
                sql.SQL("CREATE EXTENSION {}").format(sql.Identifier(extension))
            )
        connection.execute(
            sql.SQL("REVOKE ALL ON DATABASE {} FROM PUBLIC").format(
                sql.Identifier(DATABASE_NAME)
            )
        )
        connection.execute(
            sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(
                sql.Identifier(DATABASE_NAME),
                sql.Identifier(APPLICATION_ROLE),
            )
        )
        connection.execute(
            sql.SQL("REVOKE CREATE ON DATABASE {} FROM {}").format(
                sql.Identifier(DATABASE_NAME),
                sql.Identifier(APPLICATION_ROLE),
            )
        )
        connection.execute("REVOKE CREATE ON SCHEMA public FROM PUBLIC")
        connection.execute(
            sql.SQL("GRANT USAGE, CREATE ON SCHEMA public TO {}").format(
                sql.Identifier(APPLICATION_ROLE)
            )
        )


def _assert_role_separation(bootstrap_parameters: dict[str, str]) -> None:
    bootstrap = dict(bootstrap_parameters)
    with psycopg.connect(**bootstrap) as connection:
        rows = connection.execute(
            "SELECT rolname, rolsuper, rolcreatedb, rolcreaterole "
            "FROM pg_roles WHERE rolname = ANY(%s)",
            ([ADMIN_ROLE, APPLICATION_ROLE],),
        ).fetchall()
    roles = {row[0]: row[1:] for row in rows}
    if roles.get(ADMIN_ROLE) != (False, True, True):
        raise GateError("The gate database-admin role does not have the expected privileges.")
    if roles.get(APPLICATION_ROLE) != (False, False, False):
        raise GateError("The application migration role is unexpectedly privileged.")


def _assert_application_cannot_create_extensions(
    bootstrap_parameters: dict[str, str],
) -> None:
    print(
        "Confirming the application migration role cannot create extensions...",
        flush=True,
    )
    app_parameters = _role_parameters(
        bootstrap_parameters,
        APPLICATION_ROLE,
        DATABASE_NAME,
    )
    try:
        with psycopg.connect(**app_parameters, autocommit=True) as connection:
            connection.execute(
                sql.SQL("CREATE EXTENSION {}").format(
                    sql.Identifier(PRIVILEGE_PROBE_EXTENSION)
                )
            )
    except psycopg.Error as error:
        if error.sqlstate == "42501":
            return
        raise GateError(
            "The extension privilege probe failed for a reason other than insufficient privilege."
        ) from error
    raise GateError("The application migration role was able to create an extension.")


def _run_alembic(database_url: str, *arguments: str) -> None:
    environment = os.environ.copy()
    environment.update(
        {
            "APP_ENV": "test",
            "DATABASE_URL": database_url,
            "SECRET_KEY": "migration-gate-only-secret",
            "JWT_SECRET": "migration-gate-only-jwt-secret",
        }
    )
    subprocess.run(
        [sys.executable, "-m", "alembic", *arguments],
        cwd=BACKEND_DIR,
        env=environment,
        check=True,
    )


def main() -> int:
    try:
        bootstrap_parameters = _connection_parameters()
        _reset_roles_and_database(bootstrap_parameters)
        _install_extensions_and_grant_privileges(bootstrap_parameters)
        _assert_role_separation(bootstrap_parameters)
        database_url = _application_database_url(bootstrap_parameters)

        print(
            "Upgrading to Alembic head as the restricted application role...",
            flush=True,
        )
        _run_alembic(database_url, "upgrade", "head")
        print("Checking model/schema drift on PostgreSQL...", flush=True)
        _run_alembic(database_url, "check")
        _assert_application_cannot_create_extensions(bootstrap_parameters)

        print("Downgrading the latest revision to its parent...", flush=True)
        _run_alembic(database_url, "downgrade", "-1")
        print("Re-upgrading to head and checking drift again...", flush=True)
        _run_alembic(database_url, "upgrade", "head")
        _run_alembic(database_url, "check")
    except (GateError, psycopg.Error, subprocess.CalledProcessError) as error:
        print(f"PostgreSQL migration release gate failed: {error}", file=sys.stderr)
        return 1

    print("PostgreSQL migration release gate passed.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
