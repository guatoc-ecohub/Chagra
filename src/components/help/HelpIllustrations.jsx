/**
 * HelpIllustrations — ilustraciones PROPIAS de la capa de ayuda de Chagra.
 *
 * Lenguaje visual (mismo que ManoChagraGlyph / la mochila del agente):
 *   - Trazo grueso round-cap en `currentColor` → heredan el color del texto
 *     y funcionan en los 4 temas (biopunk oscuro, minimalista, nature,
 *     verde-vivo) sin overrides. Legibles al sol (alto contraste = el del
 *     texto del tema).
 *   - UNA capa de acento: LA COSTURA — puntada de hilo del acento del tema
 *     (`--t-accent-rgb`, con fallback al teal biopunk). Es la firma de marca:
 *     lo curado/verificado va "cosido" como un costal de fique. Cada
 *     ilustración lleva su puntada.
 *   - CERO animación: en la ayuda el movimiento distrae (y así reduced-motion
 *     queda respetado por construcción). La vida está en el contenido.
 *
 * Todas aceptan { size, className } y son decorativas (aria-hidden).
 */
import React from 'react';

/** Color del hilo de la costura: acento del tema activo. */
const HILO = 'rgb(var(--t-accent-rgb, 25, 201, 154))';

/** Wrapper común: svg 48×48 de trazo currentColor. */
function Lienzo({ size, className, children }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Puntada de hilo (path con guiones) en el acento del tema. */
function Puntada({ d, width = 2.4 }) {
  return (
    <path
      d={d}
      stroke={HILO}
      strokeWidth={width}
      strokeDasharray="4.5 3.5"
      fill="none"
    />
  );
}

/**
 * VOZ — micrófono del que brota una hoja; la onda de voz es la costura:
 * hablar también queda cosido (registrado) en el cuaderno.
 */
export function IlusVoz({ size = 56, className = '' }) {
  return (
    <Lienzo size={size} className={className}>
      {/* Cápsula del micrófono */}
      <rect x="19" y="8" width="10" height="16" rx="5" />
      {/* Arco del soporte + pie */}
      <path d="M14 20a10 10 0 0 0 20 0" />
      <path d="M24 30v6M18 40h12" />
      {/* Hoja que brota del micrófono (la voz siembra) */}
      <path d="M29 10c2.2-2.6 5-3.6 8-3-0.4 3-2 5.4-5.2 6.2" />
      {/* Costura: la onda de lo hablado, cosida */}
      <Puntada d="M6 27c3-4 5-4 8-1" />
      <Puntada d="M34 26c3 3 5 3 8-1" />
    </Lienzo>
  );
}

/**
 * FOTO — cámara con una hoja dentro del lente: "tómele foto a la mata".
 * La correa de la cámara es la costura.
 */
export function IlusFoto({ size = 56, className = '' }) {
  return (
    <Lienzo size={size} className={className}>
      {/* Cuerpo de la cámara */}
      <path d="M8 16h7l3-4h12l3 4h7v22H8z" />
      {/* Lente */}
      <circle cx="24" cy="27" r="7.5" />
      {/* Hoja dentro del lente (lo que la cámara ve) */}
      <path d="M21.5 29.5c0-3.5 2-5.5 5.5-6-0.3 3.6-2.2 5.6-5.5 6z" />
      {/* Visor */}
      <path d="M34 21h2.5" />
      {/* Costura: la correa colgando */}
      <Puntada d="M8 20c-3 1-4.5 3-5 6" />
      <Puntada d="M40 20c3 1 4.5 3 5 6" />
    </Lienzo>
  );
}

/**
 * MUNDOS — la finca dibujada de la pantalla de inicio, partida en los cuatro
 * lugares (Gestionar / Aprender / Jugar / Agente). Los linderos entre parcelas
 * son costura: los cuatro lugares están cosidos en una sola finca.
 */
export function IlusMundos({ size = 56, className = '' }) {
  return (
    <Lienzo size={size} className={className}>
      {/* La finca (lindero exterior redondeado, como parcela vista desde arriba) */}
      <rect x="6" y="6" width="36" height="36" rx="9" />
      {/* Linderos interiores = costura */}
      <Puntada d="M24 7v34" />
      <Puntada d="M7 24h34" />
      {/* Gestionar: brote */}
      <path d="M15 19v-4.5M15 14.5c-1.8 0-3-1-3.2-3 2 0 3.2.8 3.2 3zM15 14.5c1.8-.6 2.8-1.8 3-3.8" />
      {/* Aprender: libro abierto */}
      <path d="M29 13c1.6-1 3.2-1 4.5 0v6c-1.3-1-2.9-1-4.5 0zM33.5 13c1.6-1 3.2-1 4.5 0" />
      {/* Jugar: rombo semilla (ficha de juego) */}
      <path d="M15 30l3.2 3.5L15 37l-3.2-3.5z" />
      {/* Agente: burbuja de chat con punto */}
      <path d="M29 30h8v5h-5.5L29 37.5z" />
    </Lienzo>
  );
}

/**
 * REGISTRO / CUADERNO — el cuaderno de campo abierto con su lápiz; el lomo es
 * la costura (el cuaderno está cosido a mano, como los de vereda).
 */
export function IlusRegistro({ size = 56, className = '' }) {
  return (
    <Lienzo size={size} className={className}>
      {/* Dos páginas abiertas */}
      <path d="M24 10c-4-2.6-9.5-3-16-1.5V37c6.5-1.5 12-1 16 1.5" />
      <path d="M24 10c4-2.6 9.5-3 16-1.5V37c-6.5-1.5-12-1-16 1.5" />
      {/* Renglones de apuntes (página izquierda) */}
      <path d="M12 17.5c3-.6 5.5-.7 8-.3M12 23c3-.6 5.5-.7 8-.3M12 28.5c2-.4 3.8-.5 5.5-.4" />
      {/* Lápiz apoyado en la página derecha */}
      <path d="M29 27l9.5-9.5 3 3L32 30l-4 1z" />
      {/* Costura: el lomo cosido del cuaderno */}
      <Puntada d="M24 11v27" />
    </Lienzo>
  );
}

/**
 * VERIFICADO — el sello de "esto viene del catálogo": una etiqueta de bulto
 * (marbete) cuyo chulo está cosido con hilo y aguja. Misma metáfora que la
 * costura de las respuestas respaldadas del agente.
 */
export function IlusVerificado({ size = 56, className = '' }) {
  return (
    <Lienzo size={size} className={className}>
      {/* Marbete (etiqueta de costal) con ojal */}
      <path d="M10 12h20l8 8v16H10z" />
      <path d="M30 12v8h8" />
      <circle cx="15.5" cy="18" r="1.6" />
      {/* Chulo cosido (hilo del acento) que sale del marbete como hebra */}
      <Puntada d="M15 28l6 6 12-12" width={2.8} />
      <Puntada d="M33 22c3-2.5 6-3 9.5-1.5" width={1.8} />
    </Lienzo>
  );
}

/**
 * DATOS — el cuaderno del bolsillo (teléfono) y su copia en el archivo
 * central; el camino entre los dos es costura: primero se guarda en tu
 * aparato, luego se cose con el servidor cuando hay señal.
 */
export function IlusDatos({ size = 56, className = '' }) {
  return (
    <Lienzo size={size} className={className}>
      {/* Teléfono con brote en pantalla (tu cuaderno de bolsillo) */}
      <rect x="7" y="14" width="15" height="26" rx="3.5" />
      <path d="M14.5 33v-5M14.5 28c-1.6 0-2.7-.9-3-2.7 1.8 0 2.9.8 3 2.7zM14.5 28c1.6-.5 2.5-1.6 2.8-3.4" />
      {/* Nube (el archivo central) */}
      <path d="M31 18a5.5 5.5 0 0 1 5.5-4.5c3 0 5.5 2.2 5.7 5.2 2 .6 3 2 3 4 0 2.6-2 4.3-4.7 4.3h-9.3c-2.6 0-4.2-1.7-4.2-4 0-2.6 1.7-4.6 4-5z" />
      {/* Costura: la sincronización cosida entre aparato y nube */}
      <Puntada d="M25 33c4.5 0 7.5-2 9.5-5.5" />
    </Lienzo>
  );
}

/**
 * CICLO — sembrar es un proceso: semilla → brote → mata con fruto, todos
 * creciendo sobre la misma costura (el hilo del tiempo / el surco).
 */
export function IlusCiclo({ size = 56, className = '' }) {
  return (
    <Lienzo size={size} className={className}>
      {/* Sol de la mañana (rayos parejos alrededor) */}
      <circle cx="39" cy="10" r="3.4" />
      <path d="M39 3.2v2M39 14.8v2M32.2 10h2M43.8 10h2M34.2 5.2l1.4 1.4M42.4 13.4l1.4 1.4M43.8 5.2l-1.4 1.4M35.6 13.4l-1.4 1.4" strokeWidth="1.8" />
      {/* Semilla en tierra */}
      <path d="M9 34c1.8-.4 3-1.5 3.2-3.4-1.9.2-3 1.3-3.2 3.4z" />
      {/* Brote */}
      <path d="M22 35v-6M22 29c-1.9 0-3.1-1-3.4-3.2 2.1 0 3.3.9 3.4 3.2zM22 29c1.9-.6 3-1.9 3.2-4" />
      {/* Mata con fruto */}
      <path d="M36 35V22M36 27c-2.4 0-4-1.3-4.4-4 2.7 0 4.3 1.2 4.4 4zM36 24c2.4-.7 3.8-2.3 4-5" />
      <circle cx="40.5" cy="30" r="2.2" />
      {/* Costura: el surco donde todo va sembrado */}
      <Puntada d="M5 38.5h38" />
    </Lienzo>
  );
}

/**
 * CosturaDivider — la puntada de hilo del acento como separador de sección.
 * Es el MISMO patrón visual del dobladillo de la mochila del agente
 * (.v3-mochila-stitch) traído a la ayuda: cose el header con el contenido.
 */
export function CosturaDivider({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`block h-[2px] rounded-full ${className}`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(90deg, rgba(var(--t-accent-rgb, 25, 201, 154), 0.75) 0 8px, transparent 8px 15px)',
      }}
    />
  );
}
