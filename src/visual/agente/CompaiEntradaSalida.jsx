/*
 * CompaiEntradaSalida — el compai del FAB ENTRA y SALE como manda el perfil
 * de su especie (perfilesConducta.js → entradaSalida.js).
 *
 * Antes (hasta 2026-09-04) los seis compais de tinta aparecían de golpe y se
 * iban de golpe, aunque `entrada`/`salida` ya estaban escritos por especie y
 * nadie los leía. Este envoltorio es el METRÓNOMO de fases (cadena de
 * setTimeout, nunca `animationend`: sobrevive al throttling); las curvas
 * viven en compai-entrada-salida.css.
 *
 * Contratos de la casa:
 *   · Angelita NO tiene perfil aquí: para ella el envoltorio devuelve los
 *     hijos tal cual (ni un <span> de más). Su entrada actual es la vara.
 *   · reduced-motion (o animated=false): sin teatro, aparece ya listo.
 *   · Cambio de especie: la especie que se va corre su SALIDA (si tiene) y
 *     solo entonces se monta la nueva con su ENTRADA. Por eso los hijos son
 *     una función `(especieMostrada) => nodo`: el cuerpo que se ve es el que
 *     está saliendo, no el elegido.
 *   · El FAB nunca desmonta al compai (política: visible 100 %), así que la
 *     salida solo ocurre al cambiar de especie.
 *   · La entrada NO arranca hasta que el cuerpo está montado: en prod los
 *     adaptadores llegan por chunk perezoso (Suspense) y sin esto el número
 *     correría sobre el placeholder. El host avisa con el segundo argumento de
 *     la función hija (`onCuerpoMontado` de CompaiAgente); si el aviso no llega,
 *     arranca igual pasado ESPERA_CUERPO_MAX_MS (guarda de ingeniería, no dato
 *     del perfil).
 */

/** Tope de espera al cuerpo perezoso antes de arrancar de todos modos. */
export const ESPERA_CUERPO_MAX_MS = 4000;
import { useCallback, useEffect, useRef, useState } from 'react';
import { planEntradaDe, planSalidaDe } from '../../compai/nucleo/entradaSalida.js';
import './compai-entrada-salida.css';

function prefiereQuietud() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @typedef {object} Numero
 * @property {string} mostrada  especie cuyo cuerpo se ve ahora
 * @property {'entrada'|'salida'|'lista'} modo
 * @property {number} i         índice de fase (-2 = esperando el cuerpo, -1 = ninguna)
 * @property {number} corrida   crece cada vez que arranca un número nuevo
 */
const ESPERA = -2;

/**
 * @param {string} especie
 * @param {boolean} sinTeatro
 * @param {number} corrida
 * @returns {Numero}
 */
function numeroDeEntrada(especie, sinTeatro, corrida) {
  const entra = !sinTeatro && planEntradaDe(especie) !== null;
  return { mostrada: especie, modo: entra ? 'entrada' : 'lista', i: entra ? ESPERA : -1, corrida };
}

/**
 * La especie elegida cambió: ¿qué número sigue?
 * @param {Numero} n
 * @param {string} especie
 * @param {boolean} sinTeatro
 * @returns {Numero}
 */
function numeroAlCambiar(n, especie, sinTeatro) {
  if (sinTeatro) return { mostrada: especie, modo: 'lista', i: -1, corrida: n.corrida + 1 };
  // ya está saliendo: al terminar leerá la especie más reciente
  if (n.modo === 'salida') return n;
  if (planSalidaDe(n.mostrada)) return { mostrada: n.mostrada, modo: 'salida', i: 0, corrida: n.corrida + 1 };
  return numeroDeEntrada(especie, false, n.corrida + 1);
}

/**
 * Variables CSS de una fase: números → `--ce-<nombre>`; booleanos → clase.
 * @param {Record<string, string|number|boolean>|undefined} vars
 * @returns {{ estilo: Record<string, string>, clases: string }}
 */
function varsDeFase(vars) {
  /** @type {Record<string, string>} */
  const estilo = {};
  /** @type {string[]} */
  const clases = [];
  for (const [k, v] of Object.entries(vars || {})) {
    if (typeof v === 'boolean') { if (v) clases.push(`compai-es--${k}`); continue; }
    estilo[`--ce-${k}`] = String(v);
  }
  return { estilo, clases: clases.join(' ') };
}

/**
 * @param {object} props
 * @param {string} props.especie  avatarType elegido (angelita, jaguar, …).
 * @param {((especieMostrada: string, avisarCuerpo: (especie: string) => void) => import('react').ReactNode) | import('react').ReactNode} props.children
 *   el cuerpo; como función recibe la especie que debe verse AHORA y el aviso
 *   `avisarCuerpo(especie)` que el host llama cuando ese cuerpo quedó montado.
 * @param {boolean} [props.animated=true]
 * @param {string} [props.tier]  'bajo' apaga el blur (las fases siguen).
 * @param {(especie: string) => void} [props.onLista]  terminó la entrada.
 * @param {(especie: string) => void} [props.onSalio]  terminó la salida.
 */
export function CompaiEntradaSalida({
  especie,
  children,
  animated = true,
  tier = undefined,
  onLista = undefined,
  onSalio = undefined,
}) {
  const sinTeatro = !animated || prefiereQuietud();
  const [numero, setNumero] = useState(() => numeroDeEntrada(especie, sinTeatro, 0));
  const [especiePedida, setEspeciePedida] = useState(especie);
  const [cuerpoMontado, setCuerpoMontado] = useState(/** @type {string|null} */ (null));
  const avisarCuerpo = useCallback((esp) => setCuerpoMontado(esp), []);
  const especieRef = useRef(especie);
  const onListaRef = useRef(onLista);
  const onSalioRef = useRef(onSalio);
  useEffect(() => {
    especieRef.current = especie;
    onListaRef.current = onLista;
    onSalioRef.current = onSalio;
  });

  // Ajuste durante el render (patrón "información del render anterior"): la
  // especie elegida cambió → la que se ve corre su salida antes de ceder.
  if (especiePedida !== especie) {
    setEspeciePedida(especie);
    setNumero((n) => numeroAlCambiar(n, especie, sinTeatro));
  }

  // EL METRÓNOMO: por cada número (entrada o salida de una especie) una cadena
  // de temporizadores, una fase cada uno. Solo depende del arranque del número
  // (y de que el cuerpo esté), no del índice de fase: la cadena vive entera
  // dentro de los callbacks.
  const { mostrada, modo, corrida } = numero;
  const cuerpoListo = cuerpoMontado === mostrada;
  useEffect(() => {
    if (modo === 'lista') return undefined;
    const plan = modo === 'salida' ? planSalidaDe(mostrada) : planEntradaDe(mostrada);
    if (!plan || plan.fases.length === 0) return undefined;
    let timer = 0;
    const paso = (k) => {
      timer = window.setTimeout(() => {
        if (k + 1 < plan.fases.length) {
          setNumero((n) => ({ ...n, i: k + 1 }));
          paso(k + 1);
          return;
        }
        if (modo === 'salida') {
          onSalioRef.current?.(mostrada);
          setNumero((n) => numeroDeEntrada(especieRef.current, false, n.corrida + 1));
          return;
        }
        setNumero((n) => ({ ...n, modo: 'lista', i: -1 }));
        onListaRef.current?.(mostrada);
      }, plan.fases[k].ms);
    };
    const arrancar = () => {
      setNumero((n) => (n.i === ESPERA ? { ...n, i: 0 } : n));
      paso(0);
    };
    // Entrada sin cuerpo todavía: esperar el aviso (el efecto vuelve a correr
    // cuando llega) o arrancar igual al tope. Salida: el cuerpo ya está.
    const esperaMs = modo === 'entrada' && !cuerpoListo ? ESPERA_CUERPO_MAX_MS : 0;
    timer = window.setTimeout(arrancar, esperaMs);
    return () => window.clearTimeout(timer);
  }, [mostrada, modo, corrida, cuerpoListo]);

  const planE = planEntradaDe(mostrada);
  const planS = planSalidaDe(mostrada);
  const cuerpo = typeof children === 'function' ? children(mostrada, avisarCuerpo) : children;

  // Angelita (y cualquier especie sin perfil): ni un nodo de más.
  if (!planE && !planS) return cuerpo;

  const plan = (modo === 'salida' ? planS : planE) || planE || planS;
  const f = plan && numero.i >= 0 ? plan.fases[numero.i] : null;
  const nombreFase = f ? f.nombre : (numero.i === ESPERA ? 'espera' : 'lista');
  const { estilo, clases } = varsDeFase(f?.vars);
  const clase = [
    'compai-es',
    `compai-es--${plan.tipo}`,
    `compai-es--${modo}`,
    `compai-es--fase-${nombreFase}`,
    clases,
  ].filter(Boolean).join(' ');

  return (
    <span
      className={clase}
      data-ce-especie={mostrada}
      data-ce-tipo={plan.tipo}
      data-ce-modo={modo}
      data-ce-fase={nombreFase}
      data-ce-tier={tier || undefined}
      style={{ '--ce-aura': plan.aura, ...(f ? { '--ce-ms': `${f.ms}ms` } : {}), ...estilo }}
    >
      <span className="compai-es__aura" aria-hidden="true" />
      <span className="compai-es__cuerpo">{cuerpo}</span>
    </span>
  );
}

export default CompaiEntradaSalida;
