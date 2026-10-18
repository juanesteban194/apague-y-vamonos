import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colores } from "@/theme";

type Ion = ComponentProps<typeof Ionicons>["name"];
type Mci = ComponentProps<typeof MaterialCommunityIcons>["name"];

/** Íconos de la app: un nombre por significado, sacados de dos librerías reales (Ionicons y Material Design Icons).
 *  Las pantallas piden el significado ("enchufe"), no el glifo, para poder cambiar uno sin tocar cada pantalla. */
const ICONOS = {
  inicio: ["ion", "home"],
  explorar: ["ion", "grid"],
  avisos: ["ion", "notifications"],
  ajustes: ["ion", "settings"],
  // Variantes de línea: las pestañas sin elegir se dibujan solo con el contorno, como en iOS.
  inicioLinea: ["ion", "home-outline"],
  explorarLinea: ["ion", "grid-outline"],
  avisosLinea: ["ion", "notifications-outline"],
  ajustesLinea: ["ion", "settings-outline"],
  casa: ["ion", "home"],
  casas: ["mci", "home-city"],
  enchufe: ["mci", "power-plug"],
  agente: ["mci", "laptop"],
  rutina: ["ion", "alarm"],
  factura: ["mci", "receipt-text"],
  medidor: ["mci", "gauge"],
  prepago: ["ion", "wallet"],
  consejo: ["ion", "bulb"],
  simulador: ["mci", "swap-horizontal-bold"],
  ayuda: ["ion", "help-circle"],
  instrucciones: ["ion", "book"],
  cuenta: ["ion", "person-circle"],
  salir: ["ion", "log-out-outline"],
  correo: ["ion", "mail"],
  ubicacion: ["ion", "location"],
  tarifa: ["ion", "flash"],
  mas: ["ion", "add-circle"],
  ok: ["ion", "checkmark-circle"],
  info: ["ion", "information-circle"],
  cerrar: ["ion", "close"],
  adelante: ["ion", "chevron-forward"],
  abajo: ["ion", "chevron-down"],
  editar: ["ion", "create-outline"],
  borrar: ["ion", "trash-outline"],
  atras: ["ion", "chevron-back"],
  rayo: ["ion", "flash"],
  reloj: ["ion", "time-outline"],
  grafica: ["ion", "bar-chart-outline"],
  tendenciaArriba: ["ion", "trending-up"],
  tendenciaAbajo: ["ion", "trending-down"],
  candado: ["ion", "lock-closed-outline"],
  escudo: ["ion", "shield-checkmark-outline"],
  calendario: ["ion", "calendar-outline"],
  dinero: ["ion", "cash-outline"],
  hoja: ["ion", "leaf-outline"],
  alerta: ["ion", "alert-circle"],
  alertaLinea: ["ion", "alert-circle-outline"],
  infoLinea: ["ion", "information-circle-outline"],
  okLinea: ["ion", "checkmark-circle-outline"],
  marca: ["ion", "checkmark"],
  luna: ["ion", "moon-outline"],
  sol: ["ion", "sunny-outline"],
  chispa: ["ion", "sparkles-outline"],
  estrella: ["ion", "star-outline"],
  copiar: ["ion", "copy-outline"],
  compartir: ["ion", "share-outline"],
  llave: ["ion", "key-outline"],
  nube: ["ion", "cloud-outline"],
  telefono: ["ion", "phone-portrait-outline"],
  menos: ["ion", "remove-circle-outline"],
  flechaArriba: ["ion", "arrow-up"],
  flechaAbajo: ["ion", "arrow-down"],
  flechaDerecha: ["ion", "arrow-forward"],
  apagar: ["ion", "power"],
  ojo: ["ion", "eye-outline"],
  ojoCerrado: ["ion", "eye-off-outline"],
  buscar: ["ion", "search-outline"],
  filtro: ["ion", "options-outline"],
  refrescar: ["ion", "refresh-outline"],
  enchufeLinea: ["mci", "power-plug-outline"],
  agenteLinea: ["mci", "laptop"],
  rutinaLinea: ["ion", "alarm-outline"],
  facturaLinea: ["mci", "receipt-text-outline"],
  prepagoLinea: ["ion", "wallet-outline"],
  consejoLinea: ["ion", "bulb-outline"],
  casaLinea: ["ion", "home-outline"],
  medidorLinea: ["mci", "gauge"],
  nevera: ["mci", "fridge-outline"],
  lavadora: ["mci", "washing-machine"],
  ventilador: ["mci", "fan"],
  plancha: ["mci", "iron-outline"],
  microondas: ["mci", "microwave"],
  bombillo: ["mci", "lightbulb-outline"],
  cargador: ["mci", "power-plug-battery-outline"],
  termometro: ["mci", "thermometer"],
  etiqueta: ["mci", "tag-outline"],
  semaforo: ["mci", "traffic-light-outline"],
  conectado: ["ion", "wifi"],
  tv: ["ion", "tv"],
  celular: ["ion", "battery-charging"],
  hamburguesa: ["ion", "fast-food"],
  leche: ["mci", "cup-water"],
} as const satisfies Record<string, readonly ["ion", Ion] | readonly ["mci", Mci]>;

export type NombreIcono = keyof typeof ICONOS;

type Props = { nombre: NombreIcono; tamano?: number; color?: string };

export function Icono({ nombre, tamano = 24, color = colores.texto }: Props) {
  const [familia, glifo] = ICONOS[nombre];
  // Decorativo: el texto de al lado dice lo mismo, así que el lector de pantalla lo salta.
  const comun = { size: tamano, color, "aria-hidden": true } as const;
  return familia === "ion" ? <Ionicons name={glifo as Ion} {...comun} /> : <MaterialCommunityIcons name={glifo as Mci} {...comun} />;
}

/** La "G" de Google con sus cuatro colores oficiales (las marcas se usan tal cual, no se recolorean). */
export function LogoGoogle({ tamano = 22 }: { tamano?: number }) {
  return (
    <View aria-hidden>
      <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <Path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <Path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29a11.86 11.86 0 0 0 0 10.76l3.98-3.09z" />
      <Path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
      </Svg>
    </View>
  );
}
