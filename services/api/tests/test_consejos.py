import uuid
from datetime import UTC, date, datetime, timedelta

from pytest import approx
from sqlalchemy import insert

from app.core.database import get_sessionmaker
from app.modules.consumo import consejos
from app.modules.hogares.models import Hogar
from app.modules.ingesta.models import Lectura
from app.modules.tarifas.models import Tarifa

from .conftest import registrar_y_entrar

AHORA = datetime(2026, 10, 13, 15, 0, 0, tzinfo=UTC)  # 10:00 en Bogotá


def aparato(client, auth, hogar, nombre, tuya):
    r = client.post(f"/hogares/{hogar['id']}/dispositivos", json={"tuya_id": tuya, "nombre": nombre}, headers=auth)
    assert r.status_code == 201
    return uuid.UUID(r.json()["id"])


def sembrar(dispositivo_id, vatios, dias=3):
    """Una lectura por minuto, constante, durante `dias` días hasta AHORA."""
    inicio = AHORA - timedelta(days=dias)
    n = dias * 24 * 60
    with get_sessionmaker()() as db:
        db.execute(
            insert(Lectura),
            [{"dispositivo_id": dispositivo_id, "fecha_hora": inicio + timedelta(minutes=i), "potencia_w": vatios, "voltaje_v": 128.0, "corriente_ma": 1, "encendido": True} for i in range(n + 1)],
        )
        db.commit()


def tarifa():
    with get_sessionmaker()() as db:
        db.add(Tarifa(estrato=3, mes=date(2026, 10, 1), cop_kwh_subsistencia="814.63", cop_kwh_sobre_subsistencia="958.38", fuente="prueba"))
        db.commit()


def generar(hogar):
    with get_sessionmaker()() as db:
        return {c.id.split("-")[0] + ("-" + str(c.dispositivo_id) if c.dispositivo_id else ""): c for c in consejos.generar(db, db.get(Hogar, uuid.UUID(hogar["id"])), AHORA)}


def tipos(hogar):
    with get_sessionmaker()() as db:
        return [c.tipo for c in consejos.generar(db, db.get(Hogar, uuid.UUID(hogar["id"])), AHORA)]


def test_sin_nada_pide_primero_lo_que_falta_para_comparar_con_el_promedio(client, auth, hogar):
    with get_sessionmaker()() as db:
        ids = [c.id for c in consejos.generar(db, db.get(Hogar, uuid.UUID(hogar["id"])), AHORA)]
    assert ids == ["completar-historial", "completar-enchufe"]


def test_con_historial_pero_sin_medidor_pide_la_lectura(client, auth, hogar, enchufe):
    cuerpo = {"meses": [{"mes": f"2026-0{m}-01", "kwh": 180} for m in (3, 4, 5)]}
    client.put(f"/hogares/{hogar['id']}/historial-consumo", json=cuerpo, headers=auth)
    with get_sessionmaker()() as db:
        ids = [c.id for c in consejos.generar(db, db.get(Hogar, uuid.UUID(hogar["id"])), AHORA)]
    assert ids == ["completar-medidor"]


def test_va_por_encima_del_promedio_lo_dice(client, auth, hogar, enchufe):
    tarifa()
    client.put(f"/hogares/{hogar['id']}/historial-consumo", json={"meses": [{"mes": f"2026-0{m}-01", "kwh": 150} for m in (3, 4, 5)]}, headers=auth)
    for lectura, fecha in ((1000, "2026-10-01"), (1090, "2026-10-13")):  # 90/12×31 = 232 kWh contra 150
        client.post(f"/hogares/{hogar['id']}/lecturas-medidor", json={"lectura_kwh": lectura, "fecha": fecha}, headers=auth)
    c = [x for x in generar(hogar).values() if x.tipo == "sobre_promedio"]
    assert len(c) == 1 and "más que su promedio" in c[0].mensaje


def montar_casa(client, auth, hogar):
    tarifa()
    nevera = aparato(client, auth, hogar, "Nevera", "tuya-nevera")
    tele = aparato(client, auth, hogar, "Televisor", "tuya-tele")
    sembrar(nevera, 100)
    sembrar(tele, 200)
    return nevera, tele


def test_dice_cual_aparato_gasta_mas_con_su_porcentaje(client, auth, hogar):
    nevera, tele = montar_casa(client, auth, hogar)
    c = next(x for x in generar(hogar).values() if x.tipo == "mayor_gasto")
    assert c.dispositivo_id == tele and "Televisor es lo que más gasta" in c.titulo and "67 %" in c.mensaje  # 200 de 300 W


def test_sugiere_apagar_de_noche_el_televisor_con_su_ahorro_medido(client, auth, hogar):
    nevera, tele = montar_casa(client, auth, hogar)
    c = next(x for x in generar(hogar).values() if x.tipo == "rutina")
    assert c.dispositivo_id == tele and c.accion == "rutina"
    # 200 W × 6 h = 1,2 kWh por noche × 30 noches × $814,63
    assert c.ahorro_cop_mes == approx(1.2 * 30 * 814.63, abs=1)
    assert "11 p. m. y las 5 a. m." in c.mensaje


def test_nunca_sugiere_apagar_la_nevera_de_noche(client, auth, hogar):
    montar_casa(client, auth, hogar)
    assert all(c.dispositivo_id is None or "Nevera" not in c.titulo for c in generar(hogar).values() if c.tipo == "rutina")
    # y tampoco con otro nombre o acentos: un "Refrigerador" o "Nevecón" en el tipo de aparato
    with get_sessionmaker()() as db:
        from app.modules.dispositivos.models import Dispositivo
        d = Dispositivo(hogar_id=uuid.UUID(hogar["id"]), tuya_id="x", nombre="Cocina", tipo_aparato="Nevecón")
        assert consejos._es(d, consejos.SIEMPRE_PRENDIDOS)


def test_ofrece_el_simulador_para_la_nevera_con_lo_que_mide(client, auth, hogar):
    nevera, _ = montar_casa(client, auth, hogar)
    c = next(x for x in generar(hogar).values() if x.tipo == "retiq")
    assert c.dispositivo_id == nevera and c.accion == "simulador" and "¿Le conviene cambiar Nevera?" == c.titulo
    assert c.consumo_kwh_mes == approx(100 / 1000 * 24 * 30, abs=0.1)  # 72 kWh al mes medidos


def test_con_menos_de_dos_dias_de_datos_no_extrapola(client, auth, hogar):
    tarifa()
    aparato_ = aparato(client, auth, hogar, "Televisor", "t1")
    sembrar(aparato_, 200, dias=1)
    assert "rutina" not in tipos(hogar) and "retiq" not in tipos(hogar) and "mayor_gasto" not in tipos(hogar)


def test_sin_tarifa_no_inventa_pesos(client, auth, hogar):
    nevera = aparato(client, auth, hogar, "Nevera", "tuya-n")
    tele = aparato(client, auth, hogar, "Televisor", "tuya-t")
    sembrar(nevera, 100)
    sembrar(tele, 200)
    assert {"mayor_gasto", "rutina", "retiq"}.isdisjoint(tipos(hogar))


def test_endpoint_y_permisos(client, auth, hogar):
    r = client.get(f"/hogares/{hogar['id']}/consejos", headers=auth)
    assert r.status_code == 200 and r.json()[0]["id"] == "completar-historial" and r.json()[0]["accion"] == "historial"
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    assert client.get(f"/hogares/{hogar['id']}/consejos", headers=otro).status_code == 403
    assert client.get(f"/hogares/{hogar['id']}/consejos").status_code == 401
