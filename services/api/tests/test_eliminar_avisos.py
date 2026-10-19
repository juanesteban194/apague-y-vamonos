"""Eliminar avisos ya leídos (uno deslizando, o todos con «Borrar leídos»). Se esconden, no se borran: siguen contando
para no repetir el mismo aviso."""
import uuid
from datetime import UTC, datetime, timedelta

from app.modules.alertas import reglas

from .conftest import registrar_y_entrar
from .test_alertas import crear_avisos, evaluar, fijar_limite, lecturas


def titulos(client, auth, hogar):
    return [x["titulo"] for x in client.get(f"/hogares/{hogar['id']}/alertas", headers=auth).json()]


def test_eliminar_un_aviso_leido(client, auth, hogar, enchufe):
    a, b = crear_avisos(hogar["id"], enchufe["id"])
    h = hogar["id"]
    assert client.delete(f"/hogares/{h}/alertas/{a}", headers=auth).status_code == 409  # sin leer: no se elimina
    client.post(f"/hogares/{h}/alertas/{a}/leida", headers=auth)
    assert client.delete(f"/hogares/{h}/alertas/{a}", headers=auth).status_code == 204
    assert titulos(client, auth, hogar) == ["Segundo"]
    assert client.delete(f"/hogares/{h}/alertas/{a}", headers=auth).status_code == 404  # ya no está
    assert client.delete(f"/hogares/{h}/alertas/{uuid.uuid4()}", headers=auth).status_code == 404


def test_borrar_todos_los_leidos_deja_los_sin_leer(client, auth, hogar, enchufe):
    a, b = crear_avisos(hogar["id"], enchufe["id"])
    h = hogar["id"]
    client.post(f"/hogares/{h}/alertas/{a}/leida", headers=auth)
    assert client.delete(f"/hogares/{h}/alertas/leidas", headers=auth).status_code == 204
    assert titulos(client, auth, hogar) == ["Segundo"]
    client.post(f"/hogares/{h}/alertas/leidas", headers=auth)
    assert client.delete(f"/hogares/{h}/alertas/leidas", headers=auth).status_code == 204
    assert titulos(client, auth, hogar) == []


def test_otro_usuario_no_elimina_avisos_ajenos(client, auth, hogar, enchufe):
    a, _ = crear_avisos(hogar["id"], enchufe["id"])
    client.post(f"/hogares/{hogar['id']}/alertas/{a}/leida", headers=auth)
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    assert client.delete(f"/hogares/{hogar['id']}/alertas/{a}", headers=otro).status_code == 403
    assert client.delete(f"/hogares/{hogar['id']}/alertas/leidas", headers=otro).status_code == 403
    assert "Primero" in titulos(client, auth, hogar)


def test_un_aviso_eliminado_no_vuelve_a_llegar(client, auth, hogar, enchufe):
    """La subsistencia avisa una vez por mes y nivel: si la persona elimina el aviso, la regla no lo vuelve a mandar."""
    fijar_limite(1.0)
    d = uuid.UUID(enchufe["id"])
    inicio = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)
    lecturas(d, inicio, inicio + timedelta(minutes=48), vatios=1000, cada=60)  # 0,8 kWh = 80 %
    assert len(evaluar(reglas.evaluar_subsistencia)) == 1  # la regla crea el aviso
    h = hogar["id"]
    (aviso,) = client.get(f"/hogares/{h}/alertas", headers=auth).json()
    client.post(f"/hogares/{h}/alertas/{aviso['id']}/leida", headers=auth)
    assert client.delete(f"/hogares/{h}/alertas/{aviso['id']}", headers=auth).status_code == 204
    assert client.get(f"/hogares/{h}/alertas", headers=auth).json() == []
    assert evaluar(reglas.evaluar_subsistencia) == []  # sigue contando: no se repite
