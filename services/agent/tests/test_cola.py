from agent.buffer.cola import Cola


def lectura(n):
    return {"tuya_id": "x", "n": n}


def test_orden_y_borrado(tmp_path):
    c = Cola(tmp_path / "c.sqlite")
    for n in range(5):
        c.agregar(lectura(n))
    filas = c.siguientes(3)
    assert [l["n"] for _, l in filas] == [0, 1, 2]
    c.borrar([i for i, _ in filas])
    assert c.pendientes() == 2
    assert [l["n"] for _, l in c.siguientes(10)] == [3, 4]


def test_sobrevive_a_un_reinicio(tmp_path):
    c = Cola(tmp_path / "c.sqlite")
    c.agregar(lectura(1))
    c.cerrar()
    assert [l["n"] for _, l in Cola(tmp_path / "c.sqlite").siguientes(10)] == [1]


def test_dos_conexiones_al_mismo_archivo(tmp_path):
    escribe, lee = Cola(tmp_path / "c.sqlite"), Cola(tmp_path / "c.sqlite")
    escribe.agregar(lectura(1))
    assert lee.pendientes() == 1
    lee.borrar([i for i, _ in lee.siguientes(1)])
    assert escribe.pendientes() == 0


def test_al_llenarse_descarta_las_mas_viejas(tmp_path):
    c = Cola(tmp_path / "c.sqlite", maximo=100)
    for n in range(500):  # a la lectura 500 se poda
        c.agregar(lectura(n))
    assert c.pendientes() == 100
    assert c.siguientes(1)[0][1]["n"] == 400  # quedaron las 100 más recientes
