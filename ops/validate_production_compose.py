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
