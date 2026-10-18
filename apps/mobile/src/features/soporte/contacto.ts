import { CONTACTO } from "@/features/datos/politica";

/** Canales de ayuda al cliente. El correo es el mismo de la política de datos (dado por el equipo el 2026-10-15).
 *  WhatsApp: número con indicativo y sin espacios ni signos (por ejemplo "573001234567"). Pendiente: el equipo debe darlo;
 *  mientras sea null, la app no muestra la opción de WhatsApp (nunca un botón que no lleva a ninguna parte). */
export const SOPORTE = {
  whatsapp: null as string | null,
  correo: CONTACTO.correo,
};

export const MENSAJE_INICIAL = "Hola, necesito ayuda con «Apague y vámonos».";

/** Enlace de WhatsApp que abre el chat con el mensaje ya escrito (en el teléfono abre la app; si no la tiene, la página de WhatsApp). */
export function enlaceWhatsApp(numero: string, mensaje = MENSAJE_INICIAL): string {
  return `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(mensaje)}`;
}

/** Enlace de correo con el asunto y el comienzo del mensaje ya escritos. */
export function enlaceCorreo(correo: string, casa?: string): string {
  const cuerpo = `${MENSAJE_INICIAL}\n\n${casa ? `Mi casa en la app: ${casa}\n` : ""}Lo que pasó:\n`;
  return `mailto:${correo}?subject=${encodeURIComponent("Ayuda con Apague y vámonos")}&body=${encodeURIComponent(cuerpo)}`;
}

/** El número como se lee en Colombia: "573001234567" → "+57 300 123 4567". */
export function numeroLegible(numero: string): string {
  const d = numero.replace(/\D/g, "");
  if (d.startsWith("57") && d.length === 12) return `+57 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return `+${d}`;
}
