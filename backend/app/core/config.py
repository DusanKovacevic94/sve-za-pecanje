from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "Sve Za Pecanje"
    app_url: str = "https://svezapecanje.rs"
    api_url: str = "http://localhost:8001"

    database_url: str = "sqlite:///./dev.db"
    postgres_password: str = "postgres"
    redis_url: str = "redis://localhost:6379/0"

    secret_key: str = "change-me"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    session_lifetime_minutes: int = 60 * 24 * 7
    session_cookie_name: str = "ro_session"

    cors_allowed_origins: str = "http://localhost:3001,https://svezapecanje.rs"

    email_from: str = "noreply@example.com"
    contact_email: str = ""
    resend_api_key: str = ""
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = False

    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key_id: str = "minioadmin"
    s3_secret_access_key: str = "minioadmin"
    s3_bucket: str = "fishing-marketplace"
    s3_public_url: str = "http://localhost:9000/fishing-marketplace"
    s3_region_name: str = "auto"
    storage_backend: str = "auto"

    hetzner_storage_endpoint: str = ""
    hetzner_storage_bucket: str = ""
    hetzner_storage_root_folder: str = ""
    hetzner_storage_public_url: str = ""
    hetzner_storage_region: str = "eu-central"
    hetzner_storage_access_key: str = ""
    hetzner_storage_secret_key: str = ""
    hetzner_storage_force_path_style: bool = False
    hetzner_storage_acl: str = "public-read"
    hetzner_storage_signed_url_expires: int = 900

    local_storage_path: str = "storage/uploads"

    listing_review_mode: str = "manual"
    listing_lifetime_days: int = 60
    worker_interval_seconds: int = 60
    view_dedupe_seconds: int = 3600
    analytics_retention_days: int = 90
    analytics_aggregate_retention_days: int = 730
    analytics_rollup_interval_minutes: int = 15
    worker_heartbeat_key: str = "worker:heartbeat"
    worker_heartbeat_max_age_seconds: int = 300
    max_listing_images: int = 10
    max_image_size_mb: int = 8
    rate_limit_enabled: bool = True
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.0

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def reject_default_secrets_in_production(self) -> "Settings":
        if self.app_env == "production":
            insecure = [
                name
                for name, value in (("SECRET_KEY", self.secret_key), ("JWT_SECRET", self.jwt_secret))
                if value == "change-me" or len(value) < 32
            ]
            if not self.resend_api_key:
                insecure.append("RESEND_API_KEY")
            if self.postgres_password in {"", "postgres", "change-me"} or len(self.postgres_password) < 16:
                insecure.append("POSTGRES_PASSWORD")
            if insecure:
                raise ValueError(
                    f"Refusing to start in production with unsafe/missing settings: {', '.join(insecure)}. "
                    "Set strong secrets and required provider credentials."
                )
        return self

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def normalize_origins(cls, value: str | list[str]) -> str:
        if isinstance(value, list):
            return ",".join(value)
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    @property
    def use_s3_storage(self) -> bool:
        backend = self.storage_backend.lower()
        if backend in {"s3", "hetzner"}:
            return True
        if backend == "local":
            return False
        return bool(
            self.hetzner_storage_endpoint
            and self.hetzner_storage_bucket
            and self.hetzner_storage_access_key
            and self.hetzner_storage_secret_key
        )

    @property
    def object_storage_endpoint(self) -> str:
        return self.hetzner_storage_endpoint or self.s3_endpoint_url

    @property
    def object_storage_bucket(self) -> str:
        return self.hetzner_storage_bucket or self.s3_bucket

    @property
    def object_storage_public_url(self) -> str:
        return self.hetzner_storage_public_url or self.s3_public_url

    @property
    def object_storage_region(self) -> str:
        return self.hetzner_storage_region or self.s3_region_name

    @property
    def object_storage_access_key(self) -> str:
        return self.hetzner_storage_access_key or self.s3_access_key_id

    @property
    def object_storage_secret_key(self) -> str:
        return self.hetzner_storage_secret_key or self.s3_secret_access_key

    @property
    def object_storage_root_folder(self) -> str:
        return self.hetzner_storage_root_folder.strip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
