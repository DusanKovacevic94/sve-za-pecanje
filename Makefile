.PHONY: dev migrate migration-gate-postgres seed test test-storage-minio create-admin validate-prod brand-assets-check brand-assets-sync brand-release-check

BRAND_MANAGER_DIR ?= ../sve-za-pecanje-brand-manager

dev:
	docker compose up --build

migrate:
	docker compose run --rm backend alembic upgrade head

migration-gate-postgres:
	./ops/postgres_migration_gate.sh

seed:
	docker compose run --rm backend python -m scripts.seed

test:
	docker compose run --rm backend pytest

test-storage-minio:
	docker compose up -d minio
	@cd backend && \
		MINIO_TEST_ENDPOINT=http://127.0.0.1:9000 \
		MINIO_TEST_ACCESS_KEY=minioadmin \
		MINIO_TEST_SECRET_KEY=minioadmin \
		uv run pytest -q app/tests/integration/test_private_storage_minio.py

validate-prod:
	python3 ops/validate_production_compose.py

create-admin:
	docker compose run --rm backend python -m scripts.create_admin --email "$(EMAIL)" --username "$(USERNAME)" --password "$(PASSWORD)"

brand-assets-check:
	$(MAKE) -C "$(BRAND_MANAGER_DIR)" assets-check

brand-assets-sync:
	$(MAKE) -C "$(BRAND_MANAGER_DIR)" assets-sync

brand-release-check:
	python3 ops/validate_brand_assets.py
	python3 -m unittest ops/test_validate_brand_assets.py
