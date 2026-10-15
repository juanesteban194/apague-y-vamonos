#!/bin/bash
# Construye «Apague y vamonos.app» y un .zip listo para entregar. Se corre en un Mac, desde cualquier carpeta.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -x .venv/bin/pyinstaller ] || .venv/bin/pip install -q -e ".[instalador]"
rm -rf build dist
.venv/bin/pyinstaller --noconfirm --distpath dist --workpath build instalador/agente_mac.spec
# Firma «ad hoc»: sin cuenta de Apple de pago es lo máximo; sirve para que el sistema la trate como una sola app.
codesign --force --deep --sign - "dist/Apague y vamonos.app"
(cd dist && ditto -c -k --keepParent "Apague y vamonos.app" "Apague-y-vamonos-Mac.zip")
echo "Listo: $(pwd)/dist/Apague-y-vamonos-Mac.zip"
