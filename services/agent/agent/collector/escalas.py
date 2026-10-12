"""Escalas confirmadas del BSD04 (docs/decisiones/0001): DP1 = encendido, DP18 = mA, DP19 = 0,1 W, DP20 = 0,1 V.
El DP 17 (energía) no se usa: la energía se calcula integrando potencia en el backend."""

DPS_REQUERIDOS = ("1", "18", "19", "20")


def a_lectura(tuya_id: str, dps: dict, fecha_hora: str) -> dict | None:
    """Lectura lista para la API, o None si todavía no llegaron todos los DP (el enchufe manda solo los que cambian)."""
    if not all(isinstance(dps.get(k), (int, float, bool)) for k in DPS_REQUERIDOS):
        return None
    return {
        "tuya_id": tuya_id,
        "fecha_hora": fecha_hora,
        "potencia_w": dps["19"] / 10,
        "voltaje_v": dps["20"] / 10,
        "corriente_ma": int(dps["18"]),
        "encendido": bool(dps["1"]),
    }
