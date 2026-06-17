.PHONY: dev migrate seed test create-admin

dev:
	docker compose up --build

migrate:
	docker compose run --rm backend alembic upgrade head

seed:
	docker compose run --rm backend python -m scripts.seed

test:
	docker compose run --rm backend pytest

create-admin:
	docker compose run --rm backend python -m scripts.create_admin --email "$(EMAIL)" --username "$(USERNAME)" --password "$(PASSWORD)"

