"""Punto de entrada del .app de Mac (PyInstaller lo empaqueta con su propio Python: la persona no instala nada)."""
from agent.app_mac import main

if __name__ == "__main__":
    main()
