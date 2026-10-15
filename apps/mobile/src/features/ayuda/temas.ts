import type { NombreIcono } from "@/components/Icono";

export type TemaAyuda = {
  titulo: string;
  icono: NombreIcono;
  queEs: string;
  paraQueSirve: string;
  pasos: string[];
  ojo?: string; // algo que conviene saber antes de usarlo
};

/** Textos de ayuda de cada sección, en lenguaje de todos los días. Una sola fuente: la sugerencia de primera vez, el botón "?" y la pantalla de Instrucciones leen de aquí. */
export const TEMAS = {
  inicio: {
    titulo: "Inicio",
    icono: "inicio",
    queEs: "El resumen de tu casa: cuánta energía han gastado hoy tus aparatos, en pesos.",
    paraQueSirve: "Para saber de un vistazo si vas bien o si te estás pasando de lo que normalmente pagas en la factura de EPM.",
    pasos: [
      "El semáforo compara tu mes con el promedio de tus últimas facturas: verde es bien, amarillo es medio alto, rojo es alto.",
      "Toca el nombre de la casa para cambiar de casa o agregar otra.",
      "Toca un aparato para ver cuánto gasta, apagarlo o prenderlo.",
      "Desliza hacia abajo para actualizar.",
    ],
  },
  enchufes: {
    titulo: "Enchufes",
    icono: "enchufe",
    queEs: "Los enchufes inteligentes que mides: cada uno cuenta cuánta energía gasta el aparato que tiene conectado.",
    paraQueSirve: "Para saber cuánto cuesta en pesos tener prendido el televisor, la nevera o el ventilador, y poder apagarlo desde el celular.",
    pasos: [
      "Conecta el enchufe a la pared y el aparato al enchufe.",
      "Tócalo para cambiarle el nombre, elegir qué agente lo lee o quitarlo.",
      "En Inicio, toca el aparato para ver su consumo y apagarlo o prenderlo.",
      "Para agregar uno nuevo, necesitas su código (ID de Tuya). Lo ves en la app Smart Life, en los datos del dispositivo.",
    ],
    ojo: "El enchufe BSD04 aguanta hasta 10 A (unos 1.100 W): no lo uses con aire acondicionado, plancha ni calentadores.",
  },
  agentes: {
    titulo: "Agentes",
    icono: "agente",
    queEs: "Un programa que corre en un computador de tu casa, conectado a la misma WiFi que los enchufes.",
    paraQueSirve: "Lee tus enchufes cada 5 segundos y manda los datos a la nube. Sin agente conectado, la app no recibe lecturas.",
    pasos: [
      "Toca «Agregar agente», ponle un nombre y verás un código de 6 números (vale 10 minutos).",
      "En el computador de tu casa, abre el programa «Apague y vámonos» y escribe ese código.",
      "Listo: esta pantalla avisa cuando el agente quedó conectado. No tienes que copiar nada más.",
      "En Enchufes, abre cada enchufe y elige qué agente lo lee. Puedes cambiarlo o quitarlo cuando quieras.",
      "Aquí puedes cambiarle el nombre a un agente, usarlo en otro computador (con un código nuevo) o eliminarlo; sus enchufes quedan sin agente.",
    ],
    ojo: "Cada enchufe lo lee un solo agente, y solo ese agente puede prenderlo o apagarlo. El computador debe estar prendido y en la misma WiFi del enchufe. Si se apaga, no se pierde nada: al volver reenvía lo guardado.",
  },
  rutinas: {
    titulo: "Rutinas",
    icono: "rutina",
    queEs: "Horarios para que un aparato se apague (y se prenda) solo.",
    paraQueSirve: "Para no dejar prendida la plancha o el calentador por olvido, y ahorrar sin acordarte.",
    pasos: [
      "Toca «Nueva rutina» y elige el aparato.",
      "Elige los días y la hora de apagado (y, si quieres, la de encendido).",
      "Te mostramos cuánto ahorrarías aproximadamente.",
    ],
    ojo: "Nunca programes apagar la nevera ni el congelador.",
  },
  facturas: {
    titulo: "Facturas y medidor",
    icono: "factura",
    queEs: "Los datos de tu factura de EPM y la lectura de tu medidor.",
    paraQueSirve: "Tu promedio de los últimos meses es lo «normal» de tu casa: contra él medimos cuánto ahorras. La lectura del medidor nos dice cuánto lleva este mes toda la casa, no solo los enchufes.",
    pasos: [
      "Anota los kWh de los últimos meses (al menos 3) tal como salen en el cuadro de historial de tu factura.",
      "Cada cierto tiempo anota la lectura de tu medidor.",
      "Con eso el semáforo y la línea de subsistencia se vuelven más exactos.",
    ],
  },
  prepago: {
    titulo: "Saldo prepago",
    icono: "prepago",
    queEs: "Para casas con medidor prepago: tu saldo y cuántos días te alcanza.",
    paraQueSirve: "Para no quedarte sin energía de sorpresa: te avisamos cuando te queden menos de 2 días.",
    pasos: ["Anota tu saldo cada vez que recargues o lo consultes.", "Calculamos los días que te quedan con lo que gastas en promedio."],
  },
  consejos: {
    titulo: "Consejos",
    icono: "consejo",
    queEs: "Sugerencias para pagar menos, hechas con lo que miden tus enchufes y tu factura.",
    paraQueSirve: "Para saber qué aparato conviene apagar, programar o cambiar, y cuánto te ahorraría en pesos.",
    pasos: ["Lee el consejo y toca el botón para hacerlo.", "Mientras más días de datos, mejores consejos."],
  },
  simulador: {
    titulo: "¿Cambiar un aparato?",
    icono: "simulador",
    queEs: "Una calculadora que compara tu aparato viejo con uno nuevo más eficiente (etiqueta RETIQ).",
    paraQueSirve: "Para saber si comprar un aparato nuevo se paga solo con lo que ahorras, y en cuánto tiempo.",
    pasos: [
      "Pon cuánto gasta el aparato viejo (lo medimos con el enchufe) y cuánto dice la etiqueta del nuevo.",
      "Pon el precio del nuevo.",
      "Te decimos en cuánto tiempo recuperas lo que pagas y si conviene.",
    ],
    ojo: "Es una estimación: usa la tarifa actual y supone que el precio de la energía no sube.",
  },
  avisos: {
    titulo: "Avisos",
    icono: "avisos",
    queEs: "Las alertas de tu casa: un aparato que lleva mucho prendido o que gastó más de lo normal, que te acercas a la línea de subsistencia o que se acaba el saldo.",
    paraQueSirve: "Para actuar a tiempo, incluso apagando el aparato desde el aviso.",
    pasos: ["Toca un aviso para marcarlo como leído.", "Elige abajo cada cuánto quieres que te avisemos."],
  },
  casas: {
    titulo: "Mis casas",
    icono: "casas",
    queEs: "Puedes tener varias casas en la misma cuenta (la tuya, la de tus papás, un local).",
    paraQueSirve: "Cada casa tiene sus propios enchufes, agente, facturas y avisos, y no se mezclan.",
    pasos: ["Toca el nombre de una casa para verla.", "Toca «Agregar otra casa» e indica su estrato."],
  },
} as const satisfies Record<string, TemaAyuda>;

export type NombreTema = keyof typeof TEMAS;
export const ORDEN_TEMAS = Object.keys(TEMAS) as NombreTema[];
