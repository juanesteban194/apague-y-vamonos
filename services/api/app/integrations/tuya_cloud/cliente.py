"""Respaldo por la API de Tuya Cloud: solo para comandos cuando el agente local no responde. Nunca para leer (cuota limitada).

Firma HMAC-SHA256 de Tuya OpenAPI. El token de acceso (≈ 2 h) se guarda en memoria, así cada comando cuesta 1 llamada. Hay un tope
mensual de llamadas por proceso para que un fallo del agente no gaste la cuota de prueba antes de la sustentación."""
import hashlib
import json
import hmac
import logging
import time
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

import httpx

from app.core.config import get_settings

log = logging.getLogger("tuya_cloud")

HOSTS = {
    "us": "https://openapi.tuyaus.com",  # Western America
    "us-e": "https://openapi-ueaz.tuyaus.com",
    "eu": "https://openapi.tuyaeu.com",
    "eu-w": "https://openapi-weaz.tuyaeu.com",
    "cn": "https://openapi.tuyacn.com",
    "in": "https://openapi.tuyain.com",
    "sg": "https://openapi-sg.iotbing.com",
}
SWITCH_CODE = "switch_1"  # DP 1 del BSD04 (mapeo oficial, ADR 0001)
VACIO_SHA256 = hashlib.sha256(b"").hexdigest()


class ErrorTuyaCloud(Exception):
    pass


def firmar(client_id: str, secret: str, t: str, metodo: str, ruta_con_query: str, cuerpo: bytes = b"", token: str = "", nonce: str = "") -> str:
    """Firma v2 de Tuya: HMAC-SHA256(client_id + [token] + t + nonce + stringToSign) en mayúsculas.
    stringToSign = METODO \\n sha256(cuerpo) \\n (cabeceras firmadas, vacías) \\n URL."""
    string_a_firmar = "\n".join([metodo.upper(), hashlib.sha256(cuerpo).hexdigest() if cuerpo else VACIO_SHA256, "", ruta_con_query])
    mensaje = client_id + token + t + nonce + string_a_firmar
    return hmac.new(secret.encode(), mensaje.encode(), hashlib.sha256).hexdigest().upper()


@dataclass
class _Token:
    valor: str
    vence: float


class ClienteTuyaCloud:
    def __init__(self, cliente: httpx.AsyncClient | None = None):
        self._cliente = cliente
        self._token: _Token | None = None
        self._mes: str = ""
        self._llamadas = 0

    @staticmethod
    def configurado() -> bool:
        s = get_settings()
        return bool(s.tuya_access_id and s.tuya_access_secret)

    def llamadas_del_mes(self) -> int:
        self._rotar_mes()
        return self._llamadas

    def _rotar_mes(self) -> None:
        mes = datetime.now(UTC).strftime("%Y-%m")
        if mes != self._mes:
            self._mes, self._llamadas = mes, 0

    def _contar(self) -> None:
        self._rotar_mes()
        if self._llamadas >= get_settings().tuya_llamadas_max_mes:
            raise ErrorTuyaCloud("Se alcanzó el tope de llamadas a Tuya Cloud de este mes")
        self._llamadas += 1

    async def _pedir(self, metodo: str, ruta: str, cuerpo: dict | None = None, con_token: bool = True) -> dict:
        s = get_settings()
        self._contar()
        t = str(int(time.time() * 1000))
        nonce = uuid.uuid4().hex
        datos = b"" if cuerpo is None else json.dumps(cuerpo, separators=(",", ":")).encode()
        token = self._token.valor if con_token and self._token else ""
        cabeceras = {
            "client_id": s.tuya_access_id,
            "t": t,
            "nonce": nonce,
            "sign_method": "HMAC-SHA256",
            "sign": firmar(s.tuya_access_id, s.tuya_access_secret, t, metodo, ruta, datos, token, nonce),
            "Content-Type": "application/json",
        }
        if token:
            cabeceras["access_token"] = token
        cliente = self._cliente or httpx.AsyncClient(timeout=10)
        try:
            r = await cliente.request(metodo, HOSTS.get(s.tuya_region, HOSTS["us"]) + ruta, headers=cabeceras, content=datos or None)
        except httpx.HTTPError as e:
            raise ErrorTuyaCloud(f"sin conexión con Tuya Cloud: {type(e).__name__}") from None
        finally:
            if self._cliente is None:
                await cliente.aclose()
        cuerpo_resp = r.json()
        if not cuerpo_resp.get("success"):
            raise ErrorTuyaCloud(f"Tuya Cloud rechazó la petición: {cuerpo_resp.get('msg') or cuerpo_resp.get('code')}")
        return cuerpo_resp

    async def _obtener_token(self) -> None:
        if self._token and self._token.vence - time.time() > 60:
            return
        self._token = None
        r = await self._pedir("GET", "/v1.0/token?grant_type=1", con_token=False)
        resultado = r["result"]
        self._token = _Token(resultado["access_token"], time.time() + int(resultado.get("expire_time", 7200)))

    async def enviar_comando(self, tuya_id: str, encender: bool) -> None:
        """Enciende o apaga el enchufe por la nube. Lanza ErrorTuyaCloud si no se pudo."""
        if not self.configurado():
            raise ErrorTuyaCloud("Tuya Cloud no está configurado")
        await self._obtener_token()
        await self._pedir("POST", f"/v1.0/iot-03/devices/{tuya_id}/commands", {"commands": [{"code": SWITCH_CODE, "value": encender}]})
        log.warning("comando por Tuya Cloud (respaldo) a %s: %s [llamadas este mes: %d]", tuya_id, "encender" if encender else "apagar", self._llamadas)


    async def clave_local(self, tuya_id: str) -> str:
        """Clave local de un enchufe (para que el agente lo lea por LAN). 2 llamadas la primera vez (token + dispositivo), 1 después."""
        if not self.configurado():
            raise ErrorTuyaCloud("Tuya Cloud no está configurado")
        await self._obtener_token()
        r = await self._pedir("GET", f"/v1.0/devices/{tuya_id}")
        clave = (r.get("result") or {}).get("local_key")
        if not clave:
            raise ErrorTuyaCloud("Tuya no entregó la clave local de ese enchufe (¿está en la cuenta vinculada al proyecto?)")
        return clave


cliente_tuya = ClienteTuyaCloud()
