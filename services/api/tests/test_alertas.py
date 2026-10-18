import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import insert, select, update

from app.core.database import get_sessionmaker
from app.modules.alertas import notificar, reglas, service
from app.modules.alertas.models import Alerta
from app.modules.hogares.models import Hogar
from app.modules.ingesta.models import Lectura
from app.modules.tarifas.models import Tarifa

from .conftest import registrar_y_entrar

AHORA = datetime(2026, 10, 13, 15, 0, 0, tzinfo=UTC)


def lecturas(dispositivo_id, desde, hasta, vatios=1000.0, encendido=True, cada=30):
    """Una lectura cada `cada` s entre `desde` y `hasta` (ambos incluidos)."""
    n = int((hasta - desde).total_seconds() // cada) + 1
    with get_sessionmaker()() as db:
        db.execute(
            insert(Lectura),
            [{"dispositivo_id": dispositivo_id, "fecha_hora": desde + timedelta(seconds=cada * i), "potencia_w": vatios,
              "voltaje_v": 128.0, "corriente_ma": 1, "encendido": encendido} for i in range(n)],
        )
        db.commit()


def marcar_alto_riesgo(client, auth, hogar, enchufe, minutos=30):
    r = client.patch(f"/hogares/{hogar['id']}/dispositivos/{enchufe['id']}", json={"alto_riesgo": True, "umbral_minutos_encendido": minutos}, headers=auth)
    assert r.status_code == 200


def evaluar(regla, ahora=AHORA):
    with get_sessionmaker()() as db:
        return [(a.tipo, a.nivel, a.titulo, a.mensaje) for a in regla(db, ahora)]


def todas():
    with get_sessionmaker()() as db:
        return list(db.scalars(select(Alerta).order_by(Alerta.fecha)))


def tarifa_de_octubre():
    with get_sessionmaker()() as db:
        db.add(Tarifa(estrato=3, mes=date(2026, 10, 1), cop_kwh_subsistencia="814.63", cop_kwh_sobre_subsistencia="958.38", fuente="prueba"))
        db.commit()


# --- HU-02: dispositivo de alto riesgo -----------------------------------------------------------------------------------
def test_avisa_cuando_pasa_el_umbral_con_lo_que_cuesta_cada_hora(client, auth, hogar, enchufe):
    marcar_alto_riesgo(client, auth, hogar, enchufe, minutos=30)
    tarifa_de_octubre()
    d = uuid.UUID(enchufe["id"])
    lecturas(d, AHORA - timedelta(minutes=40), AHORA - timedelta(seconds=10), vatios=1000)
    (tipo, nivel, titulo, mensaje), = evaluar(reglas.evaluar_alto_riesgo)
    assert (tipo, nivel) == ("alto_riesgo", "rojo")
    assert titulo == "Ventilador lleva 40 minutos sin apagarse"
    assert "Ya superó el tiempo que elegiste (30 minutos)" in mensaje
    assert "unos $815 por hora" in mensaje  # 1 kW × $814,63


def test_no_avisa_antes_del_umbral_ni_si_no_es_de_alto_riesgo(client, auth, hogar, enchufe):
    d = uuid.UUID(enchufe["id"])
    lecturas(d, AHORA - timedelta(minutes=40), AHORA - timedelta(seconds=10))
    assert evaluar(reglas.evaluar_alto_riesgo) == []  # no está marcado de alto riesgo
    marcar_alto_riesgo(client, auth, hogar, enchufe, minutos=60)
    assert evaluar(reglas.evaluar_alto_riesgo) == []  # lleva 40 min y el umbral es 60


def test_un_aviso_por_episodio_y_otro_si_se_apaga_y_se_vuelve_a_prender(client, auth, hogar, enchufe):
    marcar_alto_riesgo(client, auth, hogar, enchufe, minutos=30)
    d = uuid.UUID(enchufe["id"])
    lecturas(d, AHORA - timedelta(minutes=40), AHORA - timedelta(seconds=10))
    assert len(evaluar(reglas.evaluar_alto_riesgo)) == 1
    assert evaluar(reglas.evaluar_alto_riesgo, AHORA + timedelta(seconds=20)) == []  # mismo episodio: no repite
    # se apaga 5 min y vuelve a prenderse otros 35 min
    lecturas(d, AHORA + timedelta(seconds=30), AHORA + timedelta(minutes=5), vatios=0, encendido=False)
    lecturas(d, AHORA + timedelta(minutes=5, seconds=30), AHORA + timedelta(minutes=41), vatios=1000)
    assert len(evaluar(reglas.evaluar_alto_riesgo, AHORA + timedelta(minutes=41, seconds=5))) == 1
    assert len(todas()) == 2


def test_sin_datos_recientes_o_sin_consumo_no_avisa(client, auth, hogar, enchufe):
    marcar_alto_riesgo(client, auth, hogar, enchufe, minutos=30)
    d = uuid.UUID(enchufe["id"])
    lecturas(d, AHORA - timedelta(minutes=90), AHORA - timedelta(minutes=50))  # el agente dejó de enviar
    assert evaluar(reglas.evaluar_alto_riesgo) == []
    lecturas(d, AHORA - timedelta(minutes=40), AHORA - timedelta(seconds=10), vatios=0)  # relé prendido pero sin consumir
    assert evaluar(reglas.evaluar_alto_riesgo) == []


def test_sin_tarifa_el_aviso_no_inventa_el_ahorro(client, auth, hogar, enchufe):
    marcar_alto_riesgo(client, auth, hogar, enchufe, minutos=30)
    lecturas(uuid.UUID(enchufe["id"]), AHORA - timedelta(minutes=40), AHORA - timedelta(seconds=10))
    (_, _, _, mensaje), = evaluar(reglas.evaluar_alto_riesgo)
    assert "ahorra" not in mensaje and "$" not in mensaje


def test_duracion_en_texto():
    assert [reglas.duracion_en_texto(m) for m in (1, 45, 60, 125, 361, 363)] == ["1 minuto", "45 minutos", "1 hora", "2 horas y 5 minutos", "6 horas", "6 horas"]


# --- sensibilidad --------------------------------------------------------------------------------------------------------
def test_la_sensibilidad_decide_que_niveles_llegan(client, auth, hogar):
    with get_sessionmaker()() as db:
        niveles = {}
        for sens in ("pocos", "normal", "todos"):
            service.guardar_sensibilidad(db, uuid.UUID(hogar["id"]), sens)
            niveles[sens] = {n for n in ("rojo", "amarillo", "verde") if service.crear(db, uuid.UUID(hogar["id"]), f"t-{sens}", n, "t", "m")}
    assert niveles == {"pocos": {"rojo"}, "normal": {"rojo", "amarillo"}, "todos": {"rojo", "amarillo", "verde"}}


def test_preferencias_por_la_api(client, auth, hogar):
    assert client.get(f"/hogares/{hogar['id']}/preferencias-alertas", headers=auth).json() == {"sensibilidad": "normal"}
    assert client.put(f"/hogares/{hogar['id']}/preferencias-alertas", json={"sensibilidad": "todos"}, headers=auth).json() == {"sensibilidad": "todos"}
    assert client.get(f"/hogares/{hogar['id']}/preferencias-alertas", headers=auth).json() == {"sensibilidad": "todos"}
    assert client.put(f"/hogares/{hogar['id']}/preferencias-alertas", json={"sensibilidad": "mil"}, headers=auth).status_code == 422


# --- HU-07: línea de subsistencia ----------------------------------------------------------------------------------------
def fijar_limite(kwh):
    with get_sessionmaker()() as db:
        db.execute(update(Hogar).values(limite_subsistencia_kwh=kwh))
        db.commit()


def test_subsistencia_por_enchufes_avisa_al_80_y_al_100(client, auth, hogar, enchufe):
    fijar_limite(1.0)  # 1 kWh de límite para probar con poco consumo
    d = uuid.UUID(enchufe["id"])
    inicio = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)
    lecturas(d, inicio, inicio + timedelta(minutes=48), vatios=1000, cada=60)  # 0,8 kWh
    (tipo, nivel, titulo, mensaje), = evaluar(reglas.evaluar_subsistencia)
    assert (tipo, nivel, titulo) == ("subsistencia", "amarillo", "Te acercas a la línea de subsistencia")
    assert "80 %" in mensaje and "solo lo que miden tus enchufes" in mensaje
    assert evaluar(reglas.evaluar_subsistencia) == []  # una vez por mes y nivel
    lecturas(d, inicio + timedelta(minutes=49), inicio + timedelta(minutes=70), vatios=1000, cada=60)  # pasa de 1 kWh
    (_, nivel2, titulo2, _), = evaluar(reglas.evaluar_subsistencia)
    assert (nivel2, titulo2) == ("rojo", "Pasaste la línea de subsistencia")


def test_subsistencia_bajo_el_80_no_avisa(client, auth, hogar, enchufe):
    fijar_limite(1.0)
    inicio = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)
    lecturas(uuid.UUID(enchufe["id"]), inicio, inicio + timedelta(minutes=30), vatios=1000, cada=60)  # 0,5 kWh
    assert evaluar(reglas.evaluar_subsistencia) == []


def test_subsistencia_usa_el_medidor_cuando_hay_lecturas(client, auth, hogar):
    h = hogar["id"]
    api = lambda lectura, fecha: client.post(f"/hogares/{h}/lecturas-medidor", json={"lectura_kwh": lectura, "fecha": fecha}, headers=auth)
    assert api(1000, "2026-10-01").status_code == 201
    assert api(1110, "2026-10-12").status_code == 201  # 110 kWh de 130 = 85 %
    (_, nivel, _, mensaje), = evaluar(reglas.evaluar_subsistencia)
    assert nivel == "amarillo" and "85 %" in mensaje and "enchufes" not in mensaje  # con medidor no aclara que es parcial
    assert api(1135, "2026-10-13").status_code == 201  # 135 kWh: pasó el límite
    assert evaluar(reglas.evaluar_subsistencia)[0][1] == "rojo"


def test_lecturas_del_medidor_validan_y_se_listan(client, auth, hogar):
    h = hogar["id"]
    client.post(f"/hogares/{h}/lecturas-medidor", json={"lectura_kwh": 500, "fecha": "2026-10-01"}, headers=auth)
    malo = client.post(f"/hogares/{h}/lecturas-medidor", json={"lectura_kwh": 400, "fecha": "2026-10-05"}, headers=auth)
    assert malo.status_code == 422 and "menor que la anterior" in malo.json()["detail"]
    assert client.post(f"/hogares/{h}/lecturas-medidor", json={"lectura_kwh": -1}, headers=auth).status_code == 422
    assert [x["lectura_kwh"] for x in client.get(f"/hogares/{h}/lecturas-medidor", headers=auth).json()] == [500]
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    assert client.get(f"/hogares/{h}/lecturas-medidor", headers=otro).status_code == 403


def test_el_resumen_trae_la_subsistencia(client, auth, hogar, enchufe):
    r = client.get(f"/hogares/{hogar['id']}/resumen", headers=auth).json()["subsistencia"]
    assert r["limite_kwh"] == 130 and r["fuente"] == "enchufes" and r["nivel"] == "verde" and r["porcentaje"] == 0


# --- endpoints de avisos -------------------------------------------------------------------------------------------------
def crear_avisos(hogar_id, enchufe_id):
    with get_sessionmaker()() as db:
        a = service.crear(db, uuid.UUID(hogar_id), "alto_riesgo", "rojo", "Primero", "m1", uuid.UUID(enchufe_id), ahora=AHORA)
        b = service.crear(db, uuid.UUID(hogar_id), "subsistencia", "amarillo", "Segundo", "m2", ahora=AHORA + timedelta(minutes=1))
        return str(a.id), str(b.id)


def test_listar_leer_y_filtrar_avisos(client, auth, hogar, enchufe):
    a, b = crear_avisos(hogar["id"], enchufe["id"])
    lista = client.get(f"/hogares/{hogar['id']}/alertas", headers=auth).json()
    assert [x["titulo"] for x in lista] == ["Segundo", "Primero"]  # lo más nuevo primero
    assert lista[1]["dispositivo_nombre"] == "Ventilador" and lista[0]["dispositivo_nombre"] is None and lista[0]["leida"] is False
    assert client.post(f"/hogares/{hogar['id']}/alertas/{a}/leida", headers=auth).status_code == 204
    no_leidas = client.get(f"/hogares/{hogar['id']}/alertas", params={"solo_no_leidas": True}, headers=auth).json()
    assert [x["id"] for x in no_leidas] == [b]
    assert client.post(f"/hogares/{hogar['id']}/alertas/leidas", headers=auth).status_code == 204
    assert client.get(f"/hogares/{hogar['id']}/alertas", params={"solo_no_leidas": True}, headers=auth).json() == []
    assert client.post(f"/hogares/{hogar['id']}/alertas/{uuid.uuid4()}/leida", headers=auth).status_code == 404


def test_otro_usuario_no_ve_ni_marca_avisos_ajenos(client, auth, hogar, enchufe):
    a, _ = crear_avisos(hogar["id"], enchufe["id"])
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    assert client.get(f"/hogares/{hogar['id']}/alertas", headers=otro).status_code == 403
    assert client.post(f"/hogares/{hogar['id']}/alertas/{a}/leida", headers=otro).status_code == 403
    assert client.get(f"/hogares/{hogar['id']}/alertas").status_code == 401


# --- entrega en vivo -------------------------------------------------------------------------------------------------------
def test_el_aviso_nuevo_llega_a_la_app_abierta_por_websocket(client, auth, hogar, enchufe):
    marcar_alto_riesgo(client, auth, hogar, enchufe, minutos=30)
    lecturas(uuid.UUID(enchufe["id"]), AHORA - timedelta(minutes=40), AHORA - timedelta(seconds=10))
    with client.websocket_connect(f"/ws/hogares/{hogar['id']}") as ws:
        ws.send_json({"token": auth["Authorization"].removeprefix("Bearer ")})
        assert ws.receive_json() == {"tipo": "conectado"}
        with get_sessionmaker()() as db:  # la tarea de cada minuto corre en otro hilo: aquí se simula llamándola directamente
            assert notificar.evaluar_y_notificar(db, AHORA) == 1
        ev = ws.receive_json()
    assert ev["tipo"] == "alerta" and ev["nivel"] == "rojo" and ev["alerta_tipo"] == "alto_riesgo"
    assert ev["dispositivo_id"] == enchufe["id"] and "Ventilador" in ev["titulo"]
