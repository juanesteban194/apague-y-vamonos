import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { codigoNuevoAgente, crearAgenteConCodigo, ErrorApi } from "@/api/cliente";
import { useAgentes } from "@/api/cuenta";
import { useHogarActual } from "@/api/hogar";
import type { AgenteConCodigo } from "@/api/tipos";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Icono } from "@/components/Icono";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { colores, espacio } from "@/theme";

const conEspacio = (codigo: string) => `${codigo.slice(0, 3)} ${codigo.slice(3)}`;

function minutosRestantes(expiraEn: string, ahora = Date.now()) {
  return Math.max(0, Math.ceil((Date.parse(expiraEn) - ahora) / 60_000));
}

/** Agregar un agente con un código de 6 dígitos: la persona lo escribe en el programa del agente y este se vincula solo, sin copiar claves.
 *  Con `?agente=<id>` genera un código nuevo para un agente que ya existe (usarlo en otro computador). */
export default function VincularAgente() {
  const { agente: agenteExistente } = useLocalSearchParams<{ agente?: string }>();
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: agentes } = useAgentes(hogar?.id); // se refresca cada 15 s: así se ve cuándo el agente se vinculó
  const [nombre, setNombre] = useState("Computador de la casa");
  const [creado, setCreado] = useState<AgenteConCodigo | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    if (!creado) return;
    const id = setInterval(() => setAhora(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [creado]);
  if (!hogar) return null;

  const existente = agentes?.find((a) => a.id === agenteExistente);
  const actual = agentes?.find((a) => a.id === creado?.id);
  // Se vinculó cuando el código ya no está pendiente (se usó). No sirve mirar «conectado»: un agente que ya estaba conectado lo parecería antes de usar el código nuevo.
  const vinculado = !!creado && !!actual && !actual.codigo_pendiente && Date.parse(creado.expira_en) > ahora;
  const restantes = creado ? minutosRestantes(creado.expira_en, ahora) : 0;

  async function pedir(accion: () => Promise<AgenteConCodigo>) {
    setError(null);
    setCargando(true);
    try {
      const nuevo = await accion();
      await cliente.invalidateQueries({ queryKey: ["agentes"] }); // primero la lista al día: así no se da por vinculado con datos viejos
      setCreado(nuevo);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo crear el código. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <PantallaFormulario>
      <Texto variante="titulo">{agenteExistente ? "Usar el agente en otro computador" : "Agregar agente"}</Texto>
      <Texto color={colores.textoSecundario}>
        El agente es un programa que corre en un computador de tu casa, lee tus enchufes por la WiFi y manda los datos a la app. Para vincularlo solo necesitas un código.
      </Texto>

      {!creado && (
        <>
          {agenteExistente ? (
            <Texto>
              Vas a vincular «{existente?.nombre ?? "este agente"}» en otro computador. El computador que lo tiene ahora dejará de funcionar cuando uses el código nuevo.
            </Texto>
          ) : (
            <Campo etiqueta="Nombre del agente" ayuda="Para reconocerlo: «Sala», «Patio», «Oficina»…" value={nombre} onChangeText={setNombre} />
          )}
          {error && <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>{error}</Texto>}
          <Boton
            titulo="Ver el código"
            onPress={() => void pedir(() => (agenteExistente ? codigoNuevoAgente(hogar.id, agenteExistente) : crearAgenteConCodigo(hogar.id, nombre.trim())))}
            cargando={cargando}
            deshabilitado={!agenteExistente && !nombre.trim()}
          />
        </>
      )}

      {creado && !vinculado && (
        <>
          <Tarjeta style={{ gap: espacio.s, alignItems: "center" }}>
            <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "700" }}>Tu código</Texto>
            <Texto accessibilityLabel={`Código ${creado.codigo.split("").join(" ")}`} selectable style={{ fontSize: 44, fontWeight: "800", letterSpacing: 4 }}>
              {conEspacio(creado.codigo)}
            </Texto>
            <Texto color={restantes > 0 ? colores.textoSecundario : colores.rojo} style={{ fontWeight: "600" }}>
              {restantes > 0 ? `Vence en ${restantes} ${restantes === 1 ? "minuto" : "minutos"}` : "Venció"}
            </Texto>
          </Tarjeta>
          <Tarjeta style={{ gap: espacio.s }}>
            <Texto variante="subtitulo">Qué hacer ahora</Texto>
            <Texto>1. En el computador de tu casa (Mac), abre el programa «Apague y vámonos».</Texto>
            <Texto>2. Escribe este código cuando te lo pida.</Texto>
            <Texto>3. Listo: esta pantalla te avisa cuando se vincule.</Texto>
            <Texto variante="secundario" color={colores.textoSecundario}>
              Equipo del proyecto, mientras no esté el instalador: en el computador corre «python -m agent --vincular {creado.codigo}».
            </Texto>
          </Tarjeta>
          {restantes === 0 && (
            <Boton titulo="Pedir un código nuevo" variante="secundario" onPress={() => void pedir(() => codigoNuevoAgente(hogar.id, creado.id))} cargando={cargando} />
          )}
          {error && <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>{error}</Texto>}
        </>
      )}

      {vinculado && creado && (
        <Tarjeta style={{ gap: espacio.s, backgroundColor: colores.verdeFondo, borderColor: colores.verdeSuave }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icono nombre="ok" color={colores.verde} tamano={28} />
            <Texto variante="subtitulo" style={{ flex: 1 }}>¡Listo! «{creado.nombre}» está conectado</Texto>
          </View>
          <Texto>Ahora elige qué enchufes lee: abre cada enchufe y escoge este agente.</Texto>
          <Boton titulo="Ir a mis enchufes" onPress={() => router.replace("/enchufes")} />
        </Tarjeta>
      )}
    </PantallaFormulario>
  );
}
