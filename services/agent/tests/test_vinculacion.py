import json
import logging
import os
import stat
import threading

import httpx
import pytest

from agent.config import almacen
from agent.config.ajustes import ErrorConfiguracion, cargar_ajustes
from agent.config.remota import Registro, sincronizar
from agent.vinculacion import ErrorVinculacion, vincular

CRED = almacen.Credenciales(api_url="https://api.test", token="tok", agente_id="a1", nombre="Sala", hogar_nombre="Casa")


def cliente(manejador):
    return httpx.Client(transport=httpx.MockTransport(manejador), base_url="https://api.test")


# --- almacén de credenciales -----------------------------------------------------------------------------------------
def test_guardar_y_cargar_credenciales(tmp_path):
    ruta = tmp_path / "carpeta" / "agente.json"
    almacen.guardar(CRED, ruta)
    assert almacen.cargar(ruta) == CRED


def test_el_archivo_queda_solo_para_el_usuario(tmp_path):
    ruta = tmp_path / "agente.json"
    almacen.guardar(CRED, ruta)
    if os.name == "posix":
        assert stat.S_IMODE(ruta.stat().st_mode) == 0o600


def test_sin_archivo_o_dañado_no_hay_credenciales(tmp_path):
    assert almacen.cargar(tmp_path / "no-existe.json") is None
    (tmp_path / "malo.json").write_text("{no es json")
    assert almacen.cargar(tmp_path / "malo.json") is None
    (tmp_path / "incompleto.json").write_text(json.dumps({"token": "x"}))
    assert almacen.cargar(tmp_path / "incompleto.json") is None


def test_borrar_olvida_la_vinculacion(tmp_path):
    ruta = tmp_path / "agente.json"
    almacen.guardar(CRED, ruta)
    almacen.borrar(ruta)
    almacen.borrar(ruta)  # repetirlo no falla
    assert almacen.cargar(ruta) is None


def test_la_carpeta_de_datos_se_puede_fijar_por_variable(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENT_DATA_DIR", str(tmp_path / "datos"))
    assert almacen.ruta_credenciales() == tmp_path / "datos" / "agente.json"


# --- vincular con el código -------------------------------------------------------------------------------------------
def test_vincular_guarda_el_token_y_dice_a_que_casa_quedo(tmp_path):
    vistas = []

    def manejador(request):
        vistas.append((request.url.path, json.loads(request.content)))
        return httpx.Response(200, json={"agente_id": "a1", "nombre": "Sala", "hogar_nombre": "Casa", "token": "tok-nuevo"})

    ruta = tmp_path / "agente.json"
    c = vincular("123 456", "https://api.test/", cliente(manejador), ruta)
    assert vistas == [("/agentes/vincular", {"codigo": "123456"})]  # tolera espacios al escribirlo
    assert (c.token, c.nombre, c.hogar_nombre, c.api_url) == ("tok-nuevo", "Sala", "Casa", "https://api.test")
    assert almacen.cargar(ruta) == c


@pytest.mark.parametrize("malo", ["", "12345", "1234567", "abcdef"])
def test_un_codigo_mal_escrito_se_explica_sin_llamar_a_la_api(malo, tmp_path):
    def manejador(request):
        raise AssertionError("no debía llamar a la API")

    with pytest.raises(ErrorVinculacion, match="6 números"):
        vincular(malo, "https://api.test", cliente(manejador), tmp_path / "a.json")


@pytest.mark.parametrize(
    "estado, texto",
    [(404, "no es válido o ya venció"), (429, "Demasiados intentos"), (500, "error")],
)
def test_los_errores_del_servidor_se_dicen_en_claro(estado, texto, tmp_path):
    ruta = tmp_path / "a.json"
    with pytest.raises(ErrorVinculacion, match=texto):
        vincular("123456", "https://api.test", cliente(lambda r: httpx.Response(estado, json={"detail": "x"})), ruta)
    assert almacen.cargar(ruta) is None  # si falló no queda nada guardado


def test_sin_internet_lo_dice_en_claro(tmp_path):
    def manejador(request):
        raise httpx.ConnectError("sin red")

    with pytest.raises(ErrorVinculacion, match="conexión"):
        vincular("123456", "https://api.test", cliente(manejador), tmp_path / "a.json")


# --- ajustes desde la vinculación -------------------------------------------------------------------------------------
def test_los_ajustes_salen_de_la_vinculacion():
    a = cargar_ajustes({}, credenciales=CRED)
    assert (a.api_url, a.token) == ("https://api.test", "tok")


def test_la_vinculacion_manda_sobre_un_env_de_desarrollo():
    a = cargar_ajustes({"AGENT_API_URL": "http://localhost:8000", "AGENT_TOKEN": "viejo"}, credenciales=CRED)
    assert a.token == "tok"


def test_sin_vincular_ni_env_explica_que_hacer():
    with pytest.raises(ErrorConfiguracion, match="no está vinculado.*--vincular"):
        cargar_ajustes({})


# --- registro y configuración remota ----------------------------------------------------------------------------------
class LectorFalso:
    def __init__(self, d):
        self.tuya_id, self.nombre, self.clave = d["id"], d["name"], d["key"]


def config(*enchufes, sin_clave=()):
    return {"agente_id": "a1", "nombre": "Sala", "enchufes": [{"tuya_id": i, "nombre": n, "clave_local": k} for i, n, k in enchufes], "sin_clave": list(sin_clave)}


def api(respuestas):
    cola = list(respuestas)

    def manejador(request):
        r = cola.pop(0) if len(cola) > 1 else cola[0]
        if isinstance(r, Exception):
            raise r
        return r

    return cliente(manejador)


def test_el_registro_agrega_quita_y_cambia_enchufes(monkeypatch):
    import agent.config.remota as remota

    monkeypatch.setattr(remota, "LectorEnchufe", LectorFalso)
    reg = Registro()
    assert reg.actualizar([{"tuya_id": "t1", "nombre": "Nevera", "clave_local": "k1"}], LectorFalso) == (["Nevera"], [])
    assert [l.nombre for l in reg.lectores()] == ["Nevera"] and reg.get("t1").clave == "k1"
    # sin cambios: no recrea el lector (conservaría su conexión)
    primero = reg.get("t1")
    assert reg.actualizar([{"tuya_id": "t1", "nombre": "Nevera", "clave_local": "k1"}], LectorFalso) == ([], [])
    assert reg.get("t1") is primero
    # clave nueva: lector nuevo
    assert reg.actualizar([{"tuya_id": "t1", "nombre": "Nevera", "clave_local": "k2"}], LectorFalso) == (["Nevera"], [])
    assert reg.get("t1") is not primero and reg.get("t1").clave == "k2"
    # se le quita
    assert reg.actualizar([], LectorFalso) == ([], ["Nevera"])
    assert reg.get("t1") is None and reg.lectores() == []


def test_sincronizar_trae_los_enchufes_asignados(monkeypatch, caplog):
    import agent.config.remota as remota

    monkeypatch.setattr(remota, "LectorEnchufe", LectorFalso)
    reg = Registro()
    c = api([httpx.Response(200, json=config(("t1", "Nevera", "k1"), ("t2", "Lámpara", "k2")))])
    with caplog.at_level(logging.INFO, logger="agente.config"):
        assert sincronizar(c, reg) is True
    assert sorted(l.nombre for l in reg.lectores()) == ["Lámpara", "Nevera"]
    assert "Ahora lee: Nevera, Lámpara" in caplog.text


def test_avisa_de_los_enchufes_asignados_sin_clave(monkeypatch, caplog):
    import agent.config.remota as remota

    monkeypatch.setattr(remota, "LectorEnchufe", LectorFalso)
    with caplog.at_level(logging.WARNING, logger="agente.config"):
        sincronizar(api([httpx.Response(200, json=config(sin_clave=["t9"]))]), Registro())
    assert "no tiene su clave local" in caplog.text and "t9" in caplog.text


def test_sin_internet_se_sigue_con_lo_ultimo_que_se_sabia(monkeypatch):
    import agent.config.remota as remota

    monkeypatch.setattr(remota, "LectorEnchufe", LectorFalso)
    reg = Registro()
    c = api([httpx.Response(200, json=config(("t1", "Nevera", "k1"))), httpx.ConnectError("sin red"), httpx.Response(500)])
    assert sincronizar(c, reg) is True
    assert sincronizar(c, reg) is False and sincronizar(c, reg) is False
    assert [l.nombre for l in reg.lectores()] == ["Nevera"]  # no se perdió nada


def test_un_token_rechazado_se_dice_y_no_borra_nada(monkeypatch, caplog):
    import agent.config.remota as remota

    monkeypatch.setattr(remota, "LectorEnchufe", LectorFalso)
    reg = Registro()
    reg.actualizar([{"tuya_id": "t1", "nombre": "Nevera", "clave_local": "k1"}], LectorFalso)
    with caplog.at_level(logging.ERROR, logger="agente.config"):
        assert sincronizar(api([httpx.Response(401)]), reg) is False
    assert "código nuevo" in caplog.text and len(reg.lectores()) == 1


def test_el_agente_ve_los_cambios_del_registro_sin_reiniciar(monkeypatch):
    """El bucle de lectura y el canal de órdenes consultan el registro en cada vuelta."""
    from agent.commands.cliente import ClienteComandos
    from agent.config.ajustes import Ajustes

    reg = Registro()
    comandos = ClienteComandos(Ajustes("https://api.test", "t", 5, None, None), reg)
    assert comandos._registro.get("t1") is None
    reg.actualizar([{"tuya_id": "t1", "nombre": "Nevera", "clave_local": "k"}], LectorFalso)
    assert comandos._registro.get("t1").nombre == "Nevera"


# --- subir la clave de devices.json cuando la API no la tiene ------------------------------------------------------------------------
def devices(tmp_path, *pares):
    ruta = tmp_path / "devices.json"
    ruta.write_text(json.dumps([{"id": i, "key": k, "name": "x"} for i, k in pares]))
    return ruta


def test_las_claves_locales_se_leen_de_devices_json(tmp_path):
    from agent.config.remota import claves_locales

    assert claves_locales(devices(tmp_path, ("t1", "k1"), ("t2", "k2"))) == {"t1": "k1", "t2": "k2"}
    assert claves_locales(tmp_path / "no-existe.json") == {}
    (tmp_path / "malo.json").write_text("{no es json")
    assert claves_locales(tmp_path / "malo.json") == {}
    assert claves_locales(None) == {}


def test_si_la_api_no_tiene_la_clave_y_este_equipo_si_se_la_sube_y_empieza_a_leer(monkeypatch, tmp_path, caplog):
    import agent.config.remota as remota

    monkeypatch.setattr(remota, "LectorEnchufe", LectorFalso)
    vistas = {"subidas": None, "claves": False}

    def manejador(request):
        if request.url.path == "/agentes/claves":
            vistas["subidas"] = json.loads(request.content)
            vistas["claves"] = True
            return httpx.Response(200, json={"guardadas": ["t1"], "ignoradas": []})
        if vistas["claves"]:
            return httpx.Response(200, json=config(("t1", "Nevera", "k1")))
        return httpx.Response(200, json=config(sin_clave=["t1"]))

    reg = Registro()
    with caplog.at_level(logging.INFO, logger="agente.config"):
        assert sincronizar(cliente(manejador), reg, devices(tmp_path, ("t1", "k1"), ("otro", "kx"))) is True
    assert vistas["subidas"] == {"claves": {"t1": "k1"}}  # solo la del enchufe que falta, no todas
    assert [l.nombre for l in reg.lectores()] == ["Nevera"]
    assert "Subí a la API la clave de t1" in caplog.text


def test_sin_devices_json_no_sube_nada_y_dice_el_motivo(monkeypatch, tmp_path, caplog):
    import agent.config.remota as remota

    monkeypatch.setattr(remota, "LectorEnchufe", LectorFalso)
    llamadas = []

    def manejador(request):
        llamadas.append(request.url.path)
        return httpx.Response(200, json={**config(sin_clave=["t1"]), "motivos": {"t1": "el servidor no tiene TUYA_ACCESS_ID"}})

    with caplog.at_level(logging.WARNING, logger="agente.config"):
        sincronizar(cliente(manejador), Registro(), tmp_path / "no-existe.json")
    assert "/agentes/claves" not in llamadas
    assert "el servidor no tiene TUYA_ACCESS_ID" in caplog.text  # el motivo llega al registro del agente


def test_si_subir_falla_se_sigue_y_se_avisa(monkeypatch, tmp_path, caplog):
    import agent.config.remota as remota

    monkeypatch.setattr(remota, "LectorEnchufe", LectorFalso)

    def manejador(request):
        if request.url.path == "/agentes/claves":
            return httpx.Response(503, json={"detail": "sin CLAVE_MAESTRA"})
        return httpx.Response(200, json=config(sin_clave=["t1"]))

    reg = Registro()
    with caplog.at_level(logging.WARNING, logger="agente.config"):
        assert sincronizar(cliente(manejador), reg, devices(tmp_path, ("t1", "k1"))) is True
    assert "No se pudieron subir" in caplog.text and reg.lectores() == []


def test_no_sube_claves_que_la_api_ya_tiene(monkeypatch, tmp_path):
    import agent.config.remota as remota

    monkeypatch.setattr(remota, "LectorEnchufe", LectorFalso)
    llamadas = []

    def manejador(request):
        llamadas.append(request.url.path)
        return httpx.Response(200, json=config(("t1", "Nevera", "k1")))

    sincronizar(cliente(manejador), Registro(), devices(tmp_path, ("t1", "k1")))
    assert "/agentes/claves" not in llamadas
