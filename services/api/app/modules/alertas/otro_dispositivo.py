"""Aviso «¿hay otro dispositivo conectado a ese enchufe?»: la corriente de ahora se sale mucho de lo normal de ese dispositivo,
por encima (algo más conectado, por ejemplo con una multitoma) o por debajo (quizá lo cambiaron por otro). Ver dispositivos/corriente.py."""
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.alertas import service
from app.modules.alertas.models import Alerta
from app.modules.consumo.energia import inicio_dia_bogota
from app.modules.dispositivos import corriente
from app.modules.dispositivos.models import Dispositivo

TIPO = "otro_dispositivo"


def _textos(nombre: str, e: corriente.Estado) -> tuple[str, str]:
    b, a = e.base, e.ahora_ma
    rango = f"entre {corriente.amperios(b.bajo_ma)} y {corriente.amperios(b.alto_ma)}"
    if e.estado == "alta":
        return (
            f"¿Hay algo más conectado al enchufe de {nombre}?",
            f"Desde hace un rato pasa más corriente de lo normal: {corriente.amperios(a)}, cuando lo normal es {rango}. "
            f"Puede que haya otro dispositivo conectado (por ejemplo, con una multitoma). Si es así, lo que gaste se suma a {nombre}.",
        )
    return (
        f"{nombre} está usando menos corriente de lo normal",
        f"Ahora pasan {corriente.amperios(a)} y lo normal es {rango}. Puede que en ese enchufe haya otro dispositivo. "
        "Si lo cambiaste, ponle el nombre nuevo en Explorar › Enchufes para que las cuentas cuadren.",
    )


def evaluar_otro_dispositivo(db: Session, ahora: datetime | None = None) -> list[Alerta]:
    ahora = ahora or datetime.now(UTC)
    creadas: list[Alerta] = []
    for d in db.scalars(select(Dispositivo)):
        e = corriente.estado(db, d.id, ahora)
        if e.estado not in ("alta", "baja"):
            continue
        titulo, mensaje = _textos(d.nombre, e)
        alerta = service.crear(db, d.hogar_id, TIPO, "amarillo", titulo, mensaje, dispositivo_id=d.id, sin_repetir_desde=inicio_dia_bogota(ahora), ahora=ahora)
        if alerta:
            creadas.append(alerta)
    return creadas
