import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { codigoNuevoAgente, crearAgenteConCodigo, ErrorApi } from "@/api/cliente";
import { useAgentes } from "@/api/cuenta";
import { useHogarActual } from "@/api/hogar";
import type { AgenteConCodigo } from "@/api/tipos";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Introduccion, Pasos, SeccionFormulario } from "@/components/GestionPiezas";
import { Icono } from "@/components/Icono";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { IconoEnCaja, Pastilla } from "@/components/Primitivos";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { exito } from "@/lib/haptica";
import { colores, espacio, radios } from "@/theme";

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

  const existente = agentes?.find((a) => a.id === agenteExistente);
  const actual = agentes?.find((a) => a.id === creado?.id);
  // Se vinculó cuando el código ya no está pendiente (se usó). No sirve mirar «conectado»: un agente que ya estaba conectado lo parecería antes de usar el código nuevo.
  const vinculado = !!creado && !!actual && !actual.codigo_pendiente && Date.parse(creado.expira_en) > ahora;
  const restantes = creado ? minutosRestantes(creado.expira_en, ahora) : 0;

  useEffect(() => {
    if (!creado) return;
    const id = setInterval(() => setAhora(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [creado]);
  useEffect(() => {
    if (vinculado) exito(); // el momento de la vinculación se siente en la mano
  }, [vinculado]);
  if (!hogar) return null;

  async function pedir(accion: () => Promise<AgenteConCodigo>) {
    setError(null);
    setCargando(true);
    try {
      const nuevo = await accion();
      await cliente.invalidateQueries({ queryKey: ["agentes"] }); // primero la lista al día: así no se da por vinculado con datos viejos
      setCreado(nuevo);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No pudimos crear el código. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const mensajeError = error && (
    <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "500" }}>
      {error}
    </Texto>
  );

  return (
    <PantallaFormulario centrado={false}>
      {!vinculado && (
        <Introduccion
          icono="agenteLinea"
          titulo={agenteExistente ? "Usar el agente en otro computador" : "Agregar agente"}
          texto="El agente es un programa que corre en un computador de tu casa: lee tus enchufes por la WiFi y le manda los datos a la app. Para vincularlo solo necesitas un código."
        />
      )}

      {!creado && (
        <>
          {agenteExistente ? (
            <Tarjeta variante="ambar" style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <Icono nombre="alertaLinea" tamano={20} color={colores.ambar} />
              <Texto style={{ flex: 1 }}>
                Vas a vincular «{existente?.nombre ?? "este agente"}» en otro computador. El computador que lo tiene ahora dejará de funcionar cuando uses el código nuevo.
              </Texto>
            </Tarjeta>
          ) : (
            <SeccionFormulario>
              <Campo etiqueta="Nombre del agente" ayuda="Para reconocerlo: «Sala», «Patio», «Oficina»…" value={nombre} onChangeText={setNombre} />
            </SeccionFormulario>
          )}
          {mensajeError}
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
          {/* El protagonista de la pantalla: el código, grande y espaciado, sobre la superficie oscura */}
          <Tarjeta variante="oscura" style={{ alignItems: "center", gap: espacio.m, paddingVertical: 28, paddingHorizontal: 20, borderRadius: radios.xl }}>
            <Texto variante="etiqueta" color={colores.sobreOscuroSecundario}>
              Tu código
            </Texto>
            <Texto
              accessibilityLabel={`Código ${creado.codigo.split("").join(" ")}`}
              selectable
              color={restantes > 0 ? colores.sobreOscuro : colores.sobreOscuroSecundario}
              maxFontSizeMultiplier={1.2}
              style={{ fontSize: 48, lineHeight: 56, fontWeight: "600", letterSpacing: 8, fontVariant: ["tabular-nums"], textDecorationLine: restantes > 0 ? "none" : "line-through" }}
            >
              {conEspacio(creado.codigo)}
            </Texto>
            {restantes > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icono nombre="reloj" tamano={18} color={colores.sobreOscuroSecundario} />
                <Texto variante="secundario" color={colores.sobreOscuroSecundario} style={{ fontWeight: "500" }}>
                  {`Vence en ${restantes} ${restantes === 1 ? "minuto" : "minutos"}`}
                </Texto>
              </View>
            ) : (
              <Pastilla texto="Venció" tono="rojo" icono="reloj" />
            )}
          </Tarjeta>

          {restantes === 0 && (
            <Boton titulo="Pedir un código nuevo" onPress={() => void pedir(() => codigoNuevoAgente(hogar.id, creado.id))} cargando={cargando} />
          )}
          {mensajeError}

          <Tarjeta style={{ gap: espacio.l, padding: 18 }}>
            <Texto variante="subtitulo">Qué hacer ahora</Texto>
            <Pasos
              pasos={[
                "En el computador de tu casa (Mac), abre el programa «Apague y vámonos».",
                "Escribe este código cuando te lo pida.",
                "Listo: esta pantalla te avisa cuando se vincule.",
              ]}
            />
            {restantes > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: espacio.xs }}>
                <ActivityIndicator size="small" color={colores.textoSecundario} />
                <Texto variante="secundario" color={colores.textoSecundario}>
                  Esperando a que escribas el código…
                </Texto>
              </View>
            )}
          </Tarjeta>

          <View style={{ backgroundColor: colores.tarjetaHundida, borderRadius: radios.m, padding: 14 }}>
            <Texto variante="secundario" color={colores.textoSecundario}>
              Equipo del proyecto, mientras no esté el instalador: en el computador corre «python -m agent --vincular {creado.codigo}».
            </Texto>
          </View>
        </>
      )}

      {vinculado && creado && (
        <View style={{ alignItems: "center", gap: espacio.m, paddingTop: espacio.xxl }}>
          <IconoEnCaja nombre="ok" tono="verde" tamano={72} />
          <Texto variante="titulo" accessibilityRole="header" style={{ textAlign: "center" }}>
            ¡Listo! «{creado.nombre}» está conectado
          </Texto>
          <Texto color={colores.textoSecundario} style={{ textAlign: "center", maxWidth: 340 }}>
            Ahora elige qué enchufes lee: abre cada enchufe y escoge este agente.
          </Texto>
          <View style={{ alignSelf: "stretch", marginTop: espacio.l }}>
            <Boton titulo="Ir a mis enchufes" onPress={() => router.replace("/enchufes")} />
          </View>
        </View>
      )}
    </PantallaFormulario>
  );
}
