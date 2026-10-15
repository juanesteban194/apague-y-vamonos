import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app import datos_referencia
from app.jobs.planificador import crear_planificador

from app.realtime.manager import gestor
from app.modules.agentes.router import router as agentes_router
from app.modules.alertas.router import router as alertas_router, tokens as tokens_router
from app.modules.auth.router import router as auth_router
from app.modules.consumo.router import router as consumo_router
from app.modules.dispositivos.control import router as control_router
from app.modules.dispositivos.router import router as dispositivos_router
from app.modules.hogares.router import router as hogares_router
from app.modules.ingesta.router import router as ingesta_router
from app.modules.prepago.router import router as prepago_router
from app.modules.retiq.router import router as retiq_router
from app.modules.rutinas.router import router as rutinas_router
from app.modules.tarifas.router import router as tarifas_router
from app.realtime.router import router as realtime_router

@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    if get_settings().cargar_datos_referencia:
        datos_referencia.cargar_todo()
    gestor.fijar_bucle(asyncio.get_running_loop())
    planificador = crear_planificador() if get_settings().jobs_activos else None
    if planificador:
        planificador.start()
    yield
    gestor.fijar_bucle(None)
    if planificador:
        planificador.shutdown(wait=False)


app = FastAPI(title="Gestión de Consumo Energético", version="0.1.0", lifespan=ciclo_de_vida)

app.include_router(auth_router)
app.include_router(hogares_router)
app.include_router(agentes_router)
app.include_router(dispositivos_router)
app.include_router(control_router)
app.include_router(ingesta_router)
app.include_router(tarifas_router)
app.include_router(consumo_router)
app.include_router(alertas_router)
app.include_router(tokens_router)
app.include_router(prepago_router)
app.include_router(retiq_router)
app.include_router(rutinas_router)
app.include_router(realtime_router)


@app.get("/salud", tags=["salud"])
def salud():
    """Para que Render sepa que el servicio está vivo (no toca la base)."""
    return {"estado": "ok"}
