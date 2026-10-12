"""Cola de lecturas en SQLite: si no hay internet las lecturas se acumulan aquí y se reenvían en orden.

Cada hilo abre su propia `Cola` sobre el mismo archivo (modo WAL: uno escribe mientras el otro lee)."""
import json
import sqlite3
import threading
import time
from pathlib import Path

# 7 días a 5 s son ~121.000 lecturas por enchufe. Si se llena, se descartan las más viejas.
MAXIMO_POR_DEFECTO = 200_000
_CADA_CUANTAS_PODAR = 500
_inicializando = threading.Lock()  # dos hilos que abren la cola a la vez chocaban al activar el modo WAL


class Cola:
    def __init__(self, ruta: Path | str, maximo: int = MAXIMO_POR_DEFECTO):
        self._maximo = maximo
        self._desde_poda = 0
        self._con = sqlite3.connect(str(ruta), timeout=10)
        with _inicializando:
            for intento in range(5):  # además, otro proceso podría estar abriendo el archivo
                try:
                    self._con.execute("PRAGMA journal_mode=WAL")
                    self._con.execute("PRAGMA synchronous=NORMAL")
                    self._con.execute(
                        "CREATE TABLE IF NOT EXISTS cola (id INTEGER PRIMARY KEY AUTOINCREMENT, datos TEXT NOT NULL)"
                    )
                    self._con.commit()
                    break
                except sqlite3.OperationalError:
                    if intento == 4:
                        raise
                    time.sleep(0.2)

    def agregar(self, lectura: dict) -> None:
        with self._con:
            self._con.execute("INSERT INTO cola (datos) VALUES (?)", (json.dumps(lectura),))
        self._desde_poda += 1
        if self._desde_poda >= _CADA_CUANTAS_PODAR:
            self._desde_poda = 0
            self._podar()

    def siguientes(self, cuantas: int) -> list[tuple[int, dict]]:
        filas = self._con.execute("SELECT id, datos FROM cola ORDER BY id LIMIT ?", (cuantas,)).fetchall()
        return [(i, json.loads(d)) for i, d in filas]

    def borrar(self, ids: list[int]) -> None:
        if ids:
            with self._con:
                self._con.executemany("DELETE FROM cola WHERE id = ?", [(i,) for i in ids])

    def pendientes(self) -> int:
        return self._con.execute("SELECT COUNT(*) FROM cola").fetchone()[0]

    def _podar(self) -> None:
        sobran = self.pendientes() - self._maximo
        if sobran > 0:
            with self._con:
                self._con.execute("DELETE FROM cola WHERE id IN (SELECT id FROM cola ORDER BY id LIMIT ?)", (sobran,))

    def cerrar(self) -> None:
        self._con.close()
