import uuid
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import distinct_on, insert
from sqlalchemy.orm import Session

from app.core.config import get_settings
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


# Solo lo reciente es "en vivo": al reenviar lo acumulado tras una caída no se inunda a la app.
VIGENCIA_EN_VIVO = timedelta(seconds=60)


def _evento_lectura(fila: dict) -> dict:
    return {
        "tipo": "lectura",
        "dispositivo_id": str(fila["dispositivo_id"]),
        "fecha_hora": fila["fecha_hora"].isoformat(),
        "potencia_w": fila["potencia_w"],
        "voltaje_v": fila["voltaje_v"],
        "corriente_ma": fila["corriente_ma"],
        "encendido": fila["encendido"],
    }


def _eventos_en_vivo(nuevas: list[dict], previo: dict) -> list[dict]:
    """`estado_enchufe` si cambió el encendido respecto de lo último guardado, y `lectura` con la más reciente."""
    ahora = datetime.now(UTC)
    eventos: list[dict] = []
    por_dispositivo: dict = {}
    for fila in sorted(nuevas, key=lambda f: f["fecha_hora"]):
        por_dispositivo.setdefault(fila["dispositivo_id"], []).append(fila)
    for dispositivo_id, filas in por_dispositivo.items():
        ultima_fecha, estado = previo.get(dispositivo_id, (None, None))
        for fila in filas:
            if ultima_fecha is not None and fila["fecha_hora"] <= ultima_fecha:
                continue  # lectura atrasada (reenvío): no cambia el estado actual
            if estado is not None and fila["encendido"] != estado and ahora - fila["fecha_hora"] <= VIGENCIA_EN_VIVO:
                eventos.append(
                    {"tipo": "estado_enchufe", "dispositivo_id": str(dispositivo_id),
                     "encendido": fila["encendido"], "fecha_hora": fila["fecha_hora"].isoformat()}
                )
            estado = fila["encendido"]
        if ahora - filas[-1]["fecha_hora"] <= VIGENCIA_EN_VIVO:
            eventos.append(_evento_lectura(filas[-1]))
    return eventos


def guardar_lecturas(db: Session, agente: Agente, datos: LecturasIn) -> tuple[LecturasOut, dict[uuid.UUID, list[dict]]]:
    """Guarda lecturas del hogar del agente. Idempotente: reenviar una lectura no la duplica.

    Devuelve también los eventos en vivo a publicar por WebSocket, por hogar. Normalmente es solo el del agente; con COMPARTIR_ENCHUFES
    (modo de pruebas) las lecturas de un enchufe también se copian a los demás hogares que registraron el mismo ID de Tuya."""
    ids = {l.tuya_id for l in datos.lecturas}
    del_hogar = list(db.scalars(select(Dispositivo).where(Dispositivo.hogar_id == agente.hogar_id, Dispositivo.tuya_id.in_(ids))))
    for d in del_hogar:
        if d.agente_id is None:
            d.agente_id = agente.id  # un enchufe sin agente toma al primero que lo lee: así el caso normal no pide configurar nada
    # Solo cuentan las lecturas de SUS enchufes: si el enchufe está asignado a otro agente, se descartan (lo contrario mezclaría dos fuentes).
    dispositivos = {d.tuya_id: d.id for d in del_hogar if d.agente_id == agente.id}
    ajenas = {l.tuya_id for l in datos.lecturas if l.tuya_id in {d.tuya_id for d in del_hogar} and l.tuya_id not in dispositivos}
    propias = [
        (
            l.tuya_id,
            {
                "dispositivo_id": dispositivos[l.tuya_id],
                "fecha_hora": l.fecha_hora,
                "potencia_w": l.potencia_w,
                "voltaje_v": l.voltaje_v,
                "corriente_ma": l.corriente_ma,
                "encendido": l.encendido,
            },
        )
        for l in datos.lecturas
        if l.tuya_id in dispositivos
    ]
    hogar_de = {d.id: d.hogar_id for d in del_hogar}
    copias: list[dict] = []
    if propias and get_settings().compartir_enchufes:
        gemelos: dict[str, list[Dispositivo]] = {}
        for o in db.scalars(select(Dispositivo).where(Dispositivo.tuya_id.in_(set(dispositivos)), Dispositivo.hogar_id != agente.hogar_id)):
            gemelos.setdefault(o.tuya_id, []).append(o)
            hogar_de[o.id] = o.hogar_id
        copias = [{**fila, "dispositivo_id": o.id} for tuya_id, fila in propias for o in gemelos.get(tuya_id, [])]
    filas = [fila for _, fila in propias]
    todas = filas + copias
    guardadas, nuevas, previo = 0, [], {}
    if todas:
        previo = {
            l.dispositivo_id: (l.fecha_hora, l.encendido)
            for l in db.scalars(
                select(Lectura)
                .ext(distinct_on(Lectura.dispositivo_id))
                .where(Lectura.dispositivo_id.in_({f["dispositivo_id"] for f in todas}))
                .order_by(Lectura.dispositivo_id, Lectura.fecha_hora.desc())
            )
        }
        insertadas = {
            (d, f)
            for d, f in db.execute(
                insert(Lectura).values(todas).on_conflict_do_nothing().returning(Lectura.dispositivo_id, Lectura.fecha_hora)
            )
        }
        nuevas = [f for f in todas if (f["dispositivo_id"], f["fecha_hora"]) in insertadas]
        guardadas = sum(1 for f in nuevas if f["dispositivo_id"] in dispositivos.values())
    db.commit()
    salida = LecturasOut(
        recibidas=len(datos.lecturas),
        guardadas=guardadas,
        duplicadas=len(filas) - guardadas,
        desconocidas=len(datos.lecturas) - len(filas) - sum(1 for l in datos.lecturas if l.tuya_id in ajenas),
        de_otro_agente=sum(1 for l in datos.lecturas if l.tuya_id in ajenas),
    )
    por_hogar: dict[uuid.UUID, list[dict]] = {}
    for evento in _eventos_en_vivo(nuevas, previo) if nuevas else []:
        por_hogar.setdefault(hogar_de[uuid.UUID(evento["dispositivo_id"])], []).append(evento)
    return salida, por_hogar
