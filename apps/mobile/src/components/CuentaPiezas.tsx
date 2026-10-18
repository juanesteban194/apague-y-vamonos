/** Piezas de las pantallas de entrada y de cuenta (entrar, crear cuenta, recuperar, consentimiento, verificar, eliminar).
 *  Se arman con el sistema de diseño (Texto, Campo, Icono, IconoEnCaja) para que todas hablen el mismo idioma visual. */
import { Link, type Href } from "expo-router";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Pressable, View } from "react-native";

import { seleccionar } from "@/lib/haptica";
import { AREA_TOQUE_MIN, BORDE_FINO, colores, espacio, fuentes, tipografia } from "@/theme";

import { Campo } from "./Campo";
import { Icono, type NombreIcono } from "./Icono";
import { SelloMarca } from "./MarcaApague";
import { IconoEnCaja, type Tono } from "./Primitivos";
import { Texto } from "./Texto";

/** Encabezado de una pantalla de cuenta: ícono en caja (opcional), una etiqueta corta (por ejemplo «Paso 1 de 2»), el título y una explicación. */
export function CuentaEncabezado({
  titulo,
  subtitulo,
  etiqueta,
  icono,
  tono = "neutro",
  marca,
  extra,
}: {
  titulo: string;
  subtitulo?: string;
  etiqueta?: string;
  icono?: NombreIcono;
  tono?: Tono;
  /** El sello de la app en vez de un ícono (pantallas de entrada). */
  marca?: boolean;
  extra?: ReactNode;
}) {
  return (
    <View style={{ gap: espacio.l, marginBottom: espacio.xs }}>
      {marca ? <SelloMarca tamano={48} /> : icono && <IconoEnCaja nombre={icono} tono={tono} tamano={52} />}
      <View style={{ gap: espacio.s }}>
        {etiqueta && (
          <Texto variante="etiqueta" color={colores.textoSecundario}>
            {etiqueta}
          </Texto>
        )}
        <Texto variante="tituloGrande" accessibilityRole="header">
          {titulo}
        </Texto>
        {subtitulo && (
          <Texto color={colores.textoSecundario} style={{ fontSize: 17, lineHeight: 25 }}>
            {subtitulo}
          </Texto>
        )}
        {extra}
      </View>
    </View>
  );
}

/** «o con tu correo» entre dos líneas de un pelo. */
export function CuentaSeparador({ texto = "o" }: { texto?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m, marginVertical: espacio.xs }}>
      <View style={{ flex: 1, height: BORDE_FINO, backgroundColor: colores.bordeFuerte }} />
      <Texto variante="secundario" color={colores.textoSecundario}>
        {texto}
      </Texto>
      <View style={{ flex: 1, height: BORDE_FINO, backgroundColor: colores.bordeFuerte }} />
    </View>
  );
}

type TonoAviso = "error" | "info" | "ok";
const AVISO: Record<TonoAviso, { icono: NombreIcono; color: string }> = {
  error: { icono: "alertaLinea", color: colores.rojo },
  info: { icono: "reloj", color: colores.textoSecundario },
  ok: { icono: "okLinea", color: colores.verde },
};

/** Mensaje en línea con ícono: un error (lo anuncia el lector de pantalla), una espera o una confirmación. */
export function CuentaAviso({ texto, tono = "error", icono }: { texto: string; tono?: TonoAviso; icono?: NombreIcono }) {
  const a = AVISO[tono];
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
      <View style={{ paddingTop: 1 }}>
        <Icono nombre={icono ?? a.icono} tamano={19} color={a.color} />
      </View>
      <Texto accessibilityRole={tono === "error" ? "alert" : undefined} variante="secundario" color={a.color} style={{ flex: 1, fontWeight: tono === "error" ? "500" : "400" }}>
        {texto}
      </Texto>
    </View>
  );
}

/** Un requisito que se cumple mientras escribes («Mínimo 8 caracteres»): el círculo se llena de verde al cumplirse. */
export function CuentaRequisito({ texto, cumplido }: { texto: string; cumplido: boolean }) {
  return (
    <View accessible accessibilityLabel={`${texto}${cumplido ? ". Listo" : ""}`} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: -2 }}>
      <Icono nombre={cumplido ? "ok" : "okLinea"} tamano={18} color={cumplido ? colores.semaforoVerde : "rgba(20,19,17,0.32)"} />
      <Texto variante="secundario" color={cumplido ? colores.verde : colores.textoSecundario}>
        {texto}
      </Texto>
    </View>
  );
}

/** Enlace a otra pantalla con la tipografía del sistema. Conserva el comportamiento de `Link` (en la web es un enlace de verdad).
 *  `pregunta` va en gris antes de la acción: «¿No tienes cuenta? Crear cuenta». */
export function CuentaEnlace({
  href,
  texto,
  pregunta,
  alinear = "center",
  discreto,
}: {
  href: Href;
  texto: string;
  pregunta?: string;
  alinear?: "center" | "flex-start" | "flex-end";
  /** Un punto más pequeño, para enlaces de apoyo junto a un campo («¿Olvidaste tu contraseña?»). */
  discreto?: boolean;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={pregunta ? `${pregunta} ${texto}` : texto}
        hitSlop={6}
        // Estilo fijo (no función): `Link asChild` lo pasa tal cual al hijo en todas las plataformas.
        style={{ minHeight: AREA_TOQUE_MIN, justifyContent: "center", alignSelf: alinear, paddingHorizontal: alinear === "center" ? 4 : 0 }}
      >
        {pregunta ? (
          <Texto color={colores.textoSecundario} style={{ textAlign: "center" }}>
            {`${pregunta} `}
            <Texto style={{ fontWeight: "600" }}>{texto}</Texto>
          </Texto>
        ) : (
          <Texto variante={discreto ? "secundario" : "cuerpo"} style={{ fontWeight: "600" }}>
            {texto}
          </Texto>
        )}
      </Pressable>
    </Link>
  );
}

/** Alto de la etiqueta de `Campo` (línea de 21 px + 6 de espacio): el botón del ojo se alinea con la caja del campo. */
const ALTO_ETIQUETA = tipografia.secundario.lineHeight + 6;

/** Campo de contraseña con el botón para verla: escribir a ciegas es de lo que más falla, sobre todo con dedos o vista cansados. */
export function CuentaCampoContrasena({ style, ...props }: Omit<ComponentProps<typeof Campo>, "secureTextEntry">) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Campo autoCapitalize="none" autoCorrect={false} {...props} secureTextEntry={!visible} style={[{ paddingRight: 56 }, style]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        onPress={() => {
          seleccionar();
          setVisible((v) => !v);
        }}
        hitSlop={4}
        style={({ pressed }) => ({ position: "absolute", right: 4, top: ALTO_ETIQUETA + 4, minHeight: AREA_TOQUE_MIN, minWidth: AREA_TOQUE_MIN, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}
      >
        <Icono nombre={visible ? "ojoCerrado" : "ojo"} tamano={21} color={colores.textoSecundario} />
      </Pressable>
    </View>
  );
}

/** Campo del código de 6 números: cifras grandes, separadas y centradas, como en las apps de bancos. El teléfono lo ofrece solo desde el SMS o el correo. */
export function CuentaCampoCodigo(props: Omit<ComponentProps<typeof Campo>, "etiqueta"> & { etiqueta?: string }) {
  return (
    <Campo
      etiqueta="Código de 6 números"
      keyboardType="number-pad"
      maxLength={6}
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      {...props}
      style={{ fontSize: 24, letterSpacing: 10, textAlign: "center", fontFamily: fuentes.seminegrita, fontVariant: ["tabular-nums"] }}
    />
  );
}
