"""Vinculación del programa del agente con un código y entrega de su configuración (ADR 0008)."""
import logging
import secrets
import time
import uuid
from collections import deque
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import cifrado
from app.core.security import generar_token_agente, hash_token_agente
from app.integrations.tuya_cloud.cliente import ErrorTuyaCloud, cliente_tuya
from app.modules.agentes.schemas import AgenteConCodigoOut, ClavesGuardadasOut, ConfiguracionOut, EnchufeConfigOut, VinculadoOut
from app.modules.dispositivos.models import Dispositivo
from app.modules.hogares.models import Agente, Hogar

log = logging.getLogger("agentes")
VIGENCIA_CODIGO = timedelta(minutes=10)
REINTENTO_CLAVE_S = 3600  # si Tuya no dio la clave de un enchufe, no se vuelve a preguntar en una hora (cada pregunta gasta cuota)
_sin_clave_hasta: dict[str, float] = {}
_motivo_tuya: dict[str, str] = {}


def _hash_codigo(codigo: str) -> str:
    import hashlib

    return hashlib.sha256(codigo.encode()).hexdigest()


def generar_codigo(db: Session, agente: Agente, ahora: datetime | None = None) -> AgenteConCodigoOut:
    """Código nuevo de 6 dígitos (el anterior deja de servir). El código en claro solo se devuelve aquí."""
    ahora = ahora or datetime.now(UTC)
    while True:
        codigo = f"{secrets.randbelow(10**6):06d}"
        hash_ = _hash_codigo(codigo)
        if db.scalar(select(Agente.id).where(Agente.codigo_hash == hash_)) is None:
            break
    agente.codigo_hash = hash_
    agente.codigo_expira_en = ahora + VIGENCIA_CODIGO
    db.commit()
    return AgenteConCodigoOut(id=agente.id, nombre=agente.nombre, codigo=codigo, expira_en=agente.codigo_expira_en)


def crear_con_codigo(db: Session, hogar_id: uuid.UUID, nombre: str) -> AgenteConCodigoOut:
    agente = Agente(hogar_id=hogar_id, nombre=nombre)
    db.add(agente)
    db.flush()
    return generar_codigo(db, agente)


class LimitadorIntentos:
    """Ventana deslizante en memoria: frena a quien pruebe códigos al azar (6 dígitos son un millón de combinaciones)."""

    def __init__(self, ventana_s: float = 60.0):
        self._ventana = ventana_s
        self._marcas: dict[str, deque[float]] = {}

    def permitir(self, clave: str, maximo: int) -> bool:
        ahora = time.monotonic()
        marcas = self._marcas.setdefault(clave, deque())
        while marcas and ahora - marcas[0] > self._ventana:
            marcas.popleft()
        if len(marcas) >= maximo:
            return False
        marcas.append(ahora)
        return True


limitador = LimitadorIntentos()
POR_ORIGEN_POR_MINUTO = 8
EN_TOTAL_POR_MINUTO = 30


def vincular(db: Session, codigo: str, origen: str, ahora: datetime | None = None) -> VinculadoOut:
    if not (limitador.permitir(f"origen:{origen}", POR_ORIGEN_POR_MINUTO) and limitador.permitir("total", EN_TOTAL_POR_MINUTO)):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Hiciste muchos intentos seguidos. Espera un minuto e intenta de nuevo.")
    ahora = ahora or datetime.now(UTC)
    agente = db.scalar(select(Agente).where(Agente.codigo_hash == _hash_codigo(codigo)))
    if agente is None or agente.codigo_expira_en is None or agente.codigo_expira_en < ahora:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese código no es válido o ya venció. Genera uno nuevo en la app.")
    token = generar_token_agente()
    agente.token_hash = hash_token_agente(token)  # si ya tenía otro programa vinculado, ese deja de funcionar
    agente.codigo_hash = None
    agente.codigo_expira_en = None
    db.commit()
    return VinculadoOut(agente_id=agente.id, nombre=agente.nombre, hogar_nombre=db.get(Hogar, agente.hogar_id).nombre, token=token)


def configuracion(db: Session, agente: Agente) -> ConfiguracionOut:
    """Los enchufes asignados a este agente con su clave local descifrada. Solo se entrega a ese agente, por HTTPS."""
    enchufes, sin_clave = [], []
    for d in db.scalars(select(Dispositivo).where(Dispositivo.agente_id == agente.id).order_by(Dispositivo.creado_en)):
        if d.clave_local_cifrada:
            enchufes.append(EnchufeConfigOut(tuya_id=d.tuya_id, nombre=d.nombre, clave_local=cifrado.descifrar(d.clave_local_cifrada)))
        else:
            sin_clave.append(d.tuya_id)
    return ConfiguracionOut(agente_id=agente.id, nombre=agente.nombre, enchufes=enchufes, sin_clave=sin_clave)


def sin_claves(db: Session, agente: Agente) -> ConfiguracionOut:
    ids = list(db.scalars(select(Dispositivo.tuya_id).where(Dispositivo.agente_id == agente.id).order_by(Dispositivo.creado_en)))
    motivo = "al servidor le falta CLAVE_MAESTRA (variable de entorno): no puede guardar claves"
    return ConfiguracionOut(agente_id=agente.id, nombre=agente.nombre, enchufes=[], sin_clave=ids, motivos={i: motivo for i in ids})


def guardar_claves(db: Session, agente: Agente, claves: dict[str, str]) -> ClavesGuardadasOut:
    """El agente sube las claves locales que ya tiene (de su devices.json). Solo se aceptan las de enchufes asignados a ÉL; se guardan cifradas."""
    if not cifrado.disponible():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "El servidor no tiene CLAVE_MAESTRA: no puede guardar claves de enchufes")
    suyos = {d.tuya_id: d for d in db.scalars(select(Dispositivo).where(Dispositivo.agente_id == agente.id, Dispositivo.tuya_id.in_(list(claves))))}
    for tuya_id, d in suyos.items():
        d.clave_local_cifrada = cifrado.cifrar(claves[tuya_id])
    db.commit()
    return ClavesGuardadasOut(guardadas=sorted(suyos), ignoradas=sorted(set(claves) - set(suyos)))


async def completar_claves(db: Session, agente: Agente, config: ConfiguracionOut) -> ConfiguracionOut:
    """A los enchufes del agente que aún no tienen clave guardada se la pide a Tuya Cloud (una vez), la guarda cifrada y la incluye.
    Nunca falla: si no se puede, el enchufe queda en `sin_clave` con su motivo y el agente lo avisa."""
    if not config.sin_clave:
        return config
    if not cifrado.disponible():
        config.motivos = {i: "al servidor le falta CLAVE_MAESTRA" for i in config.sin_clave}
        return config
    if not cliente_tuya.configurado():
        config.motivos = {i: "el servidor no tiene TUYA_ACCESS_ID y TUYA_ACCESS_SECRET; el agente puede subir la clave desde su devices.json" for i in config.sin_clave}
        return config
    pendientes, motivos = [], {}
    for tuya_id in config.sin_clave:
        if _sin_clave_hasta.get(tuya_id, 0) > time.monotonic():
            pendientes.append(tuya_id)
            motivos[tuya_id] = _motivo_tuya.get(tuya_id, "Tuya no la entregó; se vuelve a intentar más tarde")
            continue
        try:
            clave = await cliente_tuya.clave_local(tuya_id)
        except ErrorTuyaCloud as e:
            log.warning("no se pudo obtener la clave local de %s: %s", tuya_id, e)
            _sin_clave_hasta[tuya_id] = time.monotonic() + REINTENTO_CLAVE_S
            _motivo_tuya[tuya_id] = f"Tuya respondió: {e}"
            pendientes.append(tuya_id)
            motivos[tuya_id] = _motivo_tuya[tuya_id]
            continue
        d = db.scalar(select(Dispositivo).where(Dispositivo.tuya_id == tuya_id, Dispositivo.agente_id == agente.id))
        if d is None:
            continue
        d.clave_local_cifrada = cifrado.cifrar(clave)
        db.commit()
        config.enchufes.append(EnchufeConfigOut(tuya_id=tuya_id, nombre=d.nombre, clave_local=clave))
    config.sin_clave = pendientes
    config.motivos = motivos
    return config
