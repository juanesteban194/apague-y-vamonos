import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { ErrorApi } from "@/api/cliente";
import type { Agente } from "@/api/tipos";
import { haceCuanto } from "@/lib/fechas";
import { colores, espacio } from "@/theme";

import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { PuntoSobreIcono } from "./GestionPiezas";
import { Icono, type NombreIcono } from "./Icono";
import { IconoEnCaja, Separador } from "./Primitivos";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

type Props = {
  agente: Agente;
  alRenombrar: (nombre: string) => Promise<void>;
  alEliminar: () => Promise<void>;
  alUsarEnOtroComputador: () => void; // pide un código nuevo para este mismo agente
};

/** Una acción de la barra de abajo de la tarjeta: ícono encima y nombre corto debajo (como las acciones de Wallet). */
function Accion({ icono, texto, alPulsar, peligro }: { icono: NombreIcono; texto: string; alPulsar: () => void; peligro?: boolean }) {
  const color = peligro ? colores.rojo : colores.texto;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      onPress={alPulsar}
      style={({ pressed }) => ({ flex: 1, minHeight: 72, alignItems: "center", justifyContent: "flex-start", gap: 6, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 6, backgroundColor: pressed ? "rgba(20,19,17,0.04)" : "transparent" })}
    >
      <Icono nombre={icono} tamano={22} color={color} />
      <Texto variante="secundario" color={color} style={{ fontWeight: "500", textAlign: "center" }} numberOfLines={2}>
        {texto}
      </Texto>
    </Pressable>
  );
}

/** Un agente: si está conectado, qué enchufes lee, y cambiarle el nombre, usarlo en otro computador o eliminarlo. */
export function TarjetaAgente({ agente, alRenombrar, alEliminar, alUsarEnOtroComputador }: Props) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(agente.nombre);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estado = !agente.vinculado
    ? "Esperando que lo vincules con un código"
    : agente.conectado
      ? "Conectado"
      : !agente.ultima_conexion
        ? "Nunca se ha conectado"
        : `Sin conexión · última vez ${haceCuanto(agente.ultima_conexion)}`;
  const punto = agente.conectado ? colores.semaforoVerde : agente.vinculado ? colores.interruptorApagado : colores.semaforoAmbar;
  const colorEstado = agente.conectado ? colores.verde : agente.vinculado ? colores.textoSecundario : colores.ambar;

  async function guardar() {
    setError(null);
    setCargando(true);
    try {
      await alRenombrar(nombre.trim());
      setEditando(false);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No pudimos cambiar el nombre. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  function confirmarEliminar() {
    const lee = agente.enchufes.length;
    Alert.alert(
      `¿Eliminar "${agente.nombre}"?`,
      lee > 0
        ? `${lee === 1 ? "Su enchufe quedará" : `Sus ${lee} enchufes quedarán`} sin agente y no llegarán datos hasta que le asignes otro. El programa de ese agente deja de funcionar.`
        : "El programa de ese agente deja de funcionar. Esto no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => void alEliminar() },
      ],
    );
  }

  return (
    <Tarjeta style={{ padding: 0, gap: 0, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
        <PuntoSobreIcono color={punto}>
          <IconoEnCaja nombre="agenteLinea" tamano={40} />
        </PuntoSobreIcono>
        <View style={{ flex: 1, gap: 1 }}>
          <Texto variante="subtitulo">{agente.nombre}</Texto>
          <Texto variante="secundario" color={colorEstado} style={{ fontWeight: "500" }}>
            {estado}
          </Texto>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingBottom: 16, alignItems: "flex-start" }}>
        {agente.enchufes.length > 0 ? (
          <>
            <Icono nombre="enchufeLinea" tamano={18} color={colores.textoSecundario} />
            <Texto variante="secundario" color={colores.textoSecundario} style={{ flex: 1 }}>
              {`Lee: ${agente.enchufes.map((e) => e.nombre).join(", ")}`}
            </Texto>
          </>
        ) : (
          <>
            <Icono nombre="alertaLinea" tamano={18} color={colores.ambar} />
            <Texto variante="secundario" color={colores.ambar} style={{ flex: 1, fontWeight: "500" }}>
              No lee ningún enchufe. Asígnalo desde Enchufes.
            </Texto>
          </>
        )}
      </View>

      <Separador />
      {editando ? (
        <View style={{ gap: espacio.m, padding: 16 }}>
          <Campo etiqueta="Nombre del agente" value={nombre} onChangeText={setNombre} autoFocus />
          {error && (
            <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "500" }}>
              {error}
            </Texto>
          )}
          <View style={{ flexDirection: "row", gap: espacio.s }}>
            <Boton titulo="Guardar nombre" flex compacto onPress={guardar} cargando={cargando} deshabilitado={!nombre.trim()} />
            <Boton
              titulo="Cancelar"
              variante="secundario"
              compacto
              onPress={() => {
                setEditando(false);
                setNombre(agente.nombre);
                setError(null);
              }}
            />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row" }}>
          {agente.vinculado ? (
            <Accion icono="agenteLinea" texto="Usar en otro computador" alPulsar={alUsarEnOtroComputador} />
          ) : (
            <Accion icono="llave" texto="Ver código de vinculación" alPulsar={alUsarEnOtroComputador} />
          )}
          <Accion icono="editar" texto="Cambiar nombre" alPulsar={() => setEditando(true)} />
          <Accion icono="borrar" texto="Eliminar" alPulsar={confirmarEliminar} peligro />
        </View>
      )}
    </Tarjeta>
  );
}
