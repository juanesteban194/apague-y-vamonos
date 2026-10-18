import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect } from "react";

import { apagarDispositivo } from "@/api/cliente";
import { notificaciones } from "@/lib/notificacionesSeguras";
import { aplicarEvento } from "@/features/consumo/tiempoReal";
import { ACCION_APAGAR, mostrarAvisoLocal, prepararNotificaciones, registrarPush } from "@/features/alertas/notificaciones";

import { useTiempoReal } from "./estado";
import type { EventoEnVivo } from "./eventos";
import { useEventosHogar } from "./useEventosHogar";

/** Un aviso nuevo: refresca la lista y el contador y, con la app abierta, lo muestra como notificación. */
export function manejarEvento(cliente: QueryClient, hogarId: string, evento: EventoEnVivo): void {
  if (evento.tipo !== "alerta") return aplicarEvento(cliente, hogarId, evento);
  void cliente.invalidateQueries({ queryKey: ["alertas", hogarId] });
  void mostrarAvisoLocal(evento).catch(() => {});
}

/** Se monta una vez, cuando ya hay hogar: mantiene la conexión en vivo para toda la app y atiende los toques en las notificaciones. */
export function ProveedorTiempoReal({ hogarId }: { hogarId: string }) {
  const cliente = useQueryClient();
  const conexion = useEventosHogar(hogarId, (e) => manejarEvento(cliente, hogarId, e));

  useEffect(() => {
    useTiempoReal.setState({ conexion });
  }, [conexion]);

  useEffect(() => {
    void prepararNotificaciones().then(registrarPush).catch(() => {});
    const Notifications = notificaciones();
    if (!Notifications) return; // sin notificaciones del sistema (Expo Go en Android): nada que escuchar
    const suscripcion = Notifications.addNotificationResponseReceivedListener((respuesta) => {
      const datos = respuesta.notification.request.content.data as { dispositivo_id?: string | null };
      if (respuesta.actionIdentifier === ACCION_APAGAR && datos.dispositivo_id) {
        void apagarDispositivo(datos.dispositivo_id).catch(() => {}); // el aviso queda en la lista aunque no se haya podido
      }
      router.push(datos.dispositivo_id && respuesta.actionIdentifier === ACCION_APAGAR ? `/dispositivo/${datos.dispositivo_id}` : "/avisos");
    });
    return () => suscripcion.remove();
  }, []);

  return null;
}
