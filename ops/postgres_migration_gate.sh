#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME="szp-postgres-migration-gate"
POSTGRES_PORT="${MIGRATION_GATE_POSTGRES_PORT:-55432}"
STARTED_CONTAINER=false

cleanup() {
  if [[ "$STARTED_CONTAINER" == "true" ]]; then
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [[ -z "${MIGRATION_GATE_BOOTSTRAP_URL:-}" ]]; then
  command -v docker >/dev/null || {
    echo "Docker is required for the local PostgreSQL migration gate." >&2
    exit 1
  }
  if docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
    echo "Container $CONTAINER_NAME already exists; remove it before running the gate." >&2
    exit 1
  fi

  echo "Starting isolated PostgreSQL 16 for migration validation..."
  docker run --rm --detach \
    --name "$CONTAINER_NAME" \
    --env POSTGRES_HOST_AUTH_METHOD=trust \
    --publish "127.0.0.1:${POSTGRES_PORT}:5432" \
    postgres:16-alpine >/dev/null
  STARTED_CONTAINER=true

  ready=false
  for _ in {1..30}; do
    if docker exec "$CONTAINER_NAME" pg_isready -U postgres -d postgres >/dev/null 2>&1; then
      ready=true
      break
    fi
    sleep 1
  done
  if [[ "$ready" != "true" ]]; then
    echo "PostgreSQL 16 did not become ready within 30 seconds." >&2
    exit 1
  fi
  export MIGRATION_GATE_BOOTSTRAP_URL="postgresql://postgres@127.0.0.1:${POSTGRES_PORT}/postgres"
fi

command -v uv >/dev/null || {
  echo "uv is required to run the backend migration gate." >&2
  exit 1
}

cd "$ROOT_DIR/backend"
uv run python scripts/postgres_migration_gate.py
