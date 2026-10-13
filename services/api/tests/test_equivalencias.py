import importlib.util
import uuid
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from sqlalchemy import insert, select, update

from app.core.database import get_sessionmaker
from app.modules.consumo import equivalencias
from app.modules.consumo.models import Equivalencia
from app.modules.ingesta.models import Lectura
from app.modules.tarifas.models import Tarifa

AHORA = datetime(2026, 10, 13, 15, 0, 0, tzinfo=UTC)


def cargar_seed():
    ruta = Path(__file__).resolve().parents[1] / "seeds" / "equivalencias.py"
    spec = importlib.util.spec_from_file_location("seed_equivalencias", ruta)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    modulo.main()


def textos(costo, precio_kwh=890.0, ahora=AHORA, maximo=2):
    with get_sessionmaker()() as db:
        return [f.texto for f in equivalencias.para(db, costo, precio_kwh, ahora, maximo)]


def test_el_seed_deja_solo_televisor_y_celular_activos_y_es_idempotente(client):
    cargar_seed()
    cargar_seed()
    with get_sessionmaker()() as db:
        filas = {e.nombre: e for e in db.scalars(select(Equivalencia))}
    assert {n for n, e in filas.items() if e.activa} == {"televisor", "celular"}
    assert (filas["televisor"].wh_por_unidad, filas["celular"].wh_por_unidad) == (70.0, 15.0)
    assert filas["hamburguesa"].costo_cop is None and "PENDIENTE" in filas["hamburguesa"].fuente  # sin precio inventado


def test_repetir_el_seed_no_pisa_lo_que_el_equipo_cargo(client):
    cargar_seed()
    with get_sessionmaker()() as db:
        db.execute(update(Equivalencia).where(Equivalencia.nombre == "hamburguesa").values(costo_cop=20000, activa=True, fuente="precio verificado"))
        db.commit()
    cargar_seed()
    with get_sessionmaker()() as db:
        h = db.scalar(select(Equivalencia).where(Equivalencia.nombre == "hamburguesa"))
    assert (float(h.costo_cop), h.activa, h.fuente) == (20000, True, "precio verificado")


def sin_prefijo(frases):
    """Quita "Es como " / "O " y el punto final: el orden cambia según el día, el contenido no."""
    return {f.removeprefix("Es como ").removeprefix("O ").removesuffix(".") for f in frases}


def test_energia_a_mano_con_televisor_y_celular(client):
    cargar_seed()
    # $3.740 a $890/kWh = 4,2022 kWh = 4.202 Wh → 4.202 / 70 = 60 horas de televisor y 4.202 / 15 = 280 cargas de celular
    assert sin_prefijo(textos(3740)) == {"dejar el televisor de la sala prendido 60 horas", "cargar el celular 280 veces"}


def test_la_primera_empieza_con_es_como_y_la_segunda_con_o(client):
    cargar_seed()
    t = textos(3740)
    assert len(t) == 2 and t[0].startswith("Es como ") and t[1].startswith("O ") and all(x.endswith(".") for x in t)


def test_rota_cada_dia(client):
    cargar_seed()
    assert textos(3740, ahora=AHORA)[0] != textos(3740, ahora=AHORA + timedelta(days=1))[0]


def test_singular_plural_y_miles(client):
    cargar_seed()
    # $63 = 70,8 Wh: 1 hora de televisor (70 Wh) y 4 cargas de celular (15 Wh cada una)
    assert sin_prefijo(textos(63)) == {"dejar el televisor de la sala prendido 1 hora", "cargar el celular 4 veces"}
    # $20.000 = 22,47 kWh = 22.472 Wh → 1.498 cargas de celular, con punto de miles
    assert "cargar el celular 1.498 veces" in sin_prefijo(textos(20000))


def test_lo_que_no_llega_a_una_unidad_no_se_muestra(client):
    cargar_seed()
    assert textos(10) == []  # $10 = 11 Wh: ni una carga de celular (15 Wh) ni una hora de televisor (70 Wh)
    assert sin_prefijo(textos(14)) == {"cargar el celular 1 vez"}  # $14 = 15,7 Wh: ya alcanza para 1 carga (en singular)
    assert textos(0) == [] and textos(-5) == [] and textos(None) == []


def test_sin_precio_de_energia_no_calcula_equivalencias_de_energia(client):
    cargar_seed()
    assert textos(3740, precio_kwh=None) == [] and textos(3740, precio_kwh=0) == []


def test_las_de_precio_funcionan_cuando_el_equipo_carga_el_precio(client):
    cargar_seed()
    with get_sessionmaker()() as db:
        db.execute(update(Equivalencia).where(Equivalencia.nombre == "hamburguesa").values(costo_cop=20000, activa=True))
        db.commit()
    assert any(x.endswith("comerse 5 hamburguesas.") for x in textos(100000, precio_kwh=None, maximo=5))  # $100.000 / $20.000


def test_el_resumen_trae_las_equivalencias_de_lo_que_se_gasto_hoy(client, auth, hogar, enchufe):
    cargar_seed()
    with get_sessionmaker()() as db:
        db.add(Tarifa(estrato=3, mes=datetime.now(UTC).date().replace(day=1), cop_kwh_subsistencia="814.63", cop_kwh_sobre_subsistencia="958.38", fuente="prueba"))
        db.execute(
            insert(Lectura),
            [{"dispositivo_id": uuid.UUID(enchufe["id"]), "fecha_hora": datetime.now(UTC) - timedelta(seconds=5 * i), "potencia_w": 1000.0,
              "voltaje_v": 128.0, "corriente_ma": 1, "encendido": True} for i in range(0, 700)],  # ~1 h a 1 kW ≈ 0,97 kWh
        )
        db.commit()
    r = client.get(f"/hogares/{hogar['id']}/resumen", headers=auth).json()
    assert len(r["equivalencias"]) == 2 and r["equivalencias"][0]["texto"].startswith("Es como ")
    assert {e["icono"] for e in r["equivalencias"]} == {"tv", "plug"}


def test_sin_consumo_no_hay_equivalencias(client, auth, hogar, enchufe):
    cargar_seed()
    assert client.get(f"/hogares/{hogar['id']}/resumen", headers=auth).json()["equivalencias"] == []


def test_se_puede_consultar_de_donde_sale_cada_equivalencia(client, auth):
    cargar_seed()
    r = client.get("/equivalencias", headers=auth).json()
    assert [(e["nombre"], e["activa"]) for e in r] == [("celular", True), ("hamburguesa", False), ("leche", False), ("televisor", True)]
    assert "PENDIENTE" in next(e for e in r if e["nombre"] == "leche")["fuente"]
    assert client.get("/equivalencias").status_code == 401


def test_la_api_carga_sola_sus_datos_de_referencia_al_arrancar(client):
    """Lo que hace el arranque: sin tocar la base a mano, las tarifas y las equivalencias quedan cargadas (y repetirlo no cambia nada)."""
    from app import datos_referencia
    from app.modules.tarifas.models import Tarifa

    datos_referencia.cargar_todo()
    datos_referencia.cargar_todo()
    with get_sessionmaker()() as db:
        assert db.query(Tarifa).count() == 6 and db.query(Equivalencia).count() == 4
        assert {e.nombre for e in db.query(Equivalencia).filter(Equivalencia.activa.is_(True))} == {"televisor", "celular"}


def test_si_la_base_falla_el_arranque_no_se_cae(monkeypatch):
    from app import datos_referencia

    def sin_base():
        raise RuntimeError("base no disponible")

    monkeypatch.setattr(datos_referencia, "get_sessionmaker", sin_base)
    datos_referencia.cargar_todo()  # solo lo registra
