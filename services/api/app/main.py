from fastapi import FastAPI

from app.modules.auth.router import router as auth_router

app = FastAPI(title="Gestión de Consumo Energético", version="0.1.0")

app.include_router(auth_router)


@app.get("/salud", tags=["salud"])
def salud():
    """Para que Render sepa que el servicio está vivo (no toca la base)."""
    return {"estado": "ok"}
