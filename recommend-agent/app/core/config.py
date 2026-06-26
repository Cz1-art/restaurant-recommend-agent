from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Restaurant Recommend Agent"
    debug: bool = True
    api_prefix: str = "/api/v1"

    ordering_api_base_url: str = "http://127.0.0.1:3000/api"
    ordering_internal_token: str = ""
    ordering_timeout_seconds: float = 30.0

    dify_base_url: str = "https://api.dify.ai/v1"
    dify_api_key: str = ""
    dify_timeout_seconds: float = 120.0
    dify_required: bool = True
    dify_fallback_on_error: bool = True
    use_dify_llm_bridge: bool = True
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-chat"
    deepseek_timeout_seconds: float = 60.0

    amap_api_key: str = ""
    amap_static_map_key: str = ""
    amap_place_radius: int = 3000

    home_store_name: str = "风味餐厅"
    home_store_address: str = ""

    use_ordering_menu: bool = False

    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5174", "http://127.0.0.1:5174"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> list[str]:
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v


settings = Settings()
