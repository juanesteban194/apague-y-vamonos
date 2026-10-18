/** Política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto 1377 de 2013).
 *
 *  BORRADOR para revisión del equipo (y, idealmente, de un abogado): describe lo que la app hace de verdad hoy, pero no es asesoría legal.
 *  Pendiente de definir por el equipo: la dirección física del responsable, si aplica. */

export const CONTACTO = {
  responsable: "Equipo del proyecto «Apague y vámonos» (Proyecto de Ingeniería 1, Universidad de Medellín)",
  correo: "juanechavarria194@gmail.com" as string | null, // dado por el equipo el 2026-10-15
};

export const VERSION_POLITICA = "borrador 2026-10-15";

export type SeccionPolitica = { titulo: string; parrafos?: string[]; puntos?: string[] };

export const POLITICA: SeccionPolitica[] = [
  {
    titulo: "Quién es el responsable",
    parrafos: [
      `${CONTACTO.responsable}. Esta política explica qué datos tuyos usa la app, para qué, con quién se comparten y cómo puedes ejercer tus derechos.`,
    ],
  },
  {
    titulo: "Qué datos tratamos",
    puntos: [
      "Tu cuenta: nombre, correo y, si entras con Google, el identificador de tu cuenta de Google. Tu contraseña se guarda cifrada (nunca en texto legible).",
      "Tu casa: nombre, barrio, estrato y tipo de medidor (prepago o pospago).",
      "El consumo de tus dispositivos: potencia, voltaje, corriente y si el enchufe está prendido o apagado, con fecha y hora, medidos por tus enchufes inteligentes.",
      "Lo que tú anotas: lecturas del medidor, el histórico de tus facturas de EPM, el saldo de tu medidor prepago, tus rutinas de apagado y tus preferencias de avisos.",
      "El código de tu celular para enviarte notificaciones (si las activas).",
      "No pedimos datos sensibles (salud, origen, ideología, biométricos) ni datos de menores de edad.",
    ],
  },
  {
    titulo: "Para qué los usamos",
    puntos: [
      "Calcular cuánta energía gastan tus dispositivos y cuánto cuesta en pesos con la tarifa de EPM de tu estrato.",
      "Avisarte de consumos altos, de dispositivos que llevan mucho tiempo prendidos, de que te acercas a la línea de subsistencia o de que se acaba tu saldo prepago.",
      "Darte recomendaciones de ahorro y simular si te conviene cambiar un dispositivo.",
      "Prender y apagar tus enchufes cuando tú lo pides o cuando programas una rutina.",
      "Mantener tu cuenta y la seguridad de la aplicación.",
      "No vendemos tus datos ni los usamos para publicidad.",
    ],
  },
  {
    titulo: "Con quién se comparten y dónde se guardan",
    parrafos: [
      "Para que la app funcione usamos servicios de terceros que tratan datos por nuestra cuenta: el servidor y la base de datos donde se guardan tus datos, el servicio de notificaciones de tu celular, Google (solo si inicias sesión con Google) y Tuya (solo para enviar la orden de prender o apagar un enchufe cuando tu computador no puede hacerlo directamente).",
      "Algunos de esos servidores están fuera de Colombia. Al aceptar esta política autorizas esa transmisión de datos para las finalidades descritas.",
    ],
  },
  {
    titulo: "Cuánto tiempo los guardamos",
    puntos: [
      "Las lecturas detalladas de tus enchufes se conservan 30 días; después queda solo el consumo resumido por hora.",
      "El resto de tus datos se conserva mientras tengas la cuenta.",
      "Si eliminas tu cuenta, tus datos se borran (ver «Tus derechos»).",
    ],
  },
  {
    titulo: "Tus derechos",
    parrafos: ["Como titular de los datos tienes derecho a conocerlos, actualizarlos, rectificarlos, pedir que se supriman, revocar tu autorización y acceder a ellos de forma gratuita. Desde la app puedes:"],
    puntos: [
      "Ver y corregir los datos de tu casa (Explorar › Mis casas › Editar esta casa).",
      "Borrar lecturas del medidor que anotaste mal.",
      "Eliminar una casa con todo lo suyo (Explorar › Mis casas › Eliminar esta casa).",
      "Eliminar tu cuenta y todos tus datos (Ajustes › Eliminar mi cuenta). Es inmediato y no se puede deshacer; revoca tu autorización.",
    ],
  },
  {
    titulo: "Seguridad",
    puntos: [
      "Toda la comunicación entre la app y el servidor va cifrada (HTTPS).",
      "Las contraseñas se guardan cifradas con Argon2 y las claves de tus enchufes se guardan cifradas.",
      "Cada persona solo ve los datos de las casas a las que pertenece.",
    ],
  },
  {
    titulo: "Consultas, reclamos y quejas",
    parrafos: [
      CONTACTO.correo
        ? `Para ejercer tus derechos o hacer una consulta o reclamo escribe a ${CONTACTO.correo}. Responderemos en los plazos de la Ley 1581 de 2012 (10 días hábiles para consultas y 15 para reclamos).`
        : "Para ejercer tus derechos o hacer una consulta o reclamo, escríbele al equipo del proyecto (el correo de contacto se publicará aquí). Responderemos en los plazos de la Ley 1581 de 2012 (10 días hábiles para consultas y 15 para reclamos).",
      "Si no quedas conforme, puedes presentar una queja ante la Superintendencia de Industria y Comercio (www.sic.gov.co).",
    ],
  },
  {
    titulo: "Cambios a esta política",
    parrafos: ["Si la cambiamos de forma importante, te lo avisaremos en la app antes de que aplique."],
  },
];
