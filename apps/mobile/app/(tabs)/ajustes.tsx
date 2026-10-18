import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { View } from "react-native";

import { cerrarSesion } from "@/api/cliente";
import { useHogarActual } from "@/api/hogar";
import { usePerfilActual } from "@/api/perfil";
import { Iniciales } from "@/components/GestionPiezas";
import { Pantalla } from "@/components/Pantalla";
import { FilaLista, Pastilla, Separador } from "@/components/Primitivos";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { reiniciarAyuda } from "@/features/ayuda/estado";
import { exito } from "@/lib/haptica";
import { colores, espacio } from "@/theme";

const SANGRIA = 66; // la línea empieza donde empieza el texto, no el ícono
const sinFlecha = <View />; // las acciones inmediatas (cerrar sesión) no llevan flecha: no abren otra pantalla

/** Un grupo de la lista, con su título encima, como en los Ajustes de iOS. */
function Grupo({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <View style={{ gap: espacio.s }}>
      {titulo && (
        <Texto variante="secundario" color={colores.textoSecundario} accessibilityRole="header" style={{ fontWeight: "600", marginLeft: 4 }}>
          {titulo}
        </Texto>
      )}
      <Tarjeta style={{ padding: 0, gap: 0, overflow: "hidden" }}>{children}</Tarjeta>
    </View>
  );
}

/** Quién eres: iniciales, nombre, correo y si el correo está verificado. */
function Perfil() {
  const { data: perfil } = usePerfilActual();
  if (!perfil) {
    return (
      <View style={{ alignItems: "center", gap: espacio.m, paddingVertical: espacio.m }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colores.tarjetaHundida }} />
        <Texto color={colores.textoSecundario}>Cargando tu cuenta…</Texto>
      </View>
    );
  }
  return (
    <View style={{ gap: espacio.l }}>
      <View style={{ alignItems: "center", gap: espacio.m, paddingTop: espacio.xs }}>
        <Iniciales nombre={perfil.nombre} tamano={76} forma="redonda" />
        <View style={{ alignItems: "center", gap: 2 }}>
          <Texto variante="titulo" style={{ textAlign: "center" }}>
            {perfil.nombre}
          </Texto>
          <Texto color={colores.textoSecundario} style={{ textAlign: "center" }}>
            {perfil.email}
          </Texto>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: espacio.s }}>
          <Pastilla
            texto={perfil.email_verificado ? "Correo verificado" : "Correo sin verificar"}
            tono={perfil.email_verificado ? "verde" : "ambar"}
            icono={perfil.email_verificado ? "okLinea" : "alertaLinea"}
          />
          {perfil.tiene_google && <Pastilla texto="Entras con Google" />}
        </View>
      </View>
      {!perfil.email_verificado && (
        <Grupo>
          <FilaLista
            titulo="Verificar mi correo"
            detalle="Te mandamos un código de 6 números"
            icono="correo"
            tonoIcono="ambar"
            etiquetaAccesible="Verificar mi correo"
            alPulsar={() => router.push("/verificar-correo")}
          />
        </Grupo>
      )}
    </View>
  );
}

export default function Ajustes() {
  const { hogar } = useHogarActual();
  const [sugerenciasDeVuelta, setSugerenciasDeVuelta] = useState(false);
  const casa = hogar ? `Estás viendo ${hogar.nombre}` : "Aún no tienes casas";

  return (
    <Pantalla titulo="Ajustes">
      <Perfil />

      <Grupo titulo="Tu casa">
        <FilaLista titulo="Mis casas" detalle={casa} icono="casaLinea" etiquetaAccesible={`Mis casas. ${casa}. Ver y cambiar de casa`} alPulsar={() => router.push("/casas")} />
      </Grupo>

      <Grupo titulo="Ayuda">
        <FilaLista titulo="Ayuda al cliente" detalle="Escríbenos por WhatsApp o correo" icono="soporte" etiquetaAccesible="Ayuda al cliente" alPulsar={() => router.push("/soporte")} />
        <Separador sangria={SANGRIA} />
        <FilaLista titulo="Instrucciones" detalle="Cómo funciona cada parte" icono="instrucciones" etiquetaAccesible="Instrucciones" alPulsar={() => router.push("/instrucciones")} />
        <Separador sangria={SANGRIA} />
        <FilaLista
          titulo="Volver a mostrar las sugerencias"
          detalle={sugerenciasDeVuelta ? "Listo: volverán a salir." : "Las ayudas de la primera vez"}
          icono={sugerenciasDeVuelta ? "okLinea" : "chispa"}
          tonoIcono={sugerenciasDeVuelta ? "verde" : "neutro"}
          derecha={sinFlecha}
          alPulsar={() => {
            void reiniciarAyuda();
            setSugerenciasDeVuelta(true);
            exito();
          }}
        />
      </Grupo>

      <Grupo titulo="Tus datos">
        <FilaLista titulo="Tratamiento de datos" detalle="Cómo cuidamos tu información" icono="escudo" etiquetaAccesible="Política de tratamiento de datos" alPulsar={() => router.push("/politica")} />
      </Grupo>

      <Grupo>
        <FilaLista titulo="Cerrar sesión" icono="salir" derecha={sinFlecha} etiquetaAccesible="Cerrar sesión" alPulsar={() => void cerrarSesion()} />
        <Separador sangria={SANGRIA} />
        <FilaLista titulo="Eliminar mi cuenta" icono="borrar" tonoIcono="rojo" destructiva etiquetaAccesible="Eliminar mi cuenta" alPulsar={() => router.push("/eliminar-cuenta")} />
      </Grupo>
    </Pantalla>
  );
}
