#!/usr/bin/env python3
"""Validate safety-critical properties of the merged production Compose config."""

from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ENV_FILE = ROOT / ".env.production.example"


def load_config() -> dict:
    env_file = Path(os.environ.get("APP_ENV_FILE", DEFAULT_ENV_FILE))
    if not env_file.is_absolute():
        env_file = ROOT / env_file
    if not env_file.is_file():
        raise RuntimeError(f"Environment file does not exist: {env_file}")

    env = os.environ.copy()
    env["APP_ENV_FILE"] = str(env_file)
    command = [
        "docker",
        "compose",
        "--profile",
        "maintenance",
        "--env-file",
        str(env_file),
        "-f",
        str(ROOT / "docker-compose.yml"),
        "-f",
        str(ROOT / "docker-compose.prod.yml"),
        "config",
        "--format",
        "json",
    ]
    result = subprocess.run(command, cwd=ROOT, env=env, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or "docker compose config failed")
    return json.loads(result.stdout)


def validate(config: dict) -> list[str]:
    services = config.get("services", {})
    errors: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            errors.append(message)

    frontend = services.get("frontend", {})
    backend = services.get("backend", {})
    worker = services.get("worker", {})

    require(frontend.get("build", {}).get("target") == "runner", "frontend must build the runner stage")
    require(frontend.get("user") == "nextjs", "frontend must run as the image's nextjs user")
    require(frontend.get("command") == ["node", "server.js"], "frontend must start the standalone server")
    require(not frontend.get("volumes"), "frontend must not have development bind mounts")
    require(not frontend.get("ports"), "frontend must not publish a host port")

    require(not backend.get("volumes"), "backend must not have development bind mounts")
    require(not backend.get("ports"), "backend must not publish a host port")
    require("gunicorn" in backend.get("command", []), "backend must run with gunicorn")
    require(not worker.get("volumes"), "worker must not have development bind mounts")

    require(not services.get("postgres", {}).get("ports"), "PostgreSQL must not publish a host port")
    require(not services.get("redis", {}).get("ports"), "Redis must not publish a host port")
    require("minio" not in services, "development MinIO service must be removed")
    require("mailpit" not in services, "development Mailpit service must be removed")

    public_api_url = frontend.get("environment", {}).get("NEXT_PUBLIC_API_URL", "")
    require(public_api_url.startswith("https://"), "NEXT_PUBLIC_API_URL must use HTTPS in production")
    require("localhost" not in public_api_url, "NEXT_PUBLIC_API_URL must not point to localhost")
    cms = services.get("cms", {})
    cms_env = cms.get("environment", {})
    frontend_env = frontend.get("environment", {})
    require(cms.get("build", {}).get("target") == "runner", "CMS must build the runner stage")
    require(cms.get("user") == "node", "CMS must run as non-root node")
    require(cms.get("command") == ["node", "server.js"], "CMS must run the standalone server")
    require(cms.get("read_only") is True, "CMS runtime filesystem must be read-only")
    require("ALL" in cms.get("cap_drop", []), "CMS must drop Linux capabilities")
    require("no-new-privileges:true" in cms.get("security_opt", []), "CMS must prevent privilege escalation")
    require(not cms.get("ports") and not cms.get("volumes"), "CMS must have no host ports or bind mounts")
    require(bool(cms.get("healthcheck", {}).get("test")), "CMS must have a health check")
    require(cms.get("restart") == "unless-stopped", "CMS must restart on failure")
    require(cms_env.get("CMS_ENV") == "production", "CMS_ENV must be production")
    domain = services.get("caddy", {}).get("environment", {}).get("APP_DOMAIN")
    require(cms_env.get("CMS_PUBLIC_URL") == f"https://cms.{domain}", "CMS public origin must match its Caddy hostname")
    require(cms_env.get("CMS_FRONTEND_URL") == f"https://{domain}", "CMS preview origin must match the site")
    require(cms_env.get("CMS_DATABASE_HOST") == "postgres", "CMS must use private PostgreSQL")
    require(config.get("networks", {}).get("cms_private", {}).get("internal") is True, "CMS private network must be internal")
    require("cms_private" in cms.get("networks", {}), "CMS must join its private network")
    for name in ["postgres", "caddy", "frontend", "backend", "cms-backup"]:
        require("cms_private" in services.get(name, {}).get("networks", {}), f"{name} must join the CMS private network")
    require(frontend_env.get("CMS_INTERNAL_URL") == "http://cms:3002", "Frontend must use private CMS reads")
    require(cms_env.get("CMS_REVALIDATE_URL") == "http://frontend:3000/api/blog/revalidate", "Hook must use private frontend routing")
    for key in ["CMS_PREVIEW_SECRET", "CMS_REVALIDATE_SECRET"]:
        require(bool(cms_env.get(key)) and cms_env.get(key) == frontend_env.get(key), f"{key} must match across CMS/frontend")
    secrets = [cms_env.get(key, "") for key in ["CMS_SECRET", "CMS_PREVIEW_SECRET", "CMS_REVALIDATE_SECRET", "CMS_DATABASE_PASSWORD"]]
    require(all(len(value) >= 32 for value in secrets) and len(set(secrets)) == 4, "CMS secrets must be distinct and at least 32 characters")
    for key in ["CMS_S3_ENDPOINT", "CMS_S3_PUBLIC_URL"]:
        require(cms_env.get(key, "").startswith("https://"), f"{key} must use HTTPS")
    require(bool(cms_env.get("CMS_RESEND_API_KEY")) and bool(cms_env.get("CMS_EMAIL_FROM")), "CMS password recovery email must be configured")
    require(cms_env.get("CMS_ALLOW_SHARED_STORAGE") == "true" or cms_env.get("CMS_S3_BUCKET") != backend.get("environment", {}).get("HETZNER_STORAGE_BUCKET"), "CMS and marketplace buckets must differ unless CMS_ALLOW_SHARED_STORAGE=true")
    require(frontend.get("build", {}).get("args", {}).get("CMS_S3_PUBLIC_URL") == cms_env.get("CMS_S3_PUBLIC_URL"), "Frontend image allowlist must match CMS public storage")
    forbidden = {"POSTGRES_PASSWORD", "CMS_PROVISION_PASSWORD", "CMS_BOOTSTRAP_PASSWORD", "CMS_MAINTENANCE_CONFIRM", "DATABASE_URL", "CMS_BUILD"}
    require(not forbidden.intersection(cms_env), "CMS runtime must not receive admin/bootstrap/build credentials")
    for service in [backend, worker]:
        require(not any(service.get("environment", {}).get(key) for key in ["CMS_DATABASE_PASSWORD", "CMS_SECRET", "CMS_PREVIEW_SECRET", "CMS_REVALIDATE_SECRET", "CMS_RESEND_API_KEY", "CMS_S3_SECRET_ACCESS_KEY"]), "Marketplace services must not receive CMS credentials")
    maintenance = services.get("cms-maintenance", {})
    require(maintenance.get("profiles") == ["maintenance"], "CMS maintenance must require an explicit profile")
    require(maintenance.get("build", {}).get("target") == "tools" and maintenance.get("user") == "node", "CMS maintenance must use non-root tools image")
    require(not maintenance.get("ports") and not maintenance.get("volumes"), "CMS maintenance must not expose development resources")
    for name in ["backup", "cms-backup"]:
        backup = services.get(name, {})
        require(bool(backup), f"{name} service is required")
        require(not backup.get("ports"), f"{name} must not expose ports")
        require(backup.get("build", {}).get("dockerfile") == "ops/backup/Dockerfile", f"{name} must build the backup tools image")
        require(bool(backup.get("healthcheck", {}).get("test")), f"{name} must monitor backup freshness")
        require("POSTGRES_PASSWORD" not in backup.get("environment", {}), f"{name} must not receive database-admin credentials")
    require(services.get("cms-backup", {}).get("environment", {}).get("BACKUP_DATABASE") == "svezapecanje_cms", "CMS backup must select its separate database")
    require(services.get("cms-backup", {}).get("environment", {}).get("PGUSER") == "szp_cms", "CMS backup must use its restricted role")
    return errors


def main() -> int:
    try:
        errors = validate(load_config())
    except (OSError, RuntimeError, json.JSONDecodeError) as exc:
        print(f"Production Compose validation failed: {exc}", file=sys.stderr)
        return 1

    if errors:
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("Production Compose configuration is safe.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
