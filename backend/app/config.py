from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str = "sqlite:///./marketpilot.db"
    neon_database_url: str = ""
    app_secret: str = "local-development-secret"
    encryption_key: str = "local-encryption-key"
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    ai_api_key: str = ""
    ai_base_url: str = "https://api.openai.com/v1"
    ai_model: str = "gpt-5-mini"
    ai_timeout_seconds: float = 18.0

    brevo_api_key: str = ""
    brevo_sender_email: str = ""
    brevo_sender_name: str = "MarketPilot"

    x_client_id: str = ""
    x_client_secret: str = ""
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    meta_client_id: str = ""
    meta_client_secret: str = ""
    meta_graph_version: str = "v23.0"
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "MarketPilot/1.0 by owner"

    @property
    def production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.production and settings.app_secret == "local-development-secret":
        raise RuntimeError("APP_SECRET must be set in production")
    return settings
