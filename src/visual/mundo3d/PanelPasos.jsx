/*
 * PanelPasos — la lección de los mundos 3D, SIN tapar el mundo.
 *
 * Antes cada mundo (cafetal, cacao, casa, invernadero, lechería, papa, bosque)
 * duplicaba el mismo panel centrado abajo que se comía el tercio inferior de la
 * escena — y tapaba justo lo que el paso señalaba. REGLA DURA del operador:
 * *"Prohibido que los diálogos de los mundos tapen objetos en el mundo."*
 *
 * La solución (una sola, compartida):
 *   · PLEGADO POR DEFECTO: una pastilla de UNA línea en la esquina inferior
 *     izquierda — el rincón menos ocupado de los dioramas (el sujeto vive en
 *     el centro/arriba y el anillo de foco recorre el terreno central). La
 *     pastilla muestra el kicker del paso actual: la lección queda ANUNCIADA,
 *     no escondida (la lección es la razón de ser de cada mundo).
 *   · ABIERTO: una carta angosta (máx. 24rem) pegada a esa misma esquina, con
 *     altura acotada y scroll interno. Se pliega con su botón, con Escape, o
 *     volviendo a tocar donde estaba.
 *   · Dos modos: `pasos/paso/onPaso` (lección por pasos con ←/→ y puntos) o
 *     `kicker/texto` + `children` (invitación con acción propia, p. ej. el
 *     "Bajar al microsuelo" del Ent — usar className "ppasos__accion").
 *
 * Accesibilidad: objetivos ≥44px, foco visible, aria-expanded/aria-controls,
 * Escape pliega, y el foco viaja pastilla↔carta al abrir/plegar (nunca en el
 * primer render: no se roba el foco al entrar al mundo). `reducedMotion` (o el
 * media query) apaga la animación de apertura.
 *
 * Cada mundo colorea con `tema` (→ variables CSS --pp-*). Copy en español de
 * Colombia, en "usted". Autocontenido: cero libs, cero imágenes.
 */
import { useEffect, useId, useRef, useState } from 'react';
import './panelPasos.css';

/**
 * @param {{
 *   etiqueta: string,
 *   pasos?: Array<{id: string, kicker: string, texto: string}>|null,
 *   paso?: number,
 *   onPaso?: ((paso: number) => void)|null,
 *   kicker?: string|null,
 *   texto?: string|null,
 *   tema?: {
 *     fondo?: string, borde?: string, tinta?: string, kicker?: string,
 *     acentoA?: string, acentoB?: string, tintaAccion?: string, activo?: string,
 *   },
 *   reducedMotion?: boolean,
 *   abiertoInicial?: boolean,
 *   children?: import('react').ReactNode,
 * }} props
 */
export default function PanelPasos({
  etiqueta,
  pasos = null,
  paso = 0,
  onPaso = null,
  kicker = null,
  texto = null,
  tema = {},
  reducedMotion = false,
  abiertoInicial = false,
  children = null,
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const pastillaRef = useRef(null);
  const plegarRef = useRef(null);
  const montado = useRef(false);
  const cartaId = useId();

  const conPasos = Array.isArray(pasos) && pasos.length > 0;
  const actual = conPasos
    ? pasos[Math.min(Math.max(paso, 0), pasos.length - 1)]
    : { kicker, texto };

  // El foco sigue al estado (pastilla↔carta), pero JAMÁS en el primer render:
  // entrar al mundo no puede robarse el foco.
  useEffect(() => {
    if (!montado.current) {
      montado.current = true;
      return;
    }
    if (abierto) plegarRef.current?.focus();
    else pastillaRef.current?.focus();
  }, [abierto]);

  const vars = {
    '--pp-fondo': tema.fondo,
    '--pp-borde': tema.borde,
    '--pp-tinta': tema.tinta,
    '--pp-kicker': tema.kicker,
    '--pp-acento-a': tema.acentoA,
    '--pp-acento-b': tema.acentoB,
    '--pp-tinta-accion': tema.tintaAccion,
    '--pp-activo': tema.activo,
  };

  return (
    <div
      className={`ppasos${reducedMotion ? ' ppasos--rm' : ''}`}
      style={vars}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && abierto) {
          e.stopPropagation();
          setAbierto(false);
        }
      }}
    >
      <button
        ref={pastillaRef}
        type="button"
        className="ppasos__pastilla"
        hidden={abierto}
        aria-expanded={abierto}
        aria-controls={cartaId}
        aria-label={`Abrir: ${actual.kicker || etiqueta}`}
        onClick={() => setAbierto(true)}
      >
        <span className="ppasos__pastilla-punto" aria-hidden="true" />
        <span className="ppasos__pastilla-etiqueta">{actual.kicker || etiqueta}</span>
        <span className="ppasos__pastilla-flecha" aria-hidden="true">▴</span>
      </button>

      <section
        id={cartaId}
        className="ppasos__carta"
        hidden={!abierto}
        role="group"
        aria-label={etiqueta}
      >
        <div className="ppasos__cabecera">
          <p className="ppasos__kicker">{actual.kicker}</p>
          <button
            ref={plegarRef}
            type="button"
            className="ppasos__plegar"
            aria-label="Plegar la lección"
            onClick={() => setAbierto(false)}
          >
            ▾
          </button>
        </div>
        <p className="ppasos__texto">{actual.texto}</p>

        {conPasos && onPaso && (
          <div className="ppasos__nav">
            <button
              type="button"
              className="ppasos__btn"
              onClick={() => onPaso(Math.max(0, paso - 1))}
              disabled={paso === 0}
              aria-label="Paso anterior"
            >
              ←
            </button>
            <span className="ppasos__puntos" aria-hidden="true">
              {pasos.map((p, i) => (
                <span
                  key={p.id}
                  className={`ppasos__punto${i === paso ? ' ppasos__punto--activo' : ''}`}
                />
              ))}
            </span>
            <button
              type="button"
              className="ppasos__btn"
              onClick={() => onPaso(Math.min(pasos.length - 1, paso + 1))}
              disabled={paso === pasos.length - 1}
              aria-label="Paso siguiente"
            >
              →
            </button>
          </div>
        )}

        {children}
      </section>
    </div>
  );
}
