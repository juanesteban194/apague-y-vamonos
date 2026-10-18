from datetime import UTC, datetime, timedelta

from app.core.database import get_sessionmaker
from app.modules.alertas import anomalias

from .test_alertas import AHORA, lecturas, tarifa_de_octubre, todas


def evaluar(ahora=AHORA):
    with get_sessionmaker()() as db:
        return [(a.tipo, a.nivel, a.titulo, a.mensaje) for a in anomalias.evaluar_consumo_anomalo(db, ahora)]


def dia(dispositivo_id, dias_atras, kwh):
    """Un día de `kwh` kWh: 10 horas a la potencia que da esa energía, desde las 8:00 de Bogotá. dias_atras=1 es ayer (AHORA es el 13/oct 10:00)."""
    inicio = datetime(2026, 10, 13, 13, 0, tzinfo=UTC) - timedelta(days=dias_atras)
    lecturas(dispositivo_id, inicio, inicio + timedelta(hours=10), vatios=kwh * 100)


def semana(enchufe, base, ayer, base_dias=(2, 3, 4, 5, 6, 7, 8)):
    for n in base_dias:
        dia(enchufe["id"], n, base)
    dia(enchufe["id"], 1, ayer)


def preferencia(client, auth, hogar, sensibilidad):
    r = client.put(f"/hogares/{hogar['id']}/preferencias-alertas", json={"sensibilidad": sensibilidad}, headers=auth)
    assert r.status_code == 200


def test_avisa_cuando_ayer_gasto_20_por_ciento_o_mas_que_lo_normal(client, auth, hogar, enchufe):
    tarifa_de_octubre()
    semana(enchufe, base=1.0, ayer=1.3)
    (tipo, nivel, titulo, mensaje), = evaluar()
    assert (tipo, nivel) == ("consumo_anomalo", "amarillo")
    assert titulo == f"{enchufe['nombre']} gastó ayer 30 % más de lo normal"
    assert "Ayer gastó 30 % más que en un día normal." in mensaje
    assert "unos $7.332 más al mes" in mensaje  # 0,3 kWh × 30 días × $814,63


def test_mas_de_50_por_ciento_es_rojo(client, auth, hogar, enchufe):
    semana(enchufe, base=1.0, ayer=1.6)
    assert [n for _, n, _, _ in evaluar()] == ["rojo"]


def test_sin_tarifa_avisa_sin_pesos(client, auth, hogar, enchufe):
    semana(enchufe, base=1.0, ayer=1.3)
    (_, _, _, mensaje), = evaluar()
    assert "$" not in mensaje


def test_una_subida_pequena_no_avisa(client, auth, hogar, enchufe):
    semana(enchufe, base=1.0, ayer=1.05)
    assert evaluar() == []


def test_gastar_menos_no_es_un_problema(client, auth, hogar, enchufe):
    semana(enchufe, base=1.0, ayer=0.5)
    assert evaluar() == []


def test_con_menos_de_3_dias_de_historia_no_sabe_que_es_normal(client, auth, hogar, enchufe):
    semana(enchufe, base=1.0, ayer=2.0, base_dias=(2, 3))
    assert evaluar() == []


def test_los_dias_con_el_aparato_apagado_no_cuentan_como_historia(client, auth, hogar, enchufe):
    for n in (2, 3, 4, 5):
        dia(enchufe["id"], n, 0.0)  # enchufado pero sin consumir
    for n in (6, 7):
        dia(enchufe["id"], n, 1.0)
    dia(enchufe["id"], 1, 2.0)
    assert evaluar() == []  # solo 2 días con consumo de verdad


def test_un_dia_raro_en_la_historia_no_tuerce_lo_normal(client, auth, hogar, enchufe):
    for n, kwh in zip((2, 3, 4, 5, 6, 7, 8), (1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 6.0)):
        dia(enchufe["id"], n, kwh)
    dia(enchufe["id"], 1, 1.3)
    (_, nivel, titulo, _), = evaluar()  # la mediana sigue en 1,0: 30 %, no se diluye por el día de 6
    assert nivel == "amarillo" and "30 %" in titulo


def test_sin_consumo_ayer_no_avisa(client, auth, hogar, enchufe):
    for n in (2, 3, 4, 5):
        dia(enchufe["id"], n, 1.0)
    assert evaluar() == []


def test_un_solo_aviso_por_dia_aunque_la_tarea_corra_cada_hora(client, auth, hogar, enchufe):
    semana(enchufe, base=1.0, ayer=1.3)
    assert len(evaluar()) == 1
    assert evaluar(AHORA + timedelta(hours=2)) == []
    assert len(todas()) == 1


def test_la_sensibilidad_decide_quien_recibe_cada_nivel(client, auth, hogar, enchufe):
    semana(enchufe, base=1.0, ayer=1.3)  # amarillo
    preferencia(client, auth, hogar, "pocos")
    assert evaluar() == []
    preferencia(client, auth, hogar, "normal")
    assert len(evaluar()) == 1


def test_con_todos_tambien_avisa_de_un_cambio_pequeno(client, auth, hogar, enchufe):
    semana(enchufe, base=1.0, ayer=1.12)  # verde: 12 %
    assert evaluar() == []  # en "normal" no llega
    preferencia(client, auth, hogar, "todos")
    (_, nivel, titulo, _), = evaluar()
    assert nivel == "verde" and "12 %" in titulo


def test_cada_aparato_se_compara_con_si_mismo(client, auth, hogar, enchufe):
    otro = client.post(f"/hogares/{hogar['id']}/dispositivos", json={"tuya_id": "otro1", "nombre": "Lámpara"}, headers=auth).json()
    semana(enchufe, base=1.0, ayer=1.0)  # la nevera, igual que siempre
    semana(otro, base=0.2, ayer=0.4)  # la lámpara se duplicó
    (_, nivel, titulo, _), = evaluar()
    assert titulo.startswith("Lámpara") and nivel == "rojo"


def test_la_tarea_de_cada_hora_crea_el_aviso(client, auth, hogar, enchufe):
    from app.jobs import tareas

    semana(enchufe, base=1.0, ayer=1.3)
    tareas.cada_hora(AHORA)
    assert [(a.tipo, a.nivel) for a in todas()] == [("consumo_anomalo", "amarillo")]
