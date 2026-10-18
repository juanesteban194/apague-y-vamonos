"""Reglas que generan avisos. Cada una devuelve las alertas NUEVAS que creó (el llamador las notifica)."""
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.alertas import service
from app.modules.alertas.models import Alerta
from app.modules.consumo import subsistencia
from app.modules.consumo.energia import HUECO_MAX_S, inicio_mes_bogota
from app.modules.consumo.service import precio_del_mes
from app.modules.dispositivos.models import Dispositivo
from app.modules.hogares.models import Hogar
from app.modules.ingesta.models import Lectura

ACTUAL = timedelta(seconds=HUECO_MAX_S)  # una lectura más vieja que esto no sirve para decir "está prendido ahora"


def duracion_en_texto(minutos: float) -> str:
    minutos = int(minutos)
    if minutos < 60:
        return "1 minuto" if minutos == 1 else f"{minutos} minutos"
    horas, resto = divmod(minutos, 60)
    unidad = "hora" if horas == 1 else "horas"
    return f"{horas} {unidad}" if resto < 5 else f"{horas} {unidad} y {resto} minutos"


def _pesos(valor: float) -> str:
    return "$" + f"{round(valor):,}".replace(",", ".")


def evaluar_alto_riesgo(db: Session, ahora: datetime) -> list[Alerta]:
    """HU-02: un dispositivo marcado de alto riesgo lleva encendido (y consumiendo) más minutos que el umbral que definió la persona.
    Se avisa una vez por episodio de encendido; si se apaga y vuelve a prenderse es otro episodio."""
    creadas: list[Alerta] = []
    for d in db.scalars(select(Dispositivo).where(Dispositivo.alto_riesgo.is_(True), Dispositivo.umbral_minutos_encendido.is_not(None))):
        ultima = db.scalar(select(Lectura).where(Lectura.dispositivo_id == d.id).order_by(Lectura.fecha_hora.desc()).limit(1))
        if ultima is None or ahora - ultima.fecha_hora > ACTUAL or not ultima.encendido or ultima.potencia_w <= 0:
            continue  # sin datos recientes, apagado, o con el relé prendido pero sin consumir (nada que avisar)
        ultimo_apagado = db.scalar(select(func.max(Lectura.fecha_hora)).where(Lectura.dispositivo_id == d.id, Lectura.encendido.is_(False)))
        consulta = select(func.min(Lectura.fecha_hora)).where(Lectura.dispositivo_id == d.id)
        if ultimo_apagado is not None:
            consulta = consulta.where(Lectura.fecha_hora > ultimo_apagado)
        encendido_desde = db.scalar(consulta)
        minutos = (ahora - encendido_desde).total_seconds() / 60
        if minutos < d.umbral_minutos_encendido:
            continue
        hogar = db.get(Hogar, d.hogar_id)
        ids = list(db.scalars(select(Dispositivo.id).where(Dispositivo.hogar_id == hogar.id)))
        precio = precio_del_mes(db, hogar, ids, inicio_mes_bogota(ahora))[0]
        cuerpo = f"Superó el tiempo que usted definió ({duracion_en_texto(d.umbral_minutos_encendido)})."
        if precio:
            cuerpo += f" Si no hay nadie, apagarlo le ahorra unos {_pesos(ultima.potencia_w / 1000 * float(precio))} por hora."
        alerta = service.crear(
            db, hogar.id, "alto_riesgo", "rojo", f"{d.nombre} lleva {duracion_en_texto(minutos)} prendido", cuerpo,
            dispositivo_id=d.id, sin_repetir_desde=encendido_desde, ahora=ahora,
        )
        if alerta:
            creadas.append(alerta)
    return creadas


def evaluar_subsistencia(db: Session, ahora: datetime) -> list[Alerta]:
    """HU-07: aviso al llegar al 80 % del límite mensual de subsistencia y otro al pasarlo. Una vez por mes y nivel."""
    creadas: list[Alerta] = []
    mes_ini = inicio_mes_bogota(ahora)
    for hogar in db.scalars(select(Hogar)):
        s = subsistencia.calcular(db, hogar, ahora)
        if s.nivel == "verde":
            continue
        nota = "" if s.fuente == "medidor" else " Cuenta solo lo que miden sus enchufes."
        if s.nivel == "amarillo":
            titulo = "Se acerca a la línea de subsistencia"
            cuerpo = f"Ya va en el {round(s.porcentaje * 100)} % de la energía que EPM le subsidia este mes. Pasada esa línea, la energía le sale más cara.{nota}"
        else:
            titulo = "Ya pasó la línea de subsistencia"
            cuerpo = f"Desde aquí la energía que gaste este mes le cuesta más porque ya no tiene subsidio.{nota}"
        alerta = service.crear(db, hogar.id, "subsistencia", s.nivel, titulo, cuerpo, sin_repetir_desde=mes_ini, ahora=ahora)
        if alerta:
            creadas.append(alerta)
    return creadas


REGLAS = (evaluar_alto_riesgo, evaluar_subsistencia)


def evaluar_todo(db: Session, ahora: datetime | None = None) -> list[Alerta]:
    ahora = ahora or datetime.now(UTC)
    nuevas: list[Alerta] = []
    for regla in REGLAS:
        nuevas += regla(db, ahora)
    return nuevas


def evaluar_prepago(db: Session, ahora: datetime) -> list[Alerta]:
    """HU-03: alerta roja cuando el saldo prepago alcanza para menos de 48 h. Una vez por registro de saldo."""
    from app.modules.prepago import service as prepago
    from app.modules.prepago.models import PrepagoSaldo

    creadas: list[Alerta] = []
    for hogar_id in db.scalars(select(PrepagoSaldo.hogar_id).distinct()):
        p = prepago.estado(db, hogar_id, ahora)
        if p.nivel != "rojo":
            continue
        horas = max(0, int(p.dias_restantes * 24))
        titulo = "Su saldo prepago se está acabando"
        cuerpo = (
            f"Al ritmo de los últimos 3 días le alcanza para unas {horas} horas. Recargue para no quedarse sin energía."
            if horas > 0
            else "Al ritmo de los últimos 3 días el saldo ya debería haberse acabado. Revise su medidor y recargue."
        )
        alerta = service.crear(db, hogar_id, "prepago", "rojo", titulo, cuerpo, sin_repetir_desde=p.registrado_en, ahora=ahora)
        if alerta:
            creadas.append(alerta)
    return creadas


REGLAS = (evaluar_alto_riesgo, evaluar_subsistencia, evaluar_prepago)
