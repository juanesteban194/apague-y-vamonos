# services/agent

Agente local que corre en la casa: lee el enchufe BSD04 por LAN con TinyTuya, guarda en cola SQLite sin internet y recibe comandos por WSS.
Los scripts de verificación de la Fase 0 van en `tools/`. `devices.json` (con la clave local) está en .gitignore.
Ver **Hardware verificado**, **Vías hacia el enchufe** y **Plan de construcción** en [CLAUDE.md](../../CLAUDE.md).
