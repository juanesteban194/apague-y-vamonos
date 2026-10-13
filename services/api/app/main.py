from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.jobs.planificador import crear_planificador

from app.modules.auth.router import router as auth_router
from app.modules.consumo.router import router as consumo_router
from app.modules.dispositivos.router import router as dispositivos_router
from app.modules.hogares.router import router as hogares_router
from app.modules.ingesta.router import router as ingesta_router
from app.modules.tarifas.router import router as tarifas_router
from app.realtime.router import router as realtime_router

@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    planificador = crear_planificador() if get_settings().jobs_activos else None
    if planificador:
        planificador.start()
    yield
    if planificador:
        planificador.shutdown(wait=False)


app = FastAPI(title="Gestión de Consumo Energético", version="0.1.0", lifespan=ciclo_de_vida)

app.include_router(auth_router)
app.include_router(hogares_router)
app.include_router(dispositivos_router)
app.include_router(ingesta_router)
app.include_router(tarifas_router)
app.include_router(consumo_router)
app.include_router(realtime_router)


@app.get("/salud", tags=["salud"])
def salud():
    """Para que Render sepa que el servicio está vivo (no toca la base)."""
    return {"estado": "ok"}
