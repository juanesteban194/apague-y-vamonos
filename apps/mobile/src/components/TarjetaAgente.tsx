import { useState } from "react";
import { Alert, View } from "react-native";

import { ErrorApi } from "@/api/cliente";
import type { Agente } from "@/api/tipos";
import { haceCuanto } from "@/lib/fechas";
import { colores, espacio } from "@/theme";

import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

type Props = {
  agente: Agente;
  alRenombrar: (nombre: string) => Promise<void>;
  alEliminar: () => Promise<void>;
};

/** Un agente: si está conectado, qué enchufes lee, y cambiarle el nombre o eliminarlo. */
export function TarjetaAgente({ agente, alRenombrar, alEliminar }: Props) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(agente.nombre);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estado = agente.conectado ? "Conectado" : !agente.ultima_conexion ? "Nunca se ha conectado" : `Sin conexión · última vez ${haceCuanto(agente.ultima_conexion)}`;

  async function guardar() {
    setError(null);
    setCargando(true);
    try {
      await alRenombrar(nombre.trim());
      setEditando(false);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo cambiar el nombre. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  function confirmarEliminar() {
    const lee = agente.enchufes.length;
    Alert.alert(
      `¿Eliminar "${agente.nombre}"?`,
      lee > 0
        ? `Sus ${lee === 1 ? "enchufe quedará" : `${lee} enchufes quedarán`} sin agente y no llegarán datos hasta que le asignes otro. El programa de ese agente deja de funcionar.`
        : "El programa de ese agente deja de funcionar. Esto no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => void alEliminar() },
      ],
    );
  }

  return (
    <Tarjeta style={{ gap: espacio.s }}>
      <Texto variante="subtitulo">{agente.nombre}</Texto>
      <Texto color={agente.conectado ? colores.verde : colores.textoSecundario} style={{ fontWeight: "600" }}>{estado}</Texto>
      {agente.enchufes.length > 0 ? (
        <Texto>Lee: {agente.enchufes.map((e) => e.nombre).join(", ")}</Texto>
      ) : (
        <Texto color={colores.ambar} style={{ fontWeight: "600" }}>No lee ningún enchufe. Asígnalo desde Enchufes.</Texto>
      )}
      {editando ? (
        <View style={{ gap: espacio.s }}>
          <Campo etiqueta="Nombre del agente" value={nombre} onChangeText={setNombre} />
          {error && <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>{error}</Texto>}
          <View style={{ flexDirection: "row", gap: espacio.s }}>
            <Boton titulo="Guardar nombre" flex onPress={guardar} cargando={cargando} deshabilitado={!nombre.trim()} />
            <Boton titulo="Cancelar" variante="secundario" onPress={() => { setEditando(false); setNombre(agente.nombre); setError(null); }} />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: espacio.s }}>
          <Boton titulo="Cambiar nombre" variante="secundario" flex onPress={() => setEditando(true)} />
          <Boton titulo="Eliminar" variante="secundario" onPress={confirmarEliminar} />
        </View>
      )}
    </Tarjeta>
  );
}
