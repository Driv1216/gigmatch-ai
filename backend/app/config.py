from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "GigMatch AI Backend"
    app_env: str = "development"
    frontend_origin: str = "http://localhost:5173"
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_secret_key: str = ""
    embedding_model_name: str = ""
    applicant_shortlist_capacity: int = Field(default=5, ge=1, le=100)
    applicant_advancement_capacity: int = Field(default=5, ge=1, le=100)
    qa_message_burst_limit: int = Field(default=8, ge=1, le=100)
    qa_message_burst_minutes: int = Field(default=10, ge=1, le=1440)
    qa_message_daily_limit: int = Field(default=40, ge=1, le=500)
    qa_revision_daily_limit: int = Field(default=3, ge=1, le=50)
    qa_message_page_size: int = Field(default=30, ge=1, le=100)
    contact_active_encryption_key_id: str = ""
    contact_encryption_keys_json: str = "{}"
    contact_fingerprint_key_base64: str = ""
    contact_reveal_rate_limit: int = Field(default=10, ge=1, le=100)
    contact_reveal_rate_window_minutes: int = Field(default=10, ge=1, le=1440)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
