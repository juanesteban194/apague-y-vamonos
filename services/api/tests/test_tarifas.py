from datetime import date

from app.core.database import get_sessionmaker
from app.modules.tarifas.models import Tarifa
from app.modules.tarifas.service import tarifa_vigente


def cargar(estrato=3, mes=date(2026, 9, 1), sub="814.63", sobre="958.38"):
    with get_sessionmaker()() as db:
        db.add(Tarifa(estrato=estrato, mes=mes, cop_kwh_subsistencia=sub, cop_kwh_sobre_subsistencia=sobre, fuente="prueba"))
        db.commit()


def test_vigente_usa_el_mes_y_si_falta_el_anterior():
    cargar(mes=date(2026, 9, 1))
    cargar(mes=date(2026, 10, 1), sub="900.00", sobre="1000.00")
    with get_sessionmaker()() as db:
        assert float(tarifa_vigente(db, 3, date(2026, 10, 15)).cop_kwh_subsistencia) == 900.0
        assert float(tarifa_vigente(db, 3, date(2026, 9, 30)).cop_kwh_subsistencia) == 814.63
        assert float(tarifa_vigente(db, 3, date(2026, 12, 1)).cop_kwh_subsistencia) == 900.0  # nov y dic sin cargar
        assert tarifa_vigente(db, 3, date(2026, 8, 31)) is None
        assert tarifa_vigente(db, 4, date(2026, 10, 1)) is None


def test_endpoint_tarifa_del_hogar(client, auth, hogar):
    assert client.get(f"/hogares/{hogar['id']}/tarifa", headers=auth).status_code == 404
    cargar(mes=date(2020, 1, 1))
    r = client.get(f"/hogares/{hogar['id']}/tarifa", headers=auth)
    assert r.status_code == 200
    assert r.json()["cop_kwh_subsistencia"] == 814.63 and r.json()["es_del_mes_actual"] is False


def test_el_seed_es_idempotente(client):
    import importlib.util
    from pathlib import Path

    ruta = Path(__file__).resolve().parents[1] / "seeds" / "tarifas.py"
    spec = importlib.util.spec_from_file_location("seed_tarifas", ruta)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    modulo.main()
    modulo.main()
    with get_sessionmaker()() as db:
        assert db.query(Tarifa).count() == 6
        t = tarifa_vigente(db, 3, date(2026, 9, 20))
        assert (float(t.cop_kwh_subsistencia), float(t.cop_kwh_sobre_subsistencia)) == (814.63, 958.38)
