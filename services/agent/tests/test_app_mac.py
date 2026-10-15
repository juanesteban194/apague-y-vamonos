import fcntl
import plistlib
import subprocess
import sys

import pytest

from agent.config import almacen
from agent.ui import mac
from agent.vinculacion import ErrorVinculacion

pytestmark = pytest.mark.skipif(sys.platform != "darwin", reason="el programa de Mac solo se prueba en macOS")


def resultado(salida="", codigo=0):
    return subprocess.CompletedProcess([], codigo, stdout=salida, stderr="")


# --- diálogos ----------------------------------------------------------------------------------------------------------
def test_pedir_texto_devuelve_lo_que_escribio_la_persona():
    visto = {}

    def correr(orden, **kw):
        visto["orden"] = orden
        return resultado("123456\n")

    assert mac.pedir_texto("Escribe el código", correr=correr) == "123456"
    assert visto["orden"][0] == "osascript" and visto["orden"][-3:] == ["Escribe el código", "Apague y vámonos", "Vincular"]


def test_los_textos_van_como_argumentos_y_no_dentro_del_script():
    """Un nombre con comillas no debe poder romper (ni inyectar nada en) el AppleScript."""
    visto = {}

    def correr(orden, **kw):
        visto["orden"] = orden
        return resultado("x")

    peligroso = 'Sala" & (do shell script "rm -rf ~") & "'
    mac.pedir_texto(peligroso, correr=correr)
    scripts = [visto["orden"][i + 1] for i, p in enumerate(visto["orden"]) if p == "-e"]
    assert all(peligroso not in s for s in scripts) and peligroso in visto["orden"]


def test_cancelar_devuelve_none():
    assert mac.pedir_texto("x", correr=lambda *a, **k: resultado("", 1)) is None


def test_avisar_muestra_el_mensaje():
    visto = {}
    mac.avisar("Hola", correr=lambda orden, **k: visto.setdefault("orden", orden) and resultado())
    assert "Hola" in visto["orden"]


# --- asistente de vinculación -------------------------------------------------------------------------------------------
CRED = almacen.Credenciales(api_url="https://api.test", token="t", agente_id="a", nombre="Sala", hogar_nombre="Casa")


def test_el_asistente_vincula_con_el_codigo_escrito():
    assert mac.asistente_de_vinculacion(lambda m: "123456", lambda c: CRED) == CRED


def test_si_el_codigo_falla_se_lo_dice_y_lo_deja_intentar_otra_vez():
    mensajes, intentos = [], iter(["111111", "222222"])

    def pedir(mensaje):
        mensajes.append(mensaje)
        return next(intentos)

    def vincular(codigo):
        if codigo == "111111":
            raise ErrorVinculacion("Ese código no es válido o ya venció.")
        return CRED

    assert mac.asistente_de_vinculacion(pedir, vincular) == CRED
    assert mensajes[0] == mac.MENSAJE_CODIGO
    assert mensajes[1].startswith("Ese código no es válido o ya venció.") and "de nuevo" in mensajes[1]


def test_si_cancela_no_queda_nada_vinculado():
    llamadas = []
    assert mac.asistente_de_vinculacion(lambda m: None, lambda c: llamadas.append(c)) is None
    assert llamadas == []


# --- inicio con el Mac ---------------------------------------------------------------------------------------------------
def test_activar_el_inicio_escribe_un_launchagent_que_reabre_solo_si_se_cae(tmp_path):
    ruta = mac.activar_inicio_con_el_mac("/Applications/Apague.app/Contents/MacOS/ApagueYVamonos", tmp_path)
    datos = plistlib.loads(ruta.read_bytes())
    assert datos["Label"] == mac.ETIQUETA_INICIO and datos["RunAtLoad"] is True
    assert datos["ProgramArguments"] == ["/Applications/Apague.app/Contents/MacOS/ApagueYVamonos"]
    assert datos["KeepAlive"] == {"SuccessfulExit": False}  # salir desde el menú (salida normal) no lo reabre
    assert mac.inicio_con_el_mac_activo(tmp_path) is True


def test_desactivar_el_inicio(tmp_path):
    mac.activar_inicio_con_el_mac("/x", tmp_path)
    mac.desactivar_inicio_con_el_mac(tmp_path)
    mac.desactivar_inicio_con_el_mac(tmp_path)  # repetirlo no falla
    assert mac.inicio_con_el_mac_activo(tmp_path) is False


# --- una sola instancia --------------------------------------------------------------------------------------------------
def test_solo_una_instancia_a_la_vez(tmp_path):
    ruta = tmp_path / "agente.lock"
    primera = mac.tomar_candado(ruta)
    assert primera is not None
    assert mac.tomar_candado(ruta) is None  # la segunda copia se da cuenta
    primera.close()
    otra = mac.tomar_candado(ruta)
    assert otra is not None  # al cerrarse la primera, el candado queda libre
    otra.close()


# --- texto del menú --------------------------------------------------------------------------------------------------------
def test_el_menu_dice_en_claro_como_va_todo():
    pytest.importorskip("rumps")
    from agent.app_mac import texto_de_estado

    assert texto_de_estado({"enchufes": 2, "conectado": True, "token_rechazado": False}) == "🟢 Conectado · leyendo 2 enchufes"
    assert texto_de_estado({"enchufes": 1, "conectado": True, "token_rechazado": False}) == "🟢 Conectado · leyendo 1 enchufe"
    assert "sin enchufes asignados" in texto_de_estado({"enchufes": 0, "conectado": True, "token_rechazado": False})
    assert "Sin conexión" in texto_de_estado({"enchufes": 2, "conectado": False, "token_rechazado": False})
    assert "Vincular de nuevo" in texto_de_estado({"enchufes": 2, "conectado": False, "token_rechazado": True})
