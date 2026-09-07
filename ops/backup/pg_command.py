"""Translate an application URL to libpq environment, never process arguments."""
import os
import subprocess
import sys
from urllib.parse import parse_qs, unquote, urlsplit


def connection_environment(env):
    result = dict(env)
    url = urlsplit(env["DATABASE_URL"].replace("postgresql+psycopg://", "postgresql://", 1))
    if url.scheme not in {"postgres", "postgresql"} or not url.hostname or not url.username or url.fragment:
        raise ValueError("Invalid PostgreSQL URL")
    database = unquote(url.path.removeprefix("/"))
    if database != env["BACKUP_DATABASE"]:
        raise ValueError("Backup database URL/name mismatch")
    result.update(PGHOST=url.hostname, PGPORT=str(url.port or 5432), PGUSER=unquote(url.username),
                  PGPASSWORD=unquote(url.password or ""), PGDATABASE=database)
    allowed = {"sslmode": "PGSSLMODE", "sslrootcert": "PGSSLROOTCERT", "sslcert": "PGSSLCERT",
               "sslkey": "PGSSLKEY", "connect_timeout": "PGCONNECT_TIMEOUT"}
    for key, values in parse_qs(url.query, strict_parsing=True).items():
        if key not in allowed or len(values) != 1:
            raise ValueError("Unsupported connection URL option")
        result[allowed[key]] = values[0]
    result.pop("DATABASE_URL", None)
    return result


if __name__ == "__main__":
    try:
        environment = connection_environment(os.environ)
    except (KeyError, ValueError):
        sys.exit("Invalid backup connection configuration or database URL/name mismatch")
    sys.exit(subprocess.call(sys.argv[1:], env=environment))
