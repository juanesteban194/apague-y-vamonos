import { router } from "expo-router";
import { Alert, Linking, View } from "react-native";

import { useHogarActual } from "@/api/hogar";
import { Pantalla } from "@/components/Pantalla";
import { FilaLista, IconoEnCaja, Separador } from "@/components/Primitivos";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { SOPORTE, enlaceCorreo, enlaceWhatsApp, numeroLegible } from "@/features/soporte/contacto";
import { colores, espacio } from "@/theme";

/** Abre el canal; si el teléfono no puede, muestra el dato para copiarlo a mano. */
async function abrir(url: string, siFalla: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("No pudimos abrirlo", siFalla);
  }
}

/** Ayuda al cliente: WhatsApp y correo del equipo, con el mensaje ya empezado. */
export default function Soporte() {
  const { hogar } = useHogarActual();
  const { whatsapp, correo } = SOPORTE;
  return (
    <Pantalla conCabecera>
      <View style={{ gap: espacio.m, paddingTop: espacio.s }}>
        <IconoEnCaja nombre="soporte" tamano={56} />
        <Texto variante="titulo" accessibilityRole="header">
          ¿Necesitas una mano?
        </Texto>
        <Texto color={colores.textoSecundario}>Escríbenos y te responde una persona del equipo. Te dejamos el mensaje empezado.</Texto>
      </View>

      <Tarjeta style={{ padding: 0, gap: 0, overflow: "hidden" }}>
        {whatsapp && (
          <>
            <FilaLista
              titulo="Escribir por WhatsApp"
              detalle={numeroLegible(whatsapp)}
              icono="whatsapp"
              tonoIcono="verde"
              etiquetaAccesible={`Escribir por WhatsApp al ${numeroLegible(whatsapp)}`}
              alPulsar={() => void abrir(enlaceWhatsApp(whatsapp), `Escríbenos al ${numeroLegible(whatsapp)}.`)}
            />
            {correo && <Separador sangria={66} />}
          </>
        )}
        {correo && (
          <FilaLista
            titulo="Escribir un correo"
            detalle={correo}
            icono="correoLinea"
            etiquetaAccesible={`Escribir un correo a ${correo}`}
            alPulsar={() => void abrir(enlaceCorreo(correo, hogar?.nombre), `Escríbenos a ${correo}.`)}
          />
        )}
      </Tarjeta>

      <Texto variante="secundario" color={colores.textoSecundario} style={{ marginHorizontal: 4 }}>
        Para ayudarte más rápido, cuéntanos qué pasó y en qué pantalla estabas.
      </Texto>

      <Tarjeta variante="plana" style={{ padding: 0, gap: 0, overflow: "hidden" }}>
        <FilaLista titulo="Antes de escribir" detalle="Quizá la respuesta está en Instrucciones" icono="instrucciones" etiquetaAccesible="Ver las instrucciones" alPulsar={() => router.push("/instrucciones")} />
      </Tarjeta>
    </Pantalla>
  );
}
