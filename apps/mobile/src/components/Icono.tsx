import type { Icon as IconoPhosphor, IconWeight } from "phosphor-react-native";
import { AlarmIcon } from "phosphor-react-native/src/icons/Alarm";
import { ArrowClockwiseIcon } from "phosphor-react-native/src/icons/ArrowClockwise";
import { ArrowDownIcon } from "phosphor-react-native/src/icons/ArrowDown";
import { ArrowRightIcon } from "phosphor-react-native/src/icons/ArrowRight";
import { ArrowUpIcon } from "phosphor-react-native/src/icons/ArrowUp";
import { ArrowsLeftRightIcon } from "phosphor-react-native/src/icons/ArrowsLeftRight";
import { BatteryChargingIcon } from "phosphor-react-native/src/icons/BatteryCharging";
import { BellIcon } from "phosphor-react-native/src/icons/Bell";
import { BookOpenIcon } from "phosphor-react-native/src/icons/BookOpen";
import { BuildingsIcon } from "phosphor-react-native/src/icons/Buildings";
import { CalendarBlankIcon } from "phosphor-react-native/src/icons/CalendarBlank";
import { CaretDownIcon } from "phosphor-react-native/src/icons/CaretDown";
import { CaretLeftIcon } from "phosphor-react-native/src/icons/CaretLeft";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { ChartBarIcon } from "phosphor-react-native/src/icons/ChartBar";
import { CheckIcon } from "phosphor-react-native/src/icons/Check";
import { CheckCircleIcon } from "phosphor-react-native/src/icons/CheckCircle";
import { ClockIcon } from "phosphor-react-native/src/icons/Clock";
import { CloudIcon } from "phosphor-react-native/src/icons/Cloud";
import { CopyIcon } from "phosphor-react-native/src/icons/Copy";
import { DeviceMobileIcon } from "phosphor-react-native/src/icons/DeviceMobile";
import { DropIcon } from "phosphor-react-native/src/icons/Drop";
import { EnvelopeIcon } from "phosphor-react-native/src/icons/Envelope";
import { ExportIcon } from "phosphor-react-native/src/icons/Export";
import { EyeIcon } from "phosphor-react-native/src/icons/Eye";
import { EyeSlashIcon } from "phosphor-react-native/src/icons/EyeSlash";
import { FanIcon } from "phosphor-react-native/src/icons/Fan";
import { GaugeIcon } from "phosphor-react-native/src/icons/Gauge";
import { GearSixIcon } from "phosphor-react-native/src/icons/GearSix";
import { HamburgerIcon } from "phosphor-react-native/src/icons/Hamburger";
import { HouseIcon } from "phosphor-react-native/src/icons/House";
import { InfoIcon } from "phosphor-react-native/src/icons/Info";
import { KeyIcon } from "phosphor-react-native/src/icons/Key";
import { LaptopIcon } from "phosphor-react-native/src/icons/Laptop";
import { LeafIcon } from "phosphor-react-native/src/icons/Leaf";
import { LightbulbIcon } from "phosphor-react-native/src/icons/Lightbulb";
import { LightbulbFilamentIcon } from "phosphor-react-native/src/icons/LightbulbFilament";
import { LightningIcon } from "phosphor-react-native/src/icons/Lightning";
import { LockIcon } from "phosphor-react-native/src/icons/Lock";
import { MagnifyingGlassIcon } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { MapPinIcon } from "phosphor-react-native/src/icons/MapPin";
import { MinusCircleIcon } from "phosphor-react-native/src/icons/MinusCircle";
import { MoneyIcon } from "phosphor-react-native/src/icons/Money";
import { MoonIcon } from "phosphor-react-native/src/icons/Moon";
import { OvenIcon } from "phosphor-react-native/src/icons/Oven";
import { PencilSimpleIcon } from "phosphor-react-native/src/icons/PencilSimple";
import { PlugIcon } from "phosphor-react-native/src/icons/Plug";
import { PlugChargingIcon } from "phosphor-react-native/src/icons/PlugCharging";
import { PlusCircleIcon } from "phosphor-react-native/src/icons/PlusCircle";
import { PowerIcon } from "phosphor-react-native/src/icons/Power";
import { QuestionIcon } from "phosphor-react-native/src/icons/Question";
import { ReceiptIcon } from "phosphor-react-native/src/icons/Receipt";
import { ShieldCheckIcon } from "phosphor-react-native/src/icons/ShieldCheck";
import { SignOutIcon } from "phosphor-react-native/src/icons/SignOut";
import { SlidersHorizontalIcon } from "phosphor-react-native/src/icons/SlidersHorizontal";
import { SparkleIcon } from "phosphor-react-native/src/icons/Sparkle";
import { SquaresFourIcon } from "phosphor-react-native/src/icons/SquaresFour";
import { StarIcon } from "phosphor-react-native/src/icons/Star";
import { SunIcon } from "phosphor-react-native/src/icons/Sun";
import { TShirtIcon } from "phosphor-react-native/src/icons/TShirt";
import { TagIcon } from "phosphor-react-native/src/icons/Tag";
import { TelevisionSimpleIcon } from "phosphor-react-native/src/icons/TelevisionSimple";
import { ThermometerIcon } from "phosphor-react-native/src/icons/Thermometer";
import { TrafficSignalIcon } from "phosphor-react-native/src/icons/TrafficSignal";
import { TrashIcon } from "phosphor-react-native/src/icons/Trash";
import { TrendDownIcon } from "phosphor-react-native/src/icons/TrendDown";
import { TrendUpIcon } from "phosphor-react-native/src/icons/TrendUp";
import { UserCircleIcon } from "phosphor-react-native/src/icons/UserCircle";
import { WalletIcon } from "phosphor-react-native/src/icons/Wallet";
import { WarningCircleIcon } from "phosphor-react-native/src/icons/WarningCircle";
import { WashingMachineIcon } from "phosphor-react-native/src/icons/WashingMachine";
import { WifiHighIcon } from "phosphor-react-native/src/icons/WifiHigh";
import { XIcon } from "phosphor-react-native/src/icons/X";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colores } from "@/theme";

/** Peso del ícono (Phosphor): `light` trazo fino (el de la app: minimalista) · `fill` lleno (pestaña elegida) · `regular` un poco más marcado. */
export type PesoIcono = IconWeight;

/** Íconos de la app: un nombre por significado, de Phosphor Icons (una sola familia, la de muchas apps financieras).
 *  Las pantallas piden el significado ("enchufe"), no el glifo, para poder cambiar uno sin tocar cada pantalla.
 *  Cada uno trae su peso por omisión: lleno solo para la pestaña elegida y trazo fino (light) para todo lo demás. */
const ICONOS = {
  inicio: [HouseIcon, "fill"],
  explorar: [SquaresFourIcon, "fill"],
  avisos: [BellIcon, "fill"],
  ajustes: [GearSixIcon, "fill"],
  inicioLinea: [HouseIcon, "light"],
  explorarLinea: [SquaresFourIcon, "light"],
  avisosLinea: [BellIcon, "light"],
  ajustesLinea: [GearSixIcon, "light"],
  casa: [HouseIcon, "light"],
  casas: [BuildingsIcon, "light"],
  enchufe: [PlugIcon, "light"],
  agente: [LaptopIcon, "light"],
  rutina: [AlarmIcon, "light"],
  factura: [ReceiptIcon, "light"],
  medidor: [GaugeIcon, "light"],
  prepago: [WalletIcon, "light"],
  consejo: [LightbulbIcon, "light"],
  simulador: [ArrowsLeftRightIcon, "regular"],
  ayuda: [QuestionIcon, "light"],
  instrucciones: [BookOpenIcon, "light"],
  cuenta: [UserCircleIcon, "light"],
  salir: [SignOutIcon, "light"],
  correo: [EnvelopeIcon, "light"],
  ubicacion: [MapPinIcon, "light"],
  tarifa: [LightningIcon, "light"],
  mas: [PlusCircleIcon, "light"],
  ok: [CheckCircleIcon, "light"],
  info: [InfoIcon, "light"],
  cerrar: [XIcon, "light"],
  adelante: [CaretRightIcon, "light"],
  abajo: [CaretDownIcon, "light"],
  editar: [PencilSimpleIcon, "light"],
  borrar: [TrashIcon, "light"],
  atras: [CaretLeftIcon, "light"],
  rayo: [LightningIcon, "light"],
  reloj: [ClockIcon, "light"],
  grafica: [ChartBarIcon, "light"],
  tendenciaArriba: [TrendUpIcon, "light"],
  tendenciaAbajo: [TrendDownIcon, "light"],
  candado: [LockIcon, "light"],
  escudo: [ShieldCheckIcon, "light"],
  calendario: [CalendarBlankIcon, "light"],
  dinero: [MoneyIcon, "light"],
  hoja: [LeafIcon, "light"],
  alerta: [WarningCircleIcon, "light"],
  alertaLinea: [WarningCircleIcon, "light"],
  infoLinea: [InfoIcon, "light"],
  okLinea: [CheckCircleIcon, "light"],
  marca: [CheckIcon, "regular"],
  luna: [MoonIcon, "light"],
  sol: [SunIcon, "light"],
  chispa: [SparkleIcon, "light"],
  estrella: [StarIcon, "light"],
  copiar: [CopyIcon, "light"],
  compartir: [ExportIcon, "light"],
  llave: [KeyIcon, "light"],
  nube: [CloudIcon, "light"],
  telefono: [DeviceMobileIcon, "light"],
  menos: [MinusCircleIcon, "light"],
  flechaArriba: [ArrowUpIcon, "light"],
  flechaAbajo: [ArrowDownIcon, "light"],
  flechaDerecha: [ArrowRightIcon, "light"],
  apagar: [PowerIcon, "regular"],
  ojo: [EyeIcon, "light"],
  ojoCerrado: [EyeSlashIcon, "light"],
  buscar: [MagnifyingGlassIcon, "light"],
  filtro: [SlidersHorizontalIcon, "light"],
  refrescar: [ArrowClockwiseIcon, "light"],
  enchufeLinea: [PlugIcon, "light"],
  agenteLinea: [LaptopIcon, "light"],
  rutinaLinea: [AlarmIcon, "light"],
  facturaLinea: [ReceiptIcon, "light"],
  prepagoLinea: [WalletIcon, "light"],
  consejoLinea: [LightbulbIcon, "light"],
  casaLinea: [HouseIcon, "light"],
  medidorLinea: [GaugeIcon, "light"],
  lavadora: [WashingMachineIcon, "light"],
  ventilador: [FanIcon, "light"],
  plancha: [TShirtIcon, "light"],
  microondas: [OvenIcon, "light"],
  bombillo: [LightbulbFilamentIcon, "light"],
  cargador: [PlugChargingIcon, "light"],
  termometro: [ThermometerIcon, "light"],
  etiqueta: [TagIcon, "light"],
  semaforo: [TrafficSignalIcon, "light"],
  conectado: [WifiHighIcon, "light"],
  tv: [TelevisionSimpleIcon, "light"],
  celular: [BatteryChargingIcon, "light"],
  hamburguesa: [HamburgerIcon, "light"],
  leche: [DropIcon, "light"],
  // Phosphor no tiene nevera: se dibuja aquí con su misma retícula y su mismo trazo.
  nevera: ["nevera", "light"],
} as const satisfies Record<string, readonly [IconoPhosphor | "nevera", PesoIcono]>;

export type NombreIcono = keyof typeof ICONOS;

type Props = { nombre: NombreIcono; tamano?: number; color?: string; peso?: PesoIcono };

export function Icono({ nombre, tamano = 24, color = colores.texto, peso }: Props) {
  const [Componente, pesoPorOmision] = ICONOS[nombre];
  // Decorativo: el texto de al lado dice lo mismo, así que el lector de pantalla lo salta.
  if (Componente === "nevera") return <Nevera tamano={tamano} color={color} peso={peso ?? pesoPorOmision} />;
  return (
    <View aria-hidden pointerEvents="none">
      <Componente size={tamano} color={color} weight={peso ?? pesoPorOmision} />
    </View>
  );
}

/** Nevera con la retícula de Phosphor (256 × 256): cuerpo redondeado, división del congelador y dos manijas. */
function Nevera({ tamano, color, peso }: { tamano: number; color: string; peso: PesoIcono }) {
  const trazo = { thin: 8, light: 12, regular: 16, bold: 24, fill: 16, duotone: 16 }[peso];
  const lleno = peso === "fill";
  return (
    <View aria-hidden pointerEvents="none">
      <Svg width={tamano} height={tamano} viewBox="0 0 256 256" fill="none" stroke={lleno ? "none" : color} strokeWidth={trazo} strokeLinecap="round" strokeLinejoin="round">
        {lleno ? (
          <Path fill={color} d="M184 24H72a24 24 0 0 0-24 24v160a24 24 0 0 0 24 24h112a24 24 0 0 0 24-24V48a24 24 0 0 0-24-24ZM96 76a8 8 0 0 1-16 0V64a8 8 0 0 1 16 0Zm0 72a8 8 0 0 1-16 0v-24a8 8 0 0 1 16 0Zm96-48H64V48a8 8 0 0 1 8-8h112a8 8 0 0 1 8 8Z" />
        ) : (
          <>
            <Path d="M72 32h112a16 16 0 0 1 16 16v160a16 16 0 0 1-16 16H72a16 16 0 0 1-16-16V48a16 16 0 0 1 16-16Z" />
            <Path d="M56 104h144" />
            <Path d="M88 64v16" />
            <Path d="M88 128v24" />
          </>
        )}
      </Svg>
    </View>
  );
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
