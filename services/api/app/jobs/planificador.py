from apscheduler.schedulers.background import BackgroundScheduler

from app.jobs import tareas


def crear_planificador() -> BackgroundScheduler:
    """Zona America/Bogota. `coalesce` junta las pasadas perdidas (API dormida) en una sola; `max_instances=1` evita solaparse."""
    p = BackgroundScheduler(timezone="America/Bogota", job_defaults={"coalesce": True, "max_instances": 1, "misfire_grace_time": 600})
    p.add_job(tareas.cada_20_segundos, "interval", seconds=20, id="cada_20_segundos")
    p.add_job(tareas.cada_minuto, "interval", minutes=1, id="cada_minuto")
    p.add_job(tareas.cada_hora, "cron", minute=5, id="cada_hora")
    p.add_job(tareas.cada_dia, "cron", hour=3, minute=10, id="cada_dia")
    return p
