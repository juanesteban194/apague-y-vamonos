from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Se lee de variables de entorno o de .env (en services/api o en la raíz del repo).
    model_config = SettingsConfigDict(env_file=(".env", "../../.env"), extra="ignore")

    database_url: str
    jwt_secret: str
    jwt_access_minutes: int = 15
    jwt_refresh_days: int = 30
    # Tareas programadas (APScheduler) dentro del proceso. Las pruebas las apagan y llaman las tareas a mano.
    jobs_activos: bool = True

    # Inicio de sesión con Google (cliente OAuth tipo "Aplicación web" de Google Cloud). Sin ellos, el botón responde 503.
    google_client_id: str | None = None
    google_client_secret: str | None = None
    # URL pública de la API, para el redirect de Google. Render la entrega sola en RENDER_EXTERNAL_URL.
    api_public_url: str | None = None
    render_external_url: str | None = None

    # Respaldo por la nube de Tuya (solo cuando el agente no responde). Sin credenciales, no hay respaldo.
    tuya_access_id: str | None = None
    tuya_access_secret: str | None = None
    tuya_region: str = "us"  # Western America → openapi.tuyaus.com
    # Tope de llamadas a Tuya Cloud por mes y por proceso: la cuota de prueba es de 26.000 y no debe agotarse (CLAUDE.md).
    tuya_llamadas_max_mes: int = 300
    # Límite de frecuencia de encender/apagar por enchufe (CLAUDE.md: "límite de frecuencia"; el valor es una decisión técnica).
    comandos_max_por_minuto: int = 6

    @property
    def url_publica(self) -> str:
        return (self.api_public_url or self.render_external_url or "http://localhost:8000").rstrip("/")

    @field_validator("database_url")
    @classmethod
    def usar_psycopg3(cls, v: str) -> str:
        # Neon y Render entregan postgresql://; SQLAlchemy necesita el driver explícito.
        for prefijo in ("postgres://", "postgresql://"):
            if v.startswith(prefijo):
                return "postgresql+psycopg://" + v[len(prefijo):]
        return v

    @field_validator("jwt_secret")
    @classmethod
    def secreto_largo(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("JWT_SECRET debe tener al menos 32 caracteres")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
