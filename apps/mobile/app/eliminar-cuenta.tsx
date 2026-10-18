import { useState } from "react";
import { Alert } from "react-native";

import { eliminarCuenta, ErrorApi } from "@/api/cliente";
import { usePerfilActual } from "@/api/perfil";
import { cerrarSesion } from "@/api/sesion";
import { Boton } from "@/components/Boton";
import { CuentaAviso, CuentaCampoContrasena, CuentaEncabezado } from "@/components/CuentaPiezas";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { FilaLista, Separador } from "@/components/Primitivos";
import { Tarjeta } from "@/components/Tarjeta";
import { aviso } from "@/lib/haptica";

/** Derecho de supresión (Ley 1581): borra la cuenta y los datos. Las cuentas con contraseña la confirman.
 *  Serio y claro, sin alarmar: el rojo queda solo en el ícono y en el botón; lo que se borra se lee como una lista tranquila. */
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
    aviso();
    Alert.alert("¿Eliminar tu cuenta?", "Se borran tu cuenta y todos tus datos, y no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => void borrar() },
    ]);
  }

  return (
    <PantallaFormulario centrado={false}>
      <CuentaEncabezado
        icono="borrar"
        tono="rojo"
        titulo="Antes de que te vayas"
        subtitulo="Eliminar tu cuenta borra para siempre lo que ves abajo. Es inmediato y no se puede deshacer."
      />

      <Tarjeta style={{ padding: 0, gap: 0 }}>
        <FilaLista icono="cuenta" titulo="Tu cuenta" detalle={perfil?.email ?? "Tu correo"} />
        <Separador sangria={66} />
        <FilaLista
          icono="casaLinea"
          titulo="Tus casas"
          detalle="Las casas en las que eres la única persona, con sus enchufes, historial de consumo, agentes, avisos, facturas y rutinas."
        />
        <Separador sangria={66} />
        <FilaLista icono="casas" titulo="Casas compartidas" detalle="No se borran: solo sales tú." />
        <Separador sangria={66} />
        <FilaLista icono="agenteLinea" titulo="Programas de agente" detalle="Los de tus casas dejan de funcionar." />
      </Tarjeta>

      {pideContrasena && (
        <CuentaCampoContrasena
          etiqueta="Escribe tu contraseña para confirmar"
          autoComplete="current-password"
          textContentType="password"
          value={contrasena}
          onChangeText={setContrasena}
        />
      )}
      {error && <CuentaAviso texto={error} />}
      <Boton titulo="Eliminar mi cuenta y mis datos" variante="peligro" onPress={confirmar} cargando={cargando} deshabilitado={!perfil || (pideContrasena && !contrasena)} />
    </PantallaFormulario>
  );
}
