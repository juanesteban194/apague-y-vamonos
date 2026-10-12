from fastapi import FastAPI

from app.modules.auth.router import router as auth_router
from app.modules.consumo.router import router as consumo_router
from app.modules.dispositivos.router import router as dispositivos_router
from app.modules.hogares.router import router as hogares_router
from app.modules.ingesta.router import router as ingesta_router
from app.modules.tarifas.router import router as tarifas_router

app = FastAPI(title="Gestión de Consumo Energético", version="0.1.0")

app.include_router(auth_router)
app.include_router(hogares_router)
app.include_router(dispositivos_router)
app.include_router(ingesta_router)
app.include_router(tarifas_router)
app.include_router(consumo_router)


@app.get("/salud", tags=["salud"])
def salud():
    """Para que Render sepa que el servicio está vivo (no toca la base)."""
    return {"estado": "ok"}
