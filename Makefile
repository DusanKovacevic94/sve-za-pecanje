.PHONY: dev migrate migration-gate-postgres seed test test-storage-minio create-admin validate-prod brand-assets-check brand-assets-sync brand-release-check
.DEFAULT_GOAL := dev

BRAND_MANAGER_DIR ?= ../sve-za-pecanje-brand-manager
CMS_COMPOSE = docker compose -f docker-compose.yml -f docker-compose.cms.yml

.PHONY: cms-dev dev-with-cms cms-provision cms-migrate cms-bootstrap cms-check cms-test-integration cms-test-compose cms-image-check

cms-dev:
	$(CMS_COMPOSE) up --build cms

dev-with-cms:
	$(CMS_COMPOSE) up --build

cms-provision:
	$(CMS_COMPOSE) run --build --rm cms-provision

cms-migrate:
	$(CMS_COMPOSE) run --build --rm cms-migrate

cms-bootstrap:
	$(CMS_COMPOSE) run --rm --no-deps -e CMS_BOOTSTRAP_EMAIL -e CMS_BOOTSTRAP_PASSWORD cms pnpm bootstrap

cms-check:
	cd cms && pnpm lint && pnpm typecheck && pnpm test && pnpm build

cms-test-integration:
	cd cms && pnpm test:integration

cms-test-compose:
	cd cms && pnpm test:compose

cms-image-check:
	docker build --target runner -t szp-cms:local ./cms

.PHONY: cms-production-rehearsal
cms-production-rehearsal:
	python3 ops/validate_production_compose.py
	python3 -m unittest discover -s ops -p test_validate_production_compose.py
	python3 -m unittest discover -s ops -p test_backup_db.py
	docker build -f ops/backup/Dockerfile -t szp-backup:078-rehearsal .
	docker build --target tools -t szp-cms:078-tools ./cms
	docker build --target runner -t szp-cms:078-rehearsal ./cms
	cd cms && pnpm build && pnpm test:production

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
