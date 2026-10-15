# PyInstaller: genera «Apague y vamonos.app» (solo barra de menús, sin ícono en el Dock). Uso: instalador/construir_mac.sh
from PyInstaller.utils.hooks import collect_submodules

ocultos = collect_submodules("agent") + collect_submodules("websockets") + ["rumps", "tinytuya"]

import os

# SPECPATH es la carpeta de este archivo; el código del agente está un nivel arriba (ruta absoluta: no depende de dónde se corra).
RAIZ = os.path.abspath(os.path.join(SPECPATH, ".."))
a = Analysis([os.path.join(SPECPATH, "entrada_mac.py")], pathex=[RAIZ], hiddenimports=ocultos)
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [], exclude_binaries=True, name="ApagueYVamonos", console=False)
coll = COLLECT(exe, a.binaries, a.datas, name="ApagueYVamonos")
app = BUNDLE(
    coll,
    name="Apague y vamonos.app",
    icon=os.path.join(SPECPATH, "Apague.icns"),
    bundle_identifier="co.apagueyvamonos.agente",
    version="1.0.0",
    info_plist={
        "LSUIElement": True,  # solo barra de menús
        "CFBundleDisplayName": "Apague y vámonos",
        "NSHumanReadableCopyright": "Proyecto de Ingeniería 1 · Universidad de Medellín",
        "NSLocalNetworkUsageDescription": "Lee tus enchufes inteligentes por la WiFi de tu casa.",
    },
)
