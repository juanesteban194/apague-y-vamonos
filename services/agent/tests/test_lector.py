import pytest

from agent.collector.escalas import a_lectura
from agent.collector.lector import ErrorEnchufe, LectorEnchufe

DPS = {"1": True, "17": 3, "18": 221, "19": 265, "20": 1281}


def test_escalas_confirmadas():
    # ventilador: Smart Life mostró 221 mA, 26,6 W, 128,1 V (ADR 0001)
    assert a_lectura("id1", DPS, "2026-10-12T00:00:00+00:00") == {
        "tuya_id": "id1", "fecha_hora": "2026-10-12T00:00:00+00:00",
        "potencia_w": 26.5, "voltaje_v": 128.1, "corriente_ma": 221, "encendido": True,
    }


def test_sin_todos_los_dp_no_hay_lectura():
    assert a_lectura("id1", {"18": 221, "19": 265}, "t") is None
    assert a_lectura("id1", {}, "t") is None


class EnchufeFalso:
    """Simula TinyTuya: con conexión persistente solo devuelve los DP que cambiaron."""

    def __init__(self, respuestas, version_buena=3.5):
        self.respuestas, self.version_buena, self.version = respuestas, version_buena, None  # lista compartida entre intentos
        self.cerrado = False

    def set_version(self, v):
        self.version = v

    def set_socketTimeout(self, s): ...
    def set_socketPersistent(self, p): ...

    def close(self):
        self.cerrado = True

    def status(self):
        if self.version != self.version_buena:
            return {"Error": "Check device key or version", "Err": "914"}
        return self.respuestas.pop(0) if len(self.respuestas) > 1 else self.respuestas[0]


def lector_con(respuestas, escanear=lambda: {}, **dispositivo):
    creados = []

    def fabrica(id_, ip, clave):
        creados.append((id_, ip, clave))
        return EnchufeFalso(respuestas)

    d = {"id": "id1", "key": "clave", "ip": "10.0.0.5", "name": "Enchufe", **dispositivo}
    return LectorEnchufe(d, fabrica=fabrica, escanear=escanear), creados


def test_detecta_el_protocolo_y_acumula_dps_parciales():
    lector, _ = lector_con([{"dps": DPS}, {"dps": {"18": 300, "19": 400}}])
    primera = lector.leer()
    assert primera["potencia_w"] == 26.5
    segunda = lector.leer()  # llegaron solo 18 y 19: voltaje y encendido son los de antes
    assert (segunda["potencia_w"], segunda["corriente_ma"], segunda["voltaje_v"], segunda["encendido"]) == (40.0, 300, 128.1, True)


def test_si_el_primer_estado_es_parcial_espera_a_tener_todo():
    lector, _ = lector_con([{"dps": {"1": True, "18": 5}}])
    assert lector.leer() is None


def test_error_del_enchufe_lanza_y_reconecta():
    lector, creados = lector_con([{"dps": DPS}, {"Error": "Timeout Waiting for Device", "Err": "902"}, {"dps": DPS}])
    lector.leer()
    with pytest.raises(ErrorEnchufe):
        lector.leer()
    assert lector.leer()["potencia_w"] == 26.5  # se reconectó solo
    assert len(creados) >= 2


def test_redescubre_la_ip_tras_tres_fallos():
    escaneos = []

    def escanear():
        escaneos.append(1)
        return {"id1": {"ip": "10.0.0.99", "version": "3.5"}}

    lector, creados = lector_con([{"Error": "Timeout", "Err": "902"}], escanear=escanear, ver="3.5")
    for _ in range(2):
        with pytest.raises(ErrorEnchufe):
            lector.leer()
    assert not escaneos
    # tercer fallo: dispara el escaneo; la siguiente conexión ya usa la IP nueva
    with pytest.raises(ErrorEnchufe):
        lector.leer()
    assert escaneos == [1]
    with pytest.raises(ErrorEnchufe):
        lector.leer()
    assert creados[-1][1] == "10.0.0.99"


def test_sin_ip_en_devices_json_la_busca_en_la_red():
    lector, creados = lector_con([{"dps": DPS}], escanear=lambda: {"id1": {"ip": "10.0.0.7", "version": "3.5"}}, ip="")
    assert lector.leer() is not None
    assert creados[0][1] == "10.0.0.7"


def test_si_el_escaneo_falla_no_se_cae():
    def escanear():
        raise OSError("sin red")

    lector, _ = lector_con([{"Error": "x"}], escanear=escanear)
    for _ in range(4):
        with pytest.raises(ErrorEnchufe):
            lector.leer()


@pytest.mark.parametrize("campo", ["version", "ver"])
def test_usa_la_version_de_devices_json_sin_probar_otras(campo):
    versiones = []

    class Enchufe(EnchufeFalso):
        def set_version(self, v):
            versiones.append(v)
            super().set_version(v)

    d = {"id": "id1", "key": "k", "ip": "10.0.0.5", campo: "3.5"}
    lector = LectorEnchufe(d, fabrica=lambda *a: Enchufe([{"dps": DPS}]))
    assert lector.leer() is not None
    assert versiones == [3.5]
