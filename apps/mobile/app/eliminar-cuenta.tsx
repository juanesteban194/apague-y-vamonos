import { useState } from "react";
import { Alert } from "react-native";

import { eliminarCuenta, ErrorApi } from "@/api/cliente";
import { usePerfilActual } from "@/api/perfil";
import { cerrarSesion } from "@/api/sesion";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { colores, espacio } from "@/theme";

/** Derecho de supresión (Ley 1581): borra la cuenta y los datos. Las cuentas con contraseña la confirman. */
export default function EliminarCuenta() {
  const { data: perfil } = usePerfilActual();
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pideContrasena = perfil?.tiene_contrasena === true; // hasta que cargue el perfil el botón sigue apagado: no se sabe si hace falta

  async function borrar() {
    setError(null);
    setCargando(true);
    try {
      await eliminarCuenta(pideContrasena ? contrasena : undefined);
      await cerrarSesion(); // la navegación vuelve sola a la pantalla de entrada
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo eliminar la cuenta. Intenta de nuevo.");
      setCargando(false);
    }
  }

  function confirmar() {
    Alert.alert("¿Eliminar tu cuenta?", "Se borran tu cuenta y todos tus datos, y no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => void borrar() },
    ]);
  }

  return (
    <PantallaFormulario>
      <Texto variante="titulo">Eliminar mi cuenta</Texto>
      <Tarjeta style={{ gap: espacio.s, backgroundColor: colores.rojoFondo }}>
        <Texto variante="subtitulo">Esto borra, para siempre:</Texto>
        <Texto>• Tu cuenta ({perfil?.email ?? "tu correo"}).</Texto>
        <Texto>• Las casas en las que eres la única persona, con sus enchufes, historial de consumo, agentes, avisos, facturas y rutinas.</Texto>
        <Texto>• Las casas compartidas no se borran: solo sales tú.</Texto>
        <Texto>Los programas de agente de tus casas dejan de funcionar. No se puede deshacer.</Texto>
      </Tarjeta>
      {pideContrasena && (
        <Campo
          etiqueta="Escribe tu contraseña para confirmar"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          value={contrasena}
          onChangeText={setContrasena}
        />
      )}
      {error && (
        <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
          {error}
        </Texto>
      )}
      <Boton titulo="Eliminar mi cuenta y mis datos" onPress={confirmar} cargando={cargando} deshabilitado={!perfil || (pideContrasena && !contrasena)} />
    </PantallaFormulario>
  );
}
