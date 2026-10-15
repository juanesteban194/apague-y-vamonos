import { router } from "expo-router";
import { View } from "react-native";

import { cerrarSesion } from "@/api/cliente";
import { useHogarActual } from "@/api/hogar";
import { usePerfilActual } from "@/api/perfil";
import { Boton } from "@/components/Boton";
import { Icono } from "@/components/Icono";
import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { reiniciarAyuda } from "@/features/ayuda/estado";
import { colores, espacio } from "@/theme";

export default function Ajustes() {
  const { data: perfil } = usePerfilActual();
  const { hogar, hogares } = useHogarActual();
  return (
    <Pantalla>
      <Texto variante="titulo" style={{ fontSize: 26, fontWeight: "800" }}>Ajustes</Texto>

      <Tarjeta style={{ gap: espacio.s }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icono nombre="cuenta" tamano={44} color={colores.textoSecundario} />
          <View style={{ flex: 1 }}>
            {perfil ? (
              <>
                <Texto style={{ fontWeight: "700" }}>{perfil.nombre}</Texto>
                <Texto variante="secundario" color={colores.textoSecundario}>
                  {perfil.email}
                  {perfil.tiene_google ? " · con Google" : ""}
                </Texto>
              </>
            ) : (
              <Texto color={colores.textoSecundario}>Cargando…</Texto>
            )}
          </View>
        </View>
      </Tarjeta>

      <Tarjeta style={{ gap: espacio.s }}>
        <Texto variante="subtitulo">Mis casas</Texto>
        <Texto color={colores.textoSecundario}>
          {hogar ? `Estás viendo ${hogar.nombre}.` : "Aún no tienes casas."}
          {hogares && hogares.length > 1 ? ` Tienes ${hogares.length} casas.` : ""}
        </Texto>
        <Boton titulo="Ver y cambiar de casa" variante="secundario" icono={<Icono nombre="casas" />} onPress={() => router.push("/casas")} />
      </Tarjeta>

      <Tarjeta style={{ gap: espacio.s }}>
        <Texto variante="subtitulo">Ayuda</Texto>
        <Boton titulo="Instrucciones" variante="secundario" icono={<Icono nombre="instrucciones" />} onPress={() => router.push("/instrucciones")} />
        <Boton titulo="Volver a mostrar las sugerencias" variante="secundario" onPress={() => void reiniciarAyuda()} />
      </Tarjeta>

      <Tarjeta style={{ gap: espacio.s }}>
        <Texto variante="subtitulo">Tus datos</Texto>
        <Boton titulo="Política de tratamiento de datos" variante="secundario" icono={<Icono nombre="info" />} onPress={() => router.push("/politica")} />
        <Boton titulo="Eliminar mi cuenta" variante="secundario" icono={<Icono nombre="borrar" color={colores.rojo} />} onPress={() => router.push("/eliminar-cuenta")} />
      </Tarjeta>

      <Boton titulo="Cerrar sesión" variante="secundario" icono={<Icono nombre="salir" />} onPress={() => void cerrarSesion()} />
    </Pantalla>
  );
}
