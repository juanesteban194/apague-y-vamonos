from datetime import UTC, datetime

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_token_agente, token_bearer
from app.modules.dispositivos.models import Dispositivo
from app.modules.hogares.models import Agente
from app.modules.ingesta.models import Lectura
from app.modules.ingesta.schemas import LecturasIn, LecturasOut


def agente_actual(token: str = Depends(token_bearer), db: Session = Depends(get_db)) -> Agente:
    agente = db.scalar(select(Agente).where(Agente.token_hash == hash_token_agente(token)))
    if agente is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token de agente inválido")
    agente.ultima_conexion = datetime.now(UTC)
    return agente


def guardar_lecturas(db: Session, agente: Agente, datos: LecturasIn) -> LecturasOut:
    """Guarda lecturas del hogar del agente. Idempotente: reenviar una lectura no la duplica."""
    ids = {l.tuya_id for l in datos.lecturas}
    dispositivos = dict(
        db.execute(
            select(Dispositivo.tuya_id, Dispositivo.id).where(
                Dispositivo.hogar_id == agente.hogar_id, Dispositivo.tuya_id.in_(ids)
            )
        ).all()
    )
    filas = [
        {
            "dispositivo_id": dispositivos[l.tuya_id],
            "fecha_hora": l.fecha_hora,
            "potencia_w": l.potencia_w,
            "voltaje_v": l.voltaje_v,
            "corriente_ma": l.corriente_ma,
            "encendido": l.encendido,
        }
        for l in datos.lecturas
        if l.tuya_id in dispositivos
    ]
    guardadas = 0
    if filas:
        resultado = db.execute(
            insert(Lectura).values(filas).on_conflict_do_nothing().returning(Lectura.dispositivo_id)
        )
        guardadas = len(resultado.all())
    db.commit()
    return LecturasOut(
        recibidas=len(datos.lecturas),
        guardadas=guardadas,
        duplicadas=len(filas) - guardadas,
        desconocidas=len(datos.lecturas) - len(filas),
    )
