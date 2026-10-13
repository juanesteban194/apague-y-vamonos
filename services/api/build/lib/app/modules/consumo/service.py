import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.orm import Session

from app.modules.consumo.costo import costo_de, precio_medio
from app.modules.consumo.energia import (
    BOGOTA,
    HUECO_MAX_S,
    energia_hibrida,
    inicio_dia_bogota,
    inicio_mes_bogota,
)
from app.modules.consumo import equivalencias, semaforo, subsistencia
from app.modules.consumo.schemas import ConsumoOut, DispositivoResumen, PuntoConsumo, EquivalenciaOut, ResumenOut, SemaforoOut, SubsistenciaOut
from app.modules.dispositivos.models import Dispositivo
from app.modules.hogares.models import Hogar
from app.modules.ingesta.models import Lectura
from app.modules.tarifas.models import Tarifa
from app.modules.tarifas.schemas import TarifaOut
from app.modules.tarifas.service import tarifa_vigente


def _mes_siguiente(mes_ini: datetime) -> datetime:
    local = mes_ini.astimezone(BOGOTA)
    anio, mes = (local.year + 1, 1) if local.month == 12 else (local.year, local.month + 1)
    return datetime(anio, mes, 1, tzinfo=BOGOTA).astimezone(UTC)


def precio_del_mes(db: Session, hogar: Hogar, ids: list[uuid.UUID], mes_ini: datetime) -> tuple[Decimal | None, Tarifa | None]:
    """COP/kWh efectivo del mes de `mes_ini`.

    El bloque de subsistencia se aplica a la energía medida de todo el hogar (suma de sus enchufes) y
    el precio resultante se reparte por igual entre dispositivos. Bajo el límite es exactamente la tarifa.
    """
    tarifa = tarifa_vigente(db, hogar.estrato, mes_ini.astimezone(BOGOTA).date())
    if tarifa is None:
        return None, None
    kwh_hogar = sum(energia_hibrida(db, ids, mes_ini, _mes_siguiente(mes_ini), "day").values())
    precio = precio_medio(
        kwh_hogar, float(hogar.limite_subsistencia_kwh), tarifa.cop_kwh_subsistencia, tarifa.cop_kwh_sobre_subsistencia
    )
    return precio, tarifa


def _tarifa_out(tarifa: Tarifa | None, hoy_mes_ini: datetime) -> TarifaOut | None:
    if tarifa is None:
        return None
    return TarifaOut(
        estrato=tarifa.estrato,
        mes=tarifa.mes,
        cop_kwh_subsistencia=float(tarifa.cop_kwh_subsistencia),
        cop_kwh_sobre_subsistencia=float(tarifa.cop_kwh_sobre_subsistencia),
        fuente=tarifa.fuente,
        es_del_mes_actual=tarifa.mes == hoy_mes_ini.astimezone(BOGOTA).date(),
    )


def _ultimas_lecturas(db: Session, ids: list[uuid.UUID]) -> dict[uuid.UUID, Lectura]:
    filas = db.scalars(
        select(Lectura)
        .ext(distinct_on(Lectura.dispositivo_id))
        .where(Lectura.dispositivo_id.in_(ids))
        .order_by(Lectura.dispositivo_id, Lectura.fecha_hora.desc())
    )
    return {l.dispositivo_id: l for l in filas}


def _cop(valor: Decimal | None) -> float | None:
    return None if valor is None else float(valor)


def resumen_hogar(db: Session, hogar: Hogar) -> ResumenOut:
    ahora = datetime.now(UTC)
    mes_ini, hoy_ini = inicio_mes_bogota(ahora), inicio_dia_bogota(ahora)
    dispositivos = list(db.scalars(select(Dispositivo).where(Dispositivo.hogar_id == hogar.id).order_by(Dispositivo.creado_en)))
    ids = [d.id for d in dispositivos]

    por_dia = energia_hibrida(db, ids, mes_ini, ahora, "day")
    clave_hoy = hoy_ini.astimezone(BOGOTA)
    kwh_mes = {d: 0.0 for d in ids}
    kwh_hoy = {d: 0.0 for d in ids}
    for (d, inicio), v in por_dia.items():
        kwh_mes[d] += v
        if inicio == clave_hoy:
            kwh_hoy[d] += v

    # El precio usa el mes completo; para "hoy" y el mes en curso es el mismo mes.
    precio, tarifa = precio_del_mes(db, hogar, ids, mes_ini)
    ultimas = _ultimas_lecturas(db, ids)

    filas = []
    for d in dispositivos:
        u = ultimas.get(d.id)
        filas.append(
            DispositivoResumen(
                id=d.id,
                nombre=d.nombre,
                encendido=u.encendido if u else None,
                potencia_w=u.potencia_w if u else None,
                ultima_lectura=u.fecha_hora if u else None,
                en_linea=bool(u and (ahora - u.fecha_hora).total_seconds() <= HUECO_MAX_S),
                kwh_hoy=kwh_hoy[d.id],
                kwh_mes=kwh_mes[d.id],
                costo_hoy_cop=_cop(costo_de(kwh_hoy[d.id], precio)) if precio else None,
                costo_mes_cop=_cop(costo_de(kwh_mes[d.id], precio)) if precio else None,
            )
        )
    return ResumenOut(
        hogar_id=hogar.id,
        calculado_en=ahora,
        tarifa=_tarifa_out(tarifa, mes_ini),
        kwh_hoy=sum(kwh_hoy.values()),
        kwh_mes=sum(kwh_mes.values()),
        costo_hoy_cop=round(sum(f.costo_hoy_cop for f in filas), 2) if precio else None,
        costo_mes_cop=round(sum(f.costo_mes_cop for f in filas), 2) if precio else None,
        subsistencia=SubsistenciaOut(**vars(subsistencia.calcular(db, hogar, ahora))),
        semaforo=SemaforoOut(**vars(semaforo.calcular(db, hogar, ahora))),
        equivalencias=[
            EquivalenciaOut(texto=f.texto, icono=f.icono)
            for f in equivalencias.para(db, sum(f.costo_hoy_cop for f in filas) if precio else None, float(precio) if precio else None, ahora)
        ],
        dispositivos=filas,
    )


def consumo_dispositivo(db: Session, hogar: Hogar, dispositivo: Dispositivo, periodo: str) -> ConsumoOut:
    ahora = datetime.now(UTC)
    hoy_local = inicio_dia_bogota(ahora).astimezone(BOGOTA)
    if periodo == "dia":
        desde, cubeta, paso, n = hoy_local, "hour", timedelta(hours=1), 24
    elif periodo == "semana":
        desde, cubeta, paso, n = hoy_local - timedelta(days=6), "day", timedelta(days=1), 7
    else:
        desde = inicio_mes_bogota(ahora).astimezone(BOGOTA)
        n = (_mes_siguiente(desde).astimezone(BOGOTA) - desde).days
        cubeta, paso = "day", timedelta(days=1)
    hasta = desde + paso * n

    energia = energia_hibrida(db, [dispositivo.id], desde, hasta, cubeta)
    ids_hogar = list(db.scalars(select(Dispositivo.id).where(Dispositivo.hogar_id == hogar.id)))
    precios: dict[datetime, tuple[Decimal | None, Tarifa | None]] = {}

    serie, total_kwh, total_cop, hay_costo = [], 0.0, Decimal(0), True
    for i in range(n):
        inicio = desde + paso * i
        kwh = energia.get((dispositivo.id, inicio), 0.0)
        mes_ini = inicio_mes_bogota(inicio)
        if mes_ini not in precios:
            precios[mes_ini] = precio_del_mes(db, hogar, ids_hogar, mes_ini)
        precio = precios[mes_ini][0]
        costo = costo_de(kwh, precio) if precio else None
        hay_costo &= costo is not None
        total_kwh += kwh
        total_cop += costo or Decimal(0)
        serie.append(PuntoConsumo(inicio=inicio, kwh=kwh, costo_cop=_cop(costo)))

    tarifa_actual = precios.get(inicio_mes_bogota(ahora), (None, None))[1]
    return ConsumoOut(
        dispositivo_id=dispositivo.id,
        periodo=periodo,
        desde=desde,
        hasta=hasta,
        tarifa_mes=tarifa_actual.mes if tarifa_actual else None,
        kwh_total=total_kwh,
        costo_total_cop=_cop(total_cop) if hay_costo else None,
        serie=serie,
    )
