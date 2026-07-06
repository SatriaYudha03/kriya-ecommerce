from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment service AI (KRIYA-MASTER.md Bagian 4)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8000
    supabase_db_url: str = ""
    gemini_api_key: str = ""
    web_origin: str = "http://localhost:3000"
    internal_api_key: str = ""


settings = Settings()
