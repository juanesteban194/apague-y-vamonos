"""Saldo prepago (HU-03). El medidor prepago no se puede leer: la persona registra su saldo de vez en cuando y la proyección sale de
cuánto bajó entre registros (CLAUDE.md: promedio de 3 días; alerta roja con menos de 48 h)."""
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.prepago.models import PrepagoSaldo
from app.modules.prepago.schemas import PrepagoOut, RegistroSaldo

VENTANA = timedelta(days=3)
ALERTA_ROJA = timedelta(hours=48)
# Decisión técnica: con menos de un día de historia entre registros, un gasto de pocos pesos en pocas horas se proyecta a miles por día.
COBERTURA_MINIMA = timedelta(days=1)


@dataclass(frozen=True)
class Registro:
    saldo: float
    cuando: datetime


def promedio_diario(registros: list[Registro], ahora: datetime) -> float | None:
    """COP gastados por día en los últimos 3 días, o None si no hay al menos 1 día de historia utilizable.

    Cada par de registros consecutivos es un tramo. Si el saldo subió, hubo una recarga y ese tramo no dice cuánto se gastó:
    se descarta. Los tramos que quedan parcialmente dentro de la ventana cuentan en proporción al tiempo que cae dentro."""
    inicio = ahora - VENTANA
    gasto, cubierto = 0.0, timedelta(0)
    for a, b in zip(registros, registros[1:]):
        desde, hasta = max(a.cuando, inicio), min(b.cuando, ahora)
        if hasta <= desde or b.saldo > a.saldo:
            continue
        gasto += (a.saldo - b.saldo) * ((hasta - desde) / (b.cuando - a.cuando))
        cubierto += hasta - desde
    if cubierto < COBERTURA_MINIMA:
        return None
    return gasto / (cubierto / timedelta(days=1))


def registros_de(db: Session, hogar_id: uuid.UUID, limite: int = 60) -> list[Registro]:
    filas = db.scalars(select(PrepagoSaldo).where(PrepagoSaldo.hogar_id == hogar_id).order_by(PrepagoSaldo.registrado_en.desc()).limit(limite))
    return sorted((Registro(float(f.saldo_cop), f.registrado_en) for f in filas), key=lambda r: r.cuando)


def proyectar(registros: list[Registro], ahora: datetime) -> PrepagoOut:
    historial = [RegistroSaldo(saldo_cop=r.saldo, registrado_en=r.cuando) for r in reversed(registros[-10:])]
    if not registros:
        return PrepagoOut(estado="sin_registros", saldo_cop=None, registrado_en=None, promedio_diario_cop=None, dias_restantes=None, se_acaba_el=None, nivel=None, registros=[])
    ultimo = registros[-1]
    base = dict(saldo_cop=ultimo.saldo, registrado_en=ultimo.cuando, registros=historial)
    promedio = promedio_diario(registros, ahora)
    if promedio is None:
        return PrepagoOut(estado="datos_insuficientes", promedio_diario_cop=None, dias_restantes=None, se_acaba_el=None, nivel=None, **base)
    if promedio <= 0:
        return PrepagoOut(estado="ok", promedio_diario_cop=0.0, dias_restantes=None, se_acaba_el=None, nivel="verde", **base)
    se_acaba = ultimo.cuando + timedelta(days=ultimo.saldo / promedio)
    restante = max(timedelta(0), se_acaba - ahora)
    return PrepagoOut(
        estado="ok", promedio_diario_cop=round(promedio, 2), dias_restantes=round(restante / timedelta(days=1), 2),
        se_acaba_el=se_acaba, nivel="rojo" if restante < ALERTA_ROJA else "verde", **base,
    )


def registrar_saldo(db: Session, hogar_id: uuid.UUID, saldo_cop: float, ahora: datetime | None = None) -> PrepagoSaldo:
    registro = PrepagoSaldo(hogar_id=hogar_id, saldo_cop=saldo_cop, registrado_en=ahora or datetime.now(UTC))
    db.add(registro)
    db.commit()
    return registro


def estado(db: Session, hogar_id: uuid.UUID, ahora: datetime | None = None) -> PrepagoOut:
    return proyectar(registros_de(db, hogar_id), ahora or datetime.now(UTC))
