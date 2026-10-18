"""Aviso de consumo anómalo por dispositivo: "la nevera gastó 18 % más ayer de lo normal".

Lo normal de un dispositivo es la mediana de lo que gastó en los 7 días anteriores a ayer (la mediana no se deja torcer por un día raro).
Se compara con ayer, un día completo, así que el aviso sale una vez al día como máximo. Solo avisa de subidas: gastar menos no es un problema.

Los umbrales son decisiones de producto, no datos del dominio: están aquí, juntos, para poder ajustarlos (docs/decisiones/0007)."""
import statistics
import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.alertas import service
from app.modules.alertas.models import Alerta
from app.modules.consumo.energia import BOGOTA, energia_hibrida, inicio_dia_bogota, inicio_mes_bogota
from app.modules.consumo.service import precio_del_mes
from app.modules.dispositivos.models import Dispositivo
from app.modules.hogares.models import Hogar

DIAS_BASE = 7
DIAS_BASE_MINIMOS = 3  # con menos días de historia no se sabe qué es "lo normal"
KWH_DIA_MINIMO = 0.05  # 50 Wh: por debajo el dispositivo estuvo casi apagado ese día y no cuenta como día de datos
KWH_EXTRA_MINIMO = 0.05  # una subida de menos de esto es ruido, aunque en porcentaje parezca grande
# (subida mínima, nivel). El nivel decide a quién le llega según la sensibilidad del hogar (pocos: rojo; normal: rojo y amarillo; todos: también verde).
ESCALONES = ((0.50, "rojo"), (0.20, "amarillo"), (0.10, "verde"))
DIAS_DEL_MES = 30


def _nivel(subida: float) -> str | None:
    for minimo, nivel in ESCALONES:
        if subida >= minimo:
            return nivel
    return None


def _pesos(valor: float) -> str:
    return "$" + f"{round(valor):,}".replace(",", ".")


def _kwh_por_dia(db: Session, dispositivo_id: uuid.UUID, desde: datetime, hasta: datetime, ahora: datetime) -> dict[date, float]:
    filas = energia_hibrida(db, [dispositivo_id], desde, hasta, "day", ahora)
    return {inicio.astimezone(BOGOTA).date(): kwh for (_, inicio), kwh in filas.items()}


def evaluar_consumo_anomalo(db: Session, ahora: datetime | None = None) -> list[Alerta]:
    ahora = ahora or datetime.now(UTC)
    hoy_ini = inicio_dia_bogota(ahora)
    ayer_ini = hoy_ini - timedelta(days=1)
    ayer = ayer_ini.astimezone(BOGOTA).date()
    creadas: list[Alerta] = []
    for d in db.scalars(select(Dispositivo)):
        por_dia = _kwh_por_dia(db, d.id, ayer_ini - timedelta(days=DIAS_BASE), hoy_ini, ahora)
        kwh_ayer = por_dia.get(ayer, 0.0)
        base = [kwh for dia, kwh in por_dia.items() if dia != ayer and kwh >= KWH_DIA_MINIMO]
        if kwh_ayer < KWH_DIA_MINIMO or len(base) < DIAS_BASE_MINIMOS:
            continue
        normal = statistics.median(base)
        extra = kwh_ayer - normal
        nivel = _nivel(extra / normal)
        if nivel is None or extra < KWH_EXTRA_MINIMO:
            continue
        hogar = db.get(Hogar, d.hogar_id)
        ids = list(db.scalars(select(Dispositivo.id).where(Dispositivo.hogar_id == hogar.id)))
        precio = precio_del_mes(db, hogar, ids, inicio_mes_bogota(ahora))[0]
        porcentaje = round(extra / normal * 100)
        cuerpo = f"Ayer gastó {porcentaje} % más que en un día normal suyo (lo normal sale de los últimos {DIAS_BASE} días)."
        if precio:
            cuerpo += f" Si sigue así, le cuesta unos {_pesos(extra * DIAS_DEL_MES * float(precio))} más al mes."
        alerta = service.crear(
            db, hogar.id, "consumo_anomalo", nivel, f"{d.nombre} gastó {porcentaje} % más ayer de lo normal", cuerpo,
            dispositivo_id=d.id, sin_repetir_desde=hoy_ini, ahora=ahora,
        )
        if alerta:
            creadas.append(alerta)
    return creadas
