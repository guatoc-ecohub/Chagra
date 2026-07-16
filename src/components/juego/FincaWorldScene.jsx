import { useMemo } from 'react';
import { fvhSkinClass } from '../../config/fvhSkin';
import { CriaturaFinca, criaturaTieneSvg } from './CriaturaFinca.jsx';

/**
 * FincaWorldScene — el MUNDO ilustrado de "Mi Finca Viva".
 *
 * Dibuja la finca con SVG inline (offline-first, cero imágenes externas,
 * rsvg-safe SIN foreignObject). Tiene DOS modos, según las props:
 *
 *   A) MODO ESCENA RICA (#34, fase 2) — si se pasa `lotes`: dibuja CADA planta
 *      según su TIPO botánico × FASE fenológica real, agrupada en ZONAS legibles
 *      (huerta / frutales / aromáticas / invernadero / animales) declaradas en el
 *      perfil (`variant.zonas`, `variant.invernaderoForma`). Un campesino y una
 *      niña distinguen frutal (árbol) de huerta (cama) de aromática (mata) de un
 *      vistazo. Las zonas declaradas sin plantas reales se dibujan "por sembrar"
 *      (acogedoras, nunca campo muerto). CERO fabricación: solo se dibujan plantas
 *      que existen en los datos.
 *
 *   B) MODO MUNDO POR NIVEL (juego) — si NO se pasa `lotes`: dibuja el mundo que
 *      crece por nivel Gliessman (árboles/matas/criaturas del `stage`), como
 *      antes. Compatibilidad total: el juego "Mi Finca Viva" sigue igual.
 *
 * En ambos modos el `variant` (de fincaSceneProfileSelector.selectSceneVariant)
 * decide el BACKDROP base (balcón urbano, invernadero, finca rural, restauración,
 * páramo). Si no hay `variant`, cae al backdrop rural clásico.
 *
 * Posiciones DETERMINISTAS (no Math.random entre renders): el mundo es estable y
 * reconocible para la niña, no parpadea distinto cada vez. Animaciones suaves vía
 * juego-finca.css (respetan prefers-reduced-motion). aria-label honesto del estado
 * real. Español de Colombia (tú/usted), sin voseo.
 *
 * @param {Object} props
 * @param {Object} props.stage       WORLD_STAGES[nivel] (cielo, tierra, arboles, vida)
 * @param {Array}  [props.criaturas]  criaturas con {emoji, desbloqueada}
 * @param {boolean} [props.vacia]    finca sin datos → mundo "esperando"
 * @param {Object} [props.variant]   { kind, escala, animales, cerdos, tinte,
 *                                      zonas, invernaderoForma, invernaderoTamano }
 * @param {Array}  [props.lotes]     SceneLote[] de fincaSceneService (con tipo+fase
 *                                   +growth). Si se pasa → MODO ESCENA RICA.
 * @param {Array}  [props.animales]  animales de la escena (corral) en modo rico.
 */
export default function FincaWorldScene({
  stage,
  criaturas = [],
  vacia = false,
  variant = null,
  lotes = null,
  animales = [],
}) {
  const kind = variant?.kind || 'finca';
  const animalesEnEscena = variant ? variant.animales !== false : true;
  const cerdosEnEscena = variant ? variant.cerdos === true : false;
  // MODO ESCENA RICA cuando el caller inyecta los lotes reales (con tipo+fase).
  const modoRico = Array.isArray(lotes);

  // Posiciones DETERMINISTAS de los árboles del MODO MUNDO (juego por nivel).
  const arboles = useMemo(() => {
    if (modoRico) return [];
    const n = vacia ? 0 : stage?.arboles || 0;
    const slots = [];
    for (let i = 0; i < n; i += 1) {
      const x = 30 + (i * 47) % 340;
      const baseY = 168 + ((i * 13) % 22);
      const scale = 0.72 + ((i * 7) % 30) / 100;
      const tipo = i % 3; // 3 estilos de copa para variedad
      slots.push({ x, baseY, scale, tipo, key: `t${i}` });
    }
    return slots;
  }, [stage, vacia, modoRico]);

  // Plantitas/arbustos pequeños = "vida" del suelo (MODO MUNDO).
  const matas = useMemo(() => {
    if (modoRico) return [];
    const n = vacia ? 0 : Math.min(stage?.vida || 0, 8);
    const slots = [];
    for (let i = 0; i < n; i += 1) {
      const x = 50 + (i * 41) % 320;
      const y = 192 + ((i * 9) % 16);
      slots.push({ x, y, key: `m${i}` });
    }
    return slots;
  }, [stage, vacia, modoRico]);

  // Criaturas vivas (desbloqueadas) sobrevolando el mundo (MODO MUNDO).
  const criaturasVivas = useMemo(
    () => criaturas.filter((c) => c.desbloqueada).slice(0, 6),
    [criaturas],
  );

  // ── MODO ESCENA RICA: distribución de plantas por ZONA (determinista) ──────
  const escenaRica = useMemo(
    () => (modoRico ? construirEscenaRica({ lotes, variant }) : null),
    [modoRico, lotes, variant],
  );
  // ¿La escena rica tiene algo que mostrar? (plantas reales, zonas declaradas
  // "por sembrar" o un invernadero). Si una finca está globalmente vacía pero
  // declaró zonas en el onboarding, SÍ dibujamos esas camas "por sembrar"
  // (acogedoras), no un campo muerto. Sin nada declarado → cae a la semillita.
  const ricaTieneContenido = modoRico
    && escenaRica
    && (escenaRica.bandas.length > 0 || escenaRica.camas.length > 0 || escenaRica.tieneInv);

  const [cieloA, cieloB] = stage?.cielo || ['#bcd9e8', '#e8f3ee'];
  const [tierraA, tierraB] = stage?.tierra || ['#c9a878', '#a98a5e'];
  const sceneKey = `${kind}-${stage?.level ?? 0}`;
  const gradId = `fv-sky-${sceneKey}`;
  const gradTierra = `fv-soil-${sceneKey}`;
  const level = stage?.level ?? 0;

  // Etiqueta accesible. En modo rico, describe el estado real (cuántos frutales,
  // huerta, aromáticas y su etapa) — honesto y útil para el campesino.
  const variantLabel = VARIANT_ARIA[kind] || VARIANT_ARIA.finca;
  let ariaLabel;
  if (ricaTieneContenido) {
    // Escena rica: describe el estado real (zonas, fases) o las zonas "por
    // sembrar" si la finca está recién declarada — siempre honesto y acogedor.
    ariaLabel = `${variantLabel} ${ariaDeLotes(escenaRica, animales)}`.trim();
  } else if (vacia) {
    ariaLabel = `${variantLabel} Está esperando que siembres tu primera planta.`;
  } else if (modoRico) {
    ariaLabel = `${variantLabel} ${ariaDeLotes(escenaRica, animales)}`.trim();
  } else {
    ariaLabel = `${variantLabel} ${stage?.nombreNino ? `Etapa ${stage.nombreNino}: ${stage.mensaje}` : ''}`.trim();
  }

  return (
    <div
      className={fvhSkinClass('fv-scene')}
      data-testid="finca-world-scene"
      data-level={level}
      data-variant={kind}
      data-modo={modoRico ? 'rica' : 'mundo'}
      data-invernadero={modoRico ? (escenaRica.invernaderoForma || '') : ''}
      role="img"
      aria-label={ariaLabel}
    >
      <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cieloA} />
            <stop offset="100%" stopColor={cieloB} />
          </linearGradient>
          <linearGradient id={gradTierra} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tierraB} />
            <stop offset="100%" stopColor={tierraA} />
          </linearGradient>
        </defs>

        {/* Cielo (común a todas las variantes; el tinte viene del stage real) */}
        <rect x="0" y="0" width="400" height="240" fill={`url(#${gradId})`} />

        {/* Sol — cálido, identidad solar de Chagra */}
        <g className="fv-sun">
          <circle cx="330" cy="48" r="26" fill="#ffe08a" opacity="0.95" />
          <circle cx="330" cy="48" r="18" fill="#ffd24d" />
          {/* rayos sutiles (mano radial / energía solar — motivo Chagra) */}
          <g stroke="#ffd98a" strokeWidth="2.2" strokeLinecap="round" opacity="0.55">
            <line x1="330" y1="12" x2="330" y2="20" />
            <line x1="364" y1="48" x2="356" y2="48" />
            <line x1="305" y1="23" x2="311" y2="29" />
            <line x1="355" y1="23" x2="349" y2="29" />
          </g>
        </g>

        {/* Nubes (en páramo más densas/brumosas — se refuerza abajo) */}
        <g className="fv-cloud" fill="#ffffff" opacity="0.85">
          <ellipse cx="80" cy="44" rx="26" ry="13" />
          <ellipse cx="100" cy="40" rx="20" ry="14" />
          <ellipse cx="62" cy="40" rx="16" ry="11" />
        </g>
        <g className="fv-cloud-2" fill="#ffffff" opacity="0.7">
          <ellipse cx="210" cy="64" rx="22" ry="11" />
          <ellipse cx="228" cy="60" rx="16" ry="11" />
        </g>

        {/* ── BACKDROP POR VARIANTE ──────────────────────────────────────── */}
        {kind === 'balcon' && <BalconBackdrop />}
        {/* En modo rico el invernadero se dibuja por FORMA en la zona, no como
            backdrop monocultivo clásico. Solo backdrop clásico fuera de modo rico. */}
        {kind === 'invernadero' && !modoRico && <InvernaderoBackdrop tierraGrad={gradTierra} />}
        {kind === 'invernadero' && modoRico && <FincaBackdrop tierraGrad={gradTierra} tierraB={tierraB} />}
        {kind === 'paramo' && <ParamoBackdrop />}
        {kind === 'restauracion' && (
          <RestauracionBackdrop tierraGrad={gradTierra} tierraB={tierraB} />
        )}
        {kind === 'finca' && <FincaBackdrop tierraGrad={gradTierra} tierraB={tierraB} />}

        {/* ═══ MODO ESCENA RICA: zonas + plantas por tipo×fase + invernadero ══ */}
        {/* Se dibuja si hay plantas reales O si el perfil declaró zonas/invernadero
            (esas zonas se pintan "por sembrar" aunque la finca esté vacía). */}
        {ricaTieneContenido && <EscenaRica escena={escenaRica} animales={animales} />}

        {/* ═══ MODO MUNDO (juego por nivel): árboles/matas/criaturas ═════════ */}
        {!modoRico && kind !== 'balcon' && kind !== 'invernadero' && kind !== 'paramo' && arboles.map((t, i) => (
          <g
            key={t.key}
            className={`fv-grow ${i % 2 === 0 ? 'fv-sway' : 'fv-sway-slow'}`}
            transform={`translate(${t.x} ${t.baseY}) scale(${t.scale})`}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <rect x="-4" y="0" width="8" height="26" rx="3" fill="#7a5230" />
            {t.tipo === 0 && (
              <>
                <circle cx="0" cy="-10" r="20" fill="#3f8f4e" />
                <circle cx="-12" cy="-2" r="13" fill="#4ca35c" />
                <circle cx="12" cy="-2" r="13" fill="#4ca35c" />
              </>
            )}
            {t.tipo === 1 && (
              <>
                <ellipse cx="0" cy="-12" rx="16" ry="22" fill="#46985a" />
                <ellipse cx="0" cy="-12" rx="9" ry="15" fill="#5bb06e" />
              </>
            )}
            {t.tipo === 2 && (
              <>
                <circle cx="0" cy="-14" r="16" fill="#3f8f4e" />
                <circle cx="0" cy="0" r="14" fill="#4ca35c" />
                {level >= 3 && (
                  <>
                    <circle cx="-6" cy="-10" r="3" fill="#ff7a59" />
                    <circle cx="7" cy="-2" r="3" fill="#ffb74d" />
                  </>
                )}
              </>
            )}
          </g>
        ))}

        {!modoRico && kind !== 'paramo' && matas.map((m, i) => {
          const onDeck = kind === 'balcon' || kind === 'invernadero';
          const mx = onDeck ? 96 + (i * 36) % 208 : m.x;
          const my = onDeck ? 178 + ((i * 7) % 10) : m.y;
          return (
            <g
              key={m.key}
              className="fv-grow"
              transform={`translate(${mx} ${my})`}
              style={{ animationDelay: `${0.3 + i * 0.06}s` }}
            >
              <path d="M0 12 Q-6 0 -2 -6" stroke="#4ca35c" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M0 12 Q6 0 2 -6" stroke="#4ca35c" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M0 12 V-2" stroke="#46985a" strokeWidth="3" fill="none" strokeLinecap="round" />
              {level >= 2 && <circle cx="0" cy="-7" r="3" fill="#ff9ec4" />}
            </g>
          );
        })}

        {/* Animales del juego (MODO MUNDO) — solo finca rural si la variante los habilita */}
        {!modoRico && !vacia && kind === 'finca' && animalesEnEscena && (
          <g className="fv-grow" transform="translate(300 200)" style={{ animationDelay: '0.5s' }}>
            <g transform="translate(0 0)">
              <ellipse cx="0" cy="0" rx="8" ry="6.5" fill="#f4ead0" />
              <g className="fv-peck">
                <circle cx="6" cy="-5" r="4" fill="#f4ead0" />
                <path d="M5 -8 q1 -4 3 -2 q-1 2 -3 2" fill="#e0532f" />
                <path d="M10 -5 l4 1 l-4 1 Z" fill="#ffb74d" />
                <circle cx="7" cy="-6" r="1" fill="#3a2024" />
              </g>
              <line x1="-2" y1="6" x2="-2" y2="10" stroke="#c79a4a" strokeWidth="1.4" />
              <line x1="3" y1="6" x2="3" y2="10" stroke="#c79a4a" strokeWidth="1.4" />
            </g>
            {cerdosEnEscena && (
              <g transform="translate(-30 6)">
                <g className="fv-wiggle">
                  <ellipse cx="0" cy="0" rx="15" ry="10" fill="#f1a6b0" />
                  <circle cx="13" cy="-2" r="7" fill="#f1a6b0" />
                  <ellipse cx="18" cy="-1" rx="3.5" ry="3" fill="#e88a98" />
                  <circle cx="17" cy="-2" r="1" fill="#7a3d48" />
                  <circle cx="19" cy="-2" r="1" fill="#7a3d48" />
                  <circle cx="11" cy="-7" r="1.2" fill="#3a2024" />
                  <path d="M8 -9 l3 -5 l2 5 Z" fill="#e88a98" />
                </g>
              </g>
            )}
          </g>
        )}

        {/* Semillita cuando la finca está esperando (vacía) — en todas las
            variantes con suelo (no en balcón/invernadero clásico). En modo rico
            solo si NO hay zonas/invernadero declarados (esos ya pintan sus camas
            "por sembrar"); así no duplicamos la invitación. */}
        {vacia && kind !== 'balcon'
          && (modoRico ? !ricaTieneContenido : kind !== 'invernadero') && (
          <g transform="translate(200 196)" className="fv-grow">
            <ellipse cx="0" cy="4" rx="9" ry="6" fill="#8a6a3a" />
            <path d="M0 -2 Q-4 -10 0 -16 Q4 -10 0 -2" fill="#5bb06e" />
          </g>
        )}
      </svg>

      {/* Criaturas vivas — sus PERSONAJES rubber-hose viviendo sobre el mundo
          (spec belleza-juegos: actores como protagonistas, no emojis de adorno).
          Cada bicho reconocido es su SVG de la casa con su vida idle; los que aún
          no tienen SVG fiel (mariquita, quetzal) caen a su emoji, honesto. La
          altura respeta su hábitat: voladores arriba (cielo), suelo abajo. */}
      {!modoRico && !vacia && criaturasVivas.length > 0 && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {criaturasVivas.map((c, i) => {
            const svg = criaturaTieneSvg(c.id);
            const n = criaturasVivas.length;
            // Reparto horizontal parejo, legible (composición estilo Age of
            // Empires: actores separados, nada amontonado) evitando la esquina
            // del sol (arriba-derecha). Franja 8%–70% del ancho.
            const left = n <= 1 ? 40 : Math.round(8 + (i * 62) / (n - 1));
            // Banda de hábitat: voladores (colibrí/mariposa/abeja) alto en el
            // cielo; suelo (lombriz) abajo; resto al medio. Jitter determinista
            // por índice para que no queden en fila rígida.
            const volador = c.id === 'colibri' || c.id === 'mariposa' || c.id === 'abeja';
            const suelo = c.id === 'lombriz';
            const jitter = (i % 2 === 0 ? 0 : 6);
            const top = suelo
              ? 62 + jitter
              : volador
                ? 10 + ((i * 5) % 14) + jitter
                : 38 + jitter;
            return (
              <span
                key={c.id}
                className="fv-float absolute select-none"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  fontSize: svg ? undefined : '1.7rem',
                  filter: 'drop-shadow(0 3px 4px rgba(20,30,22,0.28))',
                  animationDelay: `${i * 0.5}s`,
                }}
              >
                {svg ? (
                  <CriaturaFinca id={c.id} emoji={c.emoji} nombre={c.nombre} size={46} />
                ) : (
                  c.emoji
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Texto accesible base por variante (se concatena con el estado real). */
const VARIANT_ARIA = Object.freeze({
  balcon: 'Tu balcón urbano: materas con plantas, baranda y la ciudad de fondo.',
  invernadero: 'Tu invernadero: techo translúcido y camas de cultivo con riego.',
  finca: 'Tu finca rural: huerta, frutales, aromáticas y animales.',
  restauracion: 'Tu área en restauración: bosque y orilla de quebrada recuperándose con nativas.',
  paramo: 'Tu páramo de alta montaña: frailejones y niebla, sin lotes de cultivo.',
});

// ═══════════════════════════════════════════════════════════════════════════
// MODO ESCENA RICA — composición de zonas y dibujo por tipo×fase
// ═══════════════════════════════════════════════════════════════════════════

/** Etiqueta legible de cada zona (para el plano y el aria-label). */
const ZONA_LABEL = Object.freeze({
  frutales: 'frutales',
  huerta: 'huerta',
  aromaticas: 'aromáticas',
  invernadero: 'invernadero',
});

/** Mapa tipo de planta → zona donde vive en la escena. */
const TIPO_A_ZONA = Object.freeze({
  frutal: 'frutales',
  hortaliza: 'huerta',
  aromatica: 'aromaticas',
  otro: 'huerta', // los "otros" (árboles, etc.) acompañan la huerta como sombra/borde
});

/**
 * Construye la composición de la escena rica: agrupa los lotes reales por zona,
 * resuelve qué zonas existen (datos reales ∪ zonas declaradas en el perfil), y
 * asigna a cada zona una BANDA del lienzo (layout determinista). Las zonas
 * declaradas sin plantas reales quedan "por sembrar" (vacías, acogedoras).
 *
 * @param {Object} input
 * @param {Array}  input.lotes      SceneLote[] (con tipo+fase+growth)
 * @param {Object} input.variant    { zonas, invernaderoForma, invernaderoTamano }
 * @returns {Object} { bandas:[{zona, label, plantas, declarada, x,y,w}], invernadero }
 */
function construirEscenaRica({ lotes, variant }) {
  const reales = Array.isArray(lotes) ? lotes : [];
  // Cap de plantas dibujadas por zona (rendimiento gama baja + legibilidad).
  const MAX_POR_ZONA = 5;

  // Agrupar lotes por zona (según su tipo).
  const porZona = { frutales: [], huerta: [], aromaticas: [] };
  for (const l of reales) {
    const zona = TIPO_A_ZONA[l.tipo] || 'huerta';
    if (porZona[zona]) porZona[zona].push(l);
  }

  // Zonas declaradas en el perfil (huerta/frutales/aromaticas). 'animales' se
  // dibuja aparte (corral). Si el perfil no declaró nada, las zonas existen por
  // los datos reales.
  const declaradas = new Set(
    (Array.isArray(variant?.zonas) ? variant.zonas : [])
      .filter((z) => z === 'huerta' || z === 'frutales' || z === 'aromaticas'),
  );

  // Orden visual de fondo→frente: frutales (árboles, atrás) → aromáticas →
  // huerta (camas, adelante). Una zona se incluye si tiene plantas reales O si
  // fue declarada en el perfil (para dibujarla "por sembrar").
  const ordenZonas = ['frutales', 'aromaticas', 'huerta'];
  const zonasActivas = ordenZonas.filter(
    (z) => porZona[z].length > 0 || declaradas.has(z),
  );

  // Invernadero: forma declarada (cuadrado/tunel/otro) o, si el perfil declaró
  // invernadero sin forma pero la variante es de invernadero, genérico.
  const formaDeclarada = variant?.invernaderoForma || null;
  const esInvernadero = variant?.kind === 'invernadero';
  const invernaderoForma = formaDeclarada || (esInvernadero ? 'otro' : null);

  // Layout: las zonas se dibujan como BANDAS horizontales que ocupan (casi) todo
  // el ancho — frutales al fondo, aromáticas al medio, huerta al frente — para
  // que se lean como áreas, no como plantas sueltas. El invernadero (si lo hay)
  // se acomoda en la esquina TRASERA IZQUIERDA: las bandas se recortan por la
  // izquierda solo en la banda más al fondo, no en todas (así no se amontonan).
  const tieneInv = !!invernaderoForma;
  const zonaX0 = 22;
  const zonaW = 356;

  // Separamos zonas CON plantas (bandas de profundidad) de zonas VACÍAS
  // declaradas (camas "por sembrar"), porque su layout es distinto: las
  // sembradas se apilan en bandas (atrás→frente); las por sembrar se reparten
  // como CAMITAS pequeñas separadas horizontalmente (no franjas apiladas).
  const conPlantas = zonasActivas.filter((z) => porZona[z].length > 0);
  const porSembrar = zonasActivas.filter((z) => porZona[z].length === 0);

  const nBandas = Math.max(conPlantas.length, 1);
  // Líneas base de las bandas: TODAS las plantas se paran sobre el suelo (no
  // flotan ni se meten en las colinas). La profundidad se da con un leve offset
  // (atrás un poco más arriba) + escala (atrás un poco más chico), no subiendo
  // árboles al cielo. Rango compacto sobre la tierra: 196 (atrás) → 224 (frente).
  const yTop = 196;
  const yBot = 224;
  const bandas = conPlantas.map((zona, i) => {
    const baseY = nBandas === 1
      ? 210
      : Math.round(yTop + (i * (yBot - yTop)) / (nBandas - 1));
    // Escala de profundidad: las bandas de atrás un poco más pequeñas.
    const escala = nBandas === 1 ? 1 : 0.86 + (i / (nBandas - 1)) * 0.22; // 0.86→1.08
    const grupo = porZona[zona].slice(0, MAX_POR_ZONA);
    // El invernadero vive en la esquina trasera izquierda (x≈18-146): SOLO la
    // banda más al fondo (i===0) cede ese espacio y empieza a la derecha de la
    // nave; las demás bandas usan todo el ancho.
    const xIzq = tieneInv && i === 0 ? 156 : zonaX0;
    const anchoBanda = zonaX0 + zonaW - xIzq;
    // Repartimos el grupo de plantas a lo ancho de su banda con paso uniforme,
    // para que se lea como una ZONA (una fila/área), no como plantas amontonadas.
    const n = grupo.length;
    const paso = Math.min(64, (anchoBanda - 36) / Math.max(n, 1));
    const anchoGrupo = paso * Math.max(n - 1, 0);
    const x0 = xIzq + (anchoBanda - anchoGrupo) / 2;
    const plantas = grupo.map((l, j) => ({
      ...l,
      px: Math.round(x0 + j * paso),
      py: baseY,
      escala,
      key: l.id || `${zona}-${j}`,
    }));
    return {
      zona,
      label: ZONA_LABEL[zona],
      plantas,
      escala,
      declarada: declaradas.has(zona),
      vacia: false,
      x: xIzq,
      y: baseY,
      w: anchoBanda,
    };
  });

  // Camas "por sembrar": camitas pequeñas REPARTIDAS horizontalmente en el frente
  // de la escena (donde irían de verdad). Si hay invernadero, empiezan a su
  // derecha. Cada cama es compacta, con su etiqueta discreta al lado — nada de
  // franjas de ancho completo apiladas ni columna central de puntos.
  const camas = (() => {
    if (porSembrar.length === 0) return [];
    const camX0 = tieneInv ? 158 : 40;
    const camX1 = 372;
    const ancho = camX1 - camX0;
    const n = porSembrar.length;
    // baseline: si NO hay plantas sembradas, las camas se ven más centradas en el
    // frente cálido; si conviven con plantas, van al frente (abajo).
    const baseY = conPlantas.length > 0 ? 230 : 214;
    return porSembrar.map((zona, i) => {
      // centro de cada cama, repartido uniforme con margen.
      const cx = n === 1
        ? camX0 + ancho / 2
        : Math.round(camX0 + 28 + (i * (ancho - 56)) / (n - 1));
      // ligero escalonado vertical para dar naturalidad (no una fila rígida).
      const cy = baseY + (i % 2 === 0 ? 0 : 8);
      return { zona, label: ZONA_LABEL[zona], cx, cy, key: `cama-${zona}` };
    });
  })();

  return { bandas, camas, invernaderoForma, tieneInv };
}

/** aria-label honesto del estado real de la escena rica. */
function ariaDeLotes(escena, animales) {
  if (!escena) return '';
  const partes = [];
  for (const b of escena.bandas) {
    // Resumen de fases presentes en la zona (florecidas, con frutos, etc.).
    const fases = new Set(b.plantas.map((p) => p.fase));
    const detalle = [];
    if (fases.has('flower')) detalle.push('florecida');
    if (fases.has('fruit') || fases.has('harvest')) detalle.push('con frutos');
    if (fases.has('seed') || fases.has('sprout')) detalle.push('recién sembrada');
    partes.push(
      `${b.plantas.length} en ${b.label}${detalle.length ? ` (${detalle.join(', ')})` : ''}`,
    );
  }
  // Zonas declaradas aún sin plantas → "por sembrar" (acogedoras, honestas).
  for (const c of escena.camas || []) {
    partes.push(`${c.label} por sembrar`);
  }
  if (escena.invernaderoForma) {
    const forma = escena.invernaderoForma === 'cuadrado'
      ? 'cuadrado'
      : escena.invernaderoForma === 'tunel' ? 'de túnel' : '';
    partes.push(`invernadero ${forma}`.trim());
  }
  if (Array.isArray(animales) && animales.length > 0) {
    partes.push(`${animales.length} grupo${animales.length > 1 ? 's' : ''} de animales en el corral`);
  }
  return partes.length ? `Tienes ${partes.join(', ')}.` : '';
}

/**
 * EscenaRica — pinta las bandas de zonas (con sus plantas por tipo×fase), el
 * invernadero por forma y el corral de animales. Todo determinista y rsvg-safe.
 */
function EscenaRica({ escena, animales }) {
  return (
    <>
      {/* Invernadero (a la izquierda) según su forma declarada */}
      {escena.invernaderoForma && <Invernadero forma={escena.invernaderoForma} />}

      {/* Bandas de zonas CON plantas, de atrás (frutales) hacia adelante (huerta) */}
      {escena.bandas.map((banda, bi) => (
        <g key={banda.zona}>
          {/* Parche de suelo suave que AGRUPA la zona (la hace legible como una
              unidad, no plantas sueltas). Tono de tierra cálida (paleta Chagra). */}
          {banda.zona !== 'huerta' && (
            <ParcheZona x={banda.x} y={banda.y} w={banda.w} />
          )}
          {/* Cama/era de la zona huerta (suelo labrado) — da contexto de "huerta" */}
          {banda.zona === 'huerta' && (
            <CamaHuerta x={banda.x} y={banda.y} w={banda.w} />
          )}
          {banda.plantas.map((p, pi) => (
            <g
              key={p.key}
              className={`fv-grow ${pi % 2 === 0 ? 'fv-sway' : 'fv-sway-slow'}`}
              transform={`translate(${p.px} ${p.py}) scale(${p.escala})`}
              style={{ animationDelay: `${Math.min(bi * 0.12 + pi * 0.07, 1)}s` }}
            >
              <PlantaPorTipo tipo={p.tipo} fase={p.fase} growth={p.growth} />
            </g>
          ))}
        </g>
      ))}

      {/* Camas "por sembrar": zonas declaradas aún sin plantas, repartidas como
          camitas pequeñas y acogedoras (no franjas apiladas ni columna central) */}
      {(escena.camas || []).map((cama, ci) => (
        <CamaPorSembrar
          key={cama.key}
          zona={cama.zona}
          cx={cama.cx}
          cy={cama.cy}
          delay={0.15 + ci * 0.1}
        />
      ))}

      {/* Corral de animales (si los hay) — esquina inferior derecha */}
      {Array.isArray(animales) && animales.length > 0 && <Corral animales={animales} />}
    </>
  );
}

/**
 * PlantaPorTipo — el dibujo de UNA planta según su TIPO botánico × FASE real.
 * Silueta clara y distinguible por tipo; el detalle de fase (flor, fruto,
 * cosecha) viene de datos reales. `growth` (0..1) escala el tamaño.
 *
 * @param {Object} props
 * @param {'frutal'|'hortaliza'|'aromatica'|'otro'} props.tipo
 * @param {'seed'|'sprout'|'leaf'|'flower'|'fruit'|'harvest'|'rest'} props.fase
 * @param {number} props.growth  0..1
 */
function PlantaPorTipo({ tipo, fase, growth = 0.5 }) {
  switch (tipo) {
    case 'frutal':
      return <Frutal fase={fase} growth={growth} />;
    case 'aromatica':
      return <Aromatica fase={fase} growth={growth} />;
    case 'hortaliza':
      return <Hortaliza fase={fase} growth={growth} />;
    default:
      return <Otro fase={fase} growth={growth} />;
  }
}

// ── FRUTAL: árbol (tronco + copa). Flor=florecitas; fruto=frutos de color;
//    cosecha=copa cargada/dorada; semilla/brote=arbolito chico. ───────────────
function Frutal({ fase, growth = 0.6 }) {
  const joven = fase === 'seed' || fase === 'sprout';
  // tronco más alto y copa mayor con la madurez
  const th = 14 + growth * 16; // alto del tronco
  const r = 12 + growth * 9; // radio base de la copa
  if (joven) {
    // arbolito chico (recién plantado / brotando)
    const h = 8 + growth * 10;
    return (
      <>
        <rect x="-2" y={-h} width="4" height={h} rx="2" fill="#7a5230" />
        <circle cx="0" cy={-h - 6} r="8" fill="#5aa861" />
        <circle cx="-5" cy={-h - 2} r="5" fill="#6cc07e" />
        <circle cx="5" cy={-h - 2} r="5" fill="#6cc07e" />
      </>
    );
  }
  const cy = -th - r * 0.6;
  return (
    <>
      {/* tronco */}
      <rect x="-3.5" y={-th} width="7" height={th} rx="3" fill="#7a5230" />
      <rect x="-3.5" y={-th} width="3" height={th} rx="1.5" fill="#8a623c" opacity="0.7" />
      {/* copa frondosa (3 lóbulos para volumen) */}
      <circle cx="0" cy={cy} r={r} fill={fase === 'harvest' ? '#5fa84e' : '#3f8f4e'} />
      <circle cx={-r * 0.7} cy={cy + r * 0.35} r={r * 0.72} fill="#4ca35c" />
      <circle cx={r * 0.7} cy={cy + r * 0.35} r={r * 0.72} fill="#4ca35c" />
      <circle cx="0" cy={cy - r * 0.3} r={r * 0.62} fill="#5bb06e" />
      {/* FASE: floración → florecitas blancas/rosa en la copa */}
      {fase === 'flower' && (
        <g>
          <Florecita cx={-r * 0.5} cy={cy - r * 0.2} color="#ffd9e6" />
          <Florecita cx={r * 0.45} cy={cy + r * 0.15} color="#ffe6f0" />
          <Florecita cx={0} cy={cy - r * 0.5} color="#fff0f6" />
          <Florecita cx={-r * 0.2} cy={cy + r * 0.45} color="#ffd9e6" />
        </g>
      )}
      {/* FASE: fructificación → frutos de color (durazno/aguacate) */}
      {fase === 'fruit' && (
        <g>
          <circle cx={-r * 0.5} cy={cy + r * 0.1} r="3.6" fill="#7aa03a" />
          <circle cx={r * 0.5} cy={cy + r * 0.3} r="3.6" fill="#e58a3c" />
          <circle cx={0} cy={cy - r * 0.35} r="3.4" fill="#7aa03a" />
          <circle cx={r * 0.2} cy={cy + r * 0.5} r="3.2" fill="#e58a3c" />
          {/* brillito del fruto */}
          <circle cx={-r * 0.55} cy={cy + r * 0.02} r="1" fill="#cfe09a" />
        </g>
      )}
      {/* FASE: cosecha → copa cargada y dorada (lista) */}
      {fase === 'harvest' && (
        <g>
          <circle cx={-r * 0.55} cy={cy + r * 0.05} r="3.8" fill="#f0a93c" />
          <circle cx={r * 0.55} cy={cy + r * 0.25} r="3.8" fill="#ef8a3a" />
          <circle cx={0} cy={cy - r * 0.35} r="3.6" fill="#f6c44b" />
          <circle cx={-r * 0.1} cy={cy + r * 0.45} r="3.6" fill="#f0a93c" />
          <circle cx={r * 0.25} cy={cy - r * 0.1} r="3.4" fill="#ef8a3a" />
        </g>
      )}
    </>
  );
}

// ── AROMÁTICA: mata redondeada COMPACTA y mullida (domo cerrado, tipo arbusto de
//    hierba). flor=florecitas lila SOBRE el domo. Silueta clara: NO antenas, NO
//    flores flotando — para que en aislamiento se lea como una matica de hierba. ─
function Aromatica({ fase, growth = 0.5 }) {
  const r = 9 + growth * 6; // radio del domo
  // El domo se apoya en el suelo (y=0). Centro del domo en cy.
  const cy = -r * 0.78;
  return (
    <>
      {/* sombra/base de la mata sobre el suelo (la asienta, no flota) */}
      <ellipse cx="0" cy="0" rx={r * 1.05} ry={r * 0.32} fill="#3f8f4e" opacity="0.3" />
      {/* domo principal cerrado (media-luna mullida apoyada en el suelo) */}
      <path
        d={`M${-r} 0 A ${r} ${r * 1.05} 0 0 1 ${r} 0 Z`}
        fill="#4ca35c"
      />
      {/* lóbulos internos = textura mullida compacta, todos DENTRO del domo */}
      <circle cx={-r * 0.42} cy={cy + r * 0.18} r={r * 0.5} fill="#5aa861" />
      <circle cx={r * 0.42} cy={cy + r * 0.18} r={r * 0.5} fill="#5aa861" />
      <circle cx="0" cy={cy - r * 0.05} r={r * 0.56} fill="#6cc07e" />
      <circle cx={-r * 0.2} cy={cy - r * 0.18} r={r * 0.34} fill="#7fce8e" />
      <circle cx={r * 0.28} cy={cy - r * 0.12} r={r * 0.3} fill="#7fce8e" />
      {/* FASE: floración → racimitos lila SOBRE la mata (integrados, no flotando) */}
      {fase === 'flower' && (
        <g>
          <Florecita cx={-r * 0.42} cy={cy - r * 0.08} color="#c9b3f5" small />
          <Florecita cx={r * 0.4} cy={cy - r * 0.02} color="#b79cf0" small />
          <Florecita cx={0} cy={cy - r * 0.42} color="#d8c6f8" small />
        </g>
      )}
      {/* cosecha de aromática: un toque dorado de madurez sobre la mata */}
      {fase === 'harvest' && (
        <Florecita cx={0} cy={cy - r * 0.2} color="#f6c44b" small />
      )}
    </>
  );
}

// ── HORTALIZA: hilera de plántulas sobre la cama. seed=semillitas/brotes;
//    leaf=hojas; flower/fruit=con su flor/fruto pequeño. ─────────────────────
function Hortaliza({ fase, growth = 0.4 }) {
  // tres plantitas en hilera (la "era" de huerta) — más altas con la madurez
  const h = 6 + growth * 12;
  const xs = [-7, 0, 7];
  return (
    <>
      {xs.map((x, i) => (
        <g key={`h${x}`} transform={`translate(${x} 0)`}>
          {fase === 'seed' ? (
            // surco con semillita / brote apenas asomando
            <>
              <ellipse cx="0" cy="1" rx="3" ry="1.6" fill="#7a5a32" />
              <path d="M0 0 q-2 -3 -1 -5" stroke="#7fce8e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              {/* tallo corto */}
              <rect x="-1.2" y={-h} width="2.4" height={h} rx="1.2" fill="#4f9a55" />
              {/* roseta de hojas (acelga/lechuga) — mata compacta de plántula */}
              <ellipse cx={-3.4} cy={-h + 3} rx="5" ry="3" fill="#6cc07e" transform={`rotate(-26 -3.4 ${-h + 3})`} />
              <ellipse cx={3.4} cy={-h + 3} rx="5" ry="3" fill="#6cc07e" transform={`rotate(26 3.4 ${-h + 3})`} />
              <ellipse cx={0} cy={-h - 1.5} rx="4.4" ry="3.4" fill="#7fce8e" />
              {/* FASE flor → florecita amarilla integrada en el cogollo central */}
              {fase === 'flower' && i === 1 && (
                <Florecita cx={0} cy={-h - 1} color="#ffe08a" small />
              )}
              {/* FASE fruto → frutito (tomate/ají) anidado entre las hojas */}
              {(fase === 'fruit' || fase === 'harvest') && (
                <circle
                  cx={i === 1 ? 1.5 : x > 0 ? 1 : -1}
                  cy={-h + 1}
                  r={fase === 'harvest' ? 2.8 : 2.4}
                  fill={fase === 'harvest' ? '#e0532f' : '#e58a3c'}
                />
              )}
            </>
          )}
        </g>
      ))}
    </>
  );
}

// ── OTRO: silueta neutra (arbolillo/mata genérica) — nunca afirma frutal. ────
function Otro({ fase, growth = 0.5 }) {
  const h = 10 + growth * 14;
  return (
    <>
      <rect x="-2.5" y={-h} width="5" height={h} rx="2" fill="#7a5230" />
      <ellipse cx="0" cy={-h - 6} rx={9 + growth * 4} ry={11 + growth * 5} fill="#46985a" />
      <ellipse cx="0" cy={-h - 6} rx={5 + growth * 3} ry={7 + growth * 3} fill="#5bb06e" />
      {fase === 'flower' && <Florecita cx={0} cy={-h - 8} color="#fff0f6" small />}
    </>
  );
}

/** Florecita reutilizable (5 pétalos + centro). */
function Florecita({ cx, cy, color, small = false }) {
  const r = small ? 1.7 : 2.4;
  const o = small ? 1.9 : 2.6;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle cx="0" cy={-o} r={r} fill={color} />
      <circle cx={-o} cy="0" r={r} fill={color} />
      <circle cx={o} cy="0" r={r} fill={color} />
      <circle cx="0" cy={o} r={r} fill={color} />
      <circle cx="0" cy="0" r={r * 0.8} fill="#ffd24d" />
    </g>
  );
}

/**
 * ParcheZona — un parche de suelo suave bajo una zona (frutales/aromáticas) que
 * AGRUPA visualmente sus plantas como una unidad legible (no plantas sueltas).
 * Elipse cálida de tierra con un borde de pasto tenue. Paleta natural Chagra.
 */
function ParcheZona({ x, y, w }) {
  const cx = x + w / 2;
  const rx = Math.min(w / 2 - 6, 120);
  return (
    <g>
      <ellipse cx={cx} cy={y + 6} rx={rx} ry="10" fill="#7e6238" opacity="0.28" />
      <ellipse cx={cx} cy={y + 4} rx={rx - 8} ry="7" fill="#6f8a4a" opacity="0.22" />
    </g>
  );
}

/** Cama/era de huerta: bordillo de tierra labrada con surcos (contexto "huerta"). */
function CamaHuerta({ x, y, w }) {
  const left = x + 8;
  const right = x + w - 8;
  const top = y - 2;
  const bot = y + 12;
  return (
    <g>
      <rect x={left} y={top} width={right - left} height={bot - top} rx="5" fill="#7c5f38" opacity="0.85" />
      <rect x={left} y={top} width={right - left} height="4" rx="2" fill="#9c7a45" opacity="0.8" />
      {/* surcos */}
      <g stroke="#5f8a3f" strokeWidth="1.2" opacity="0.5">
        <line x1={left + 6} y1={top + 6} x2={right - 6} y2={top + 6} />
        <line x1={left + 6} y1={top + 10} x2={right - 6} y2={top + 10} />
      </g>
    </g>
  );
}

/**
 * CamaPorSembrar — una zona declarada en el perfil aún SIN plantas: una CAMITA
 * preparada, pequeña y acogedora ("lista para sembrar", NO campo muerto): un
 * montículo de tierra mullida, 2-3 hoyitos/semillitas insinuadas y su etiqueta
 * DISCRETA al lado. Se posiciona donde iría la zona (repartidas en la escena).
 * Coherente con "vacía = invita a empezar". Nunca dibuja plantas inexistentes.
 *
 * @param {Object} props
 * @param {string} props.zona  id de la zona (huerta/frutales/aromaticas)
 * @param {number} props.cx    centro x de la cama
 * @param {number} props.cy    línea de suelo de la cama (y)
 * @param {number} [props.delay]
 */
function CamaPorSembrar({ zona, cx, cy, delay = 0 }) {
  const rx = 30; // media-anchura de la camita
  return (
    <g className="fv-grow" style={{ animationDelay: `${delay}s` }}>
      {/* montículo de tierra mullida (cama preparada, cálida) */}
      <ellipse cx={cx} cy={cy + 5} rx={rx + 3} ry="9" fill="#7a5a32" opacity="0.55" />
      <path
        d={`M${cx - rx} ${cy + 4} Q${cx} ${cy - 7} ${cx + rx} ${cy + 4} Z`}
        fill="#9c7a45"
        opacity="0.92"
      />
      <path
        d={`M${cx - rx + 4} ${cy + 3} Q${cx} ${cy - 4} ${cx + rx - 4} ${cy + 3}`}
        fill="none"
        stroke="#b08f55"
        strokeWidth="1.4"
        opacity="0.7"
      />
      {/* 3 hoyitos/semillitas insinuadas a lo largo de la cresta (invitan) */}
      <g>
        <Hoyito cx={cx - 13} cy={cy - 1} />
        <Hoyito cx={cx} cy={cy - 3} />
        <Hoyito cx={cx + 13} cy={cy - 1} />
      </g>
      {/* etiqueta DISCRETA al pie de la cama (no apilada al centro) */}
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        fontSize="8"
        fontWeight="600"
        fill="#7c5f38"
        opacity="0.95"
        fontFamily="system-ui, sans-serif"
      >
        {ZONA_LABEL[zona] || zona}
      </text>
    </g>
  );
}

/** Hoyito con semillita insinuada: surco redondo + un puntito de brote tierno. */
function Hoyito({ cx, cy }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse cx="0" cy="0" rx="3" ry="1.8" fill="#6e5634" opacity="0.85" />
      <circle cx="0" cy="-0.5" r="1.3" fill="#7fce8e" opacity="0.95" />
    </g>
  );
}

/**
 * Invernadero por FORMA (#34): 'cuadrado' = nave amplia a dos aguas translúcida
 * con hileras adentro (la de David, grande); 'tunel' = arco/media-luna pequeño
 * (macrotúnel, el de Miguel); 'otro' = nave genérica. Se ubica a la izquierda.
 */
function Invernadero({ forma }) {
  if (forma === 'tunel') {
    // macrotúnel: media-luna translúcida pequeña, con 1-2 nervaduras LIMPIAS.
    return (
      <g className="fv-grow" style={{ animationDelay: '0.05s' }}>
        {/* piso */}
        <rect x="20" y="200" width="118" height="36" rx="4" fill="#8a6a3a" opacity="0.7" />
        {/* cubierta translúcida (media luna) */}
        <path d="M26 202 Q79 150 132 202 Z" fill="#cdeef0" opacity="0.42" stroke="#a8dfe2" strokeWidth="2" />
        {/* contorno superior nítido del arco */}
        <path d="M26 202 Q79 150 132 202" fill="none" stroke="#dff4f5" strokeWidth="2.4" />
        {/* nervaduras (hoops): 2 arcos verticales limpios que cruzan la cubierta,
            paralelos al contorno — estructura del macrotúnel, sin garabato. */}
        <g stroke="#bfe6ea" strokeWidth="1.6" opacity="0.85" fill="none">
          <path d="M60 202 Q60 168 79 158" />
          <path d="M98 202 Q98 168 79 158" />
        </g>
        {/* hileritas de cultivo adentro */}
        <g stroke="#4f9a55" strokeWidth="3" strokeLinecap="round" opacity="0.85">
          <line x1="40" y1="216" x2="118" y2="216" />
          <line x1="36" y1="226" x2="122" y2="226" />
        </g>
        {/* plantitas asomando */}
        <g fill="#6cc07e">
          <circle cx="56" cy="214" r="2.4" /><circle cx="79" cy="214" r="2.4" /><circle cx="102" cy="214" r="2.4" />
        </g>
        <text x="79" y="198" textAnchor="middle" fontSize="7" fill="#7fb8b0" opacity="0.9" fontFamily="system-ui, sans-serif">
          túnel
        </text>
      </g>
    );
  }
  if (forma === 'cuadrado') {
    // nave cuadrada grande a dos aguas (la de David)
    return (
      <g className="fv-grow" style={{ animationDelay: '0.05s' }}>
        {/* piso */}
        <rect x="18" y="200" width="124" height="36" rx="3" fill="#8a6a3a" opacity="0.7" />
        {/* cuerpo translúcido cuadrado */}
        <rect x="22" y="150" width="116" height="52" rx="2" fill="#cdeef0" opacity="0.32" stroke="#a8dfe2" strokeWidth="2" />
        {/* techo a dos aguas */}
        <path d="M18 152 L80 126 L142 152 Z" fill="#dff4f5" opacity="0.5" stroke="#a8dfe2" strokeWidth="2" />
        <path d="M80 126 L80 152" stroke="#bfe6ea" strokeWidth="1.4" opacity="0.7" />
        {/* estructura: columnas y travesaños */}
        <g stroke="#cfd9d2" strokeWidth="2.4" opacity="0.9" fill="none">
          <line x1="22" y1="152" x2="22" y2="202" />
          <line x1="80" y1="152" x2="80" y2="202" />
          <line x1="138" y1="152" x2="138" y2="202" />
          <line x1="22" y1="176" x2="138" y2="176" opacity="0.5" />
        </g>
        {/* hileras de cultivo adentro */}
        <g stroke="#4f9a55" strokeWidth="3.4" strokeLinecap="round" opacity="0.85">
          <line x1="30" y1="210" x2="130" y2="210" />
          <line x1="30" y1="220" x2="130" y2="220" />
          <line x1="30" y1="230" x2="130" y2="230" />
        </g>
        {/* plantitas adentro */}
        <g fill="#6cc07e">
          <circle cx="44" cy="208" r="2.4" /><circle cx="80" cy="208" r="2.4" /><circle cx="116" cy="208" r="2.4" />
          <circle cx="62" cy="218" r="2.4" /><circle cx="98" cy="218" r="2.4" />
        </g>
        <text x="80" y="146" textAnchor="middle" fontSize="7.5" fill="#7fb8b0" opacity="0.9" fontFamily="system-ui, sans-serif">
          invernadero
        </text>
      </g>
    );
  }
  // genérico (declaró invernadero sin forma)
  return (
    <g className="fv-grow" style={{ animationDelay: '0.05s' }}>
      <rect x="20" y="200" width="118" height="36" rx="3" fill="#8a6a3a" opacity="0.7" />
      <rect x="24" y="158" width="110" height="44" rx="3" fill="#cdeef0" opacity="0.3" stroke="#a8dfe2" strokeWidth="2" />
      <path d="M24 158 Q79 138 134 158" fill="#dff4f5" opacity="0.5" stroke="#a8dfe2" strokeWidth="2" />
      <g stroke="#4f9a55" strokeWidth="3.2" strokeLinecap="round" opacity="0.85">
        <line x1="34" y1="214" x2="124" y2="214" />
        <line x1="34" y1="226" x2="124" y2="226" />
      </g>
      <text x="79" y="154" textAnchor="middle" fontSize="7" fill="#7fb8b0" opacity="0.9" fontFamily="system-ui, sans-serif">
        invernadero
      </text>
    </g>
  );
}

/** Corral de animales (esquina inferior derecha) con cerca + gallina/cerdo. */
function Corral({ animales }) {
  const tieneCerdo = animales.some((a) => /cerd|pig|🐷/i.test(`${a.subjectSlug} ${a.emoji} ${a.nombre || ''}`));
  return (
    <g className="fv-grow" style={{ animationDelay: '0.5s' }}>
      {/* cerca del corral */}
      <g stroke="#8a6a3a" strokeWidth="2.6" strokeLinecap="round">
        <line x1="332" y1="232" x2="332" y2="214" />
        <line x1="356" y1="232" x2="356" y2="212" />
        <line x1="380" y1="232" x2="380" y2="214" />
        <line x1="330" y1="218" x2="382" y2="216" />
        <line x1="330" y1="226" x2="382" y2="224" />
      </g>
      {/* gallina */}
      <g transform="translate(342 228)">
        <ellipse cx="0" cy="0" rx="7" ry="5.5" fill="#f4ead0" />
        <g className="fv-peck">
          <circle cx="5" cy="-4" r="3.4" fill="#f4ead0" />
          <path d="M4 -7 q1 -3 2.6 -1.6 q-0.8 1.6 -2.6 1.6" fill="#e0532f" />
          <path d="M8.4 -4 l3.2 0.8 l-3.2 0.8 Z" fill="#ffb74d" />
          <circle cx="6" cy="-5" r="0.8" fill="#3a2024" />
        </g>
        <line x1="-1.6" y1="5" x2="-1.6" y2="8.4" stroke="#c79a4a" strokeWidth="1.2" />
        <line x1="2.4" y1="5" x2="2.4" y2="8.4" stroke="#c79a4a" strokeWidth="1.2" />
      </g>
      {/* cerdo (si hay) */}
      {tieneCerdo && (
        <g transform="translate(368 230)">
          <g className="fv-wiggle">
            <ellipse cx="0" cy="0" rx="12" ry="8" fill="#f1a6b0" />
            <circle cx="10" cy="-1.6" r="5.6" fill="#f1a6b0" />
            <ellipse cx="14.4" cy="-0.8" rx="2.8" ry="2.4" fill="#e88a98" />
            <circle cx="13.6" cy="-1.6" r="0.8" fill="#7a3d48" />
            <circle cx="15.2" cy="-1.6" r="0.8" fill="#7a3d48" />
            <circle cx="8.8" cy="-5.6" r="1" fill="#3a2024" />
            <path d="M6.4 -7.2 l2.4 -4 l1.6 4 Z" fill="#e88a98" />
          </g>
        </g>
      )}
    </g>
  );
}

/**
 * Backdrop FINCA rural (el clásico): colinas de fondo + isla de tierra con
 * surcos. Es el backdrop por defecto (compatibilidad con el comportamiento
 * previo del componente).
 */
function FincaBackdrop({ tierraGrad, tierraB }) {
  return (
    <>
      {/* Colinas de fondo (profundidad) */}
      <path d="M0 180 Q100 140 200 172 T400 168 V240 H0 Z" fill={tierraB} opacity="0.5" />
      {/* Tierra / suelo */}
      <rect x="0" y="186" width="400" height="54" fill={`url(#${tierraGrad})`} />
      <path d="M0 186 Q100 176 200 184 T400 182 V200 H0 Z" fill={tierraB} opacity="0.45" />
      {/* Surcos suaves de los lotes */}
      <g stroke="#5f8a3f" strokeWidth="1.4" opacity="0.4">
        <line x1="60" y1="206" x2="340" y2="206" />
        <line x1="48" y1="220" x2="352" y2="220" />
      </g>
      {/* Sendero al frente (invita a entrar caminando) */}
      <path d="M200 232 L180 240 L220 240 Z" fill="#d8c39a" opacity="0.8" />
    </>
  );
}

/**
 * Backdrop BALCÓN urbano: deck de madera + baranda al frente + siluetas de
 * ciudad de fondo. Sin colinas. Las materas/plantas (matas del stage) se posan
 * sobre el deck (offset aplicado en el render principal).
 */
function BalconBackdrop() {
  return (
    <>
      {/* Ciudad de fondo (siluetas de edificios — profundidad urbana) */}
      <g fill="#aebec6" opacity="0.85">
        <rect x="18" y="96" width="40" height="120" rx="3" />
        <rect x="64" y="74" width="34" height="142" rx="3" />
        <rect x="104" y="108" width="28" height="108" rx="3" />
        <rect x="276" y="86" width="38" height="130" rx="3" />
        <rect x="320" y="112" width="30" height="104" rx="3" />
        <rect x="356" y="92" width="34" height="124" rx="3" />
      </g>
      {/* Ventanitas iluminadas */}
      <g fill="#fff5cf" opacity="0.7">
        <rect x="72" y="86" width="6" height="8" rx="1" />
        <rect x="84" y="86" width="6" height="8" rx="1" />
        <rect x="284" y="100" width="6" height="8" rx="1" />
        <rect x="296" y="100" width="6" height="8" rx="1" />
      </g>
      {/* Deck de madera (plataforma del balcón) */}
      <rect x="0" y="186" width="400" height="54" fill="#a8763e" />
      <rect x="0" y="186" width="400" height="6" fill="#c8a06a" />
      <g stroke="#8a6038" strokeWidth="1.4" opacity="0.55">
        <line x1="0" y1="200" x2="400" y2="200" />
        <line x1="0" y1="214" x2="400" y2="214" />
        <line x1="0" y1="228" x2="400" y2="228" />
      </g>
      {/* Baranda al frente */}
      <g stroke="#62707a" strokeWidth="3.5" strokeLinecap="round">
        <line x1="0" y1="186" x2="400" y2="186" />
        <path d="M40 186 v-22" /><path d="M110 186 v-22" /><path d="M180 186 v-22" />
        <path d="M250 186 v-22" /><path d="M320 186 v-22" /><path d="M388 186 v-22" />
      </g>
      <line x1="0" y1="164" x2="400" y2="164" stroke="#52606a" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

/**
 * Backdrop INVERNADERO (clásico, modo MUNDO): piso + camas/hileras de cultivo +
 * arco de techo translúcido + líneas de riego. Monocultivo ordenado bajo cubierta.
 */
function InvernaderoBackdrop({ tierraGrad }) {
  return (
    <>
      {/* Piso del invernadero */}
      <rect x="0" y="186" width="400" height="54" fill={`url(#${tierraGrad})`} />
      {/* Camas/hileras de cultivo en hilera (densidad de monocultivo) */}
      <g stroke="#3f8f4e" strokeWidth="5" strokeLinecap="round" opacity="0.85">
        <line x1="40" y1="206" x2="360" y2="206" />
        <line x1="32" y1="222" x2="368" y2="222" />
        <line x1="48" y1="236" x2="352" y2="236" />
      </g>
      {/* Líneas de riego (mangueras a lo largo de las camas) */}
      <g stroke="#2b2b2b" strokeWidth="1.6" opacity="0.6">
        <line x1="40" y1="210" x2="360" y2="210" />
        <line x1="32" y1="226" x2="368" y2="226" />
      </g>
      {/* Goteros (puntitos azules) */}
      <g fill="#4f9fc0">
        <circle cx="120" cy="210" r="2" /><circle cx="200" cy="210" r="2" /><circle cx="280" cy="210" r="2" />
        <circle cx="160" cy="226" r="2" /><circle cx="240" cy="226" r="2" />
      </g>
      {/* Columnas del invernadero */}
      <g stroke="#cfd9d2" strokeWidth="4" strokeLinecap="round" opacity="0.95">
        <line x1="36" y1="186" x2="36" y2="120" />
        <line x1="364" y1="186" x2="364" y2="120" />
      </g>
      {/* Arco del techo translúcido */}
      <path
        d="M36 120 Q200 78 364 120 L364 130 Q200 88 36 130 Z"
        fill="#bfe6ea"
        opacity="0.55"
        stroke="#dff4f5"
        strokeWidth="2"
      />
      <path d="M36 120 Q200 78 364 120" fill="none" stroke="#dff4f5" strokeWidth="2" opacity="0.8" />
      {/* Panel lateral translúcido (sensación de cubierta cerrada) */}
      <rect x="0" y="120" width="400" height="66" fill="#cdeef0" opacity="0.16" />
    </>
  );
}

/**
 * Backdrop PÁRAMO: alta montaña con niebla, picos lejanos y frailejones. Sin
 * lotes de cultivo (el páramo no se cultiva — se cuida). Tono frío/brumoso.
 */
function ParamoBackdrop() {
  const frailejones = [40, 110, 175, 250, 320, 372];
  return (
    <>
      {/* Banda de niebla (páramo casi siempre con niebla) */}
      <rect x="0" y="96" width="400" height="40" fill="#e8eef0" opacity="0.5" />
      {/* Picos lejanos de alta montaña */}
      <path d="M0 150 L70 96 L140 150 Z" fill="#8aa0a8" opacity="0.7" />
      <path d="M110 150 L200 84 L290 150 Z" fill="#7a929c" opacity="0.8" />
      <path d="M260 150 L330 102 L400 150 Z" fill="#8aa0a8" opacity="0.7" />
      {/* Suelo de páramo (pajonal apagado, sin surcos de cultivo) */}
      <rect x="0" y="150" width="400" height="90" fill="#7e8f63" />
      <path d="M0 150 Q100 140 200 150 T400 148 V170 H0 Z" fill="#6f8054" opacity="0.6" />
      {/* Frailejones (la planta emblemática del páramo) */}
      {frailejones.map((fx, i) => (
        <g
          key={`frj${fx}`}
          transform={`translate(${fx} ${198 + (i % 2) * 8})`}
          className="fv-grow"
          style={{ animationDelay: `${0.2 + i * 0.07}s` }}
        >
          {/* tronco peludo */}
          <rect x="-4" y="0" width="8" height="22" rx="3" fill="#9a8866" />
          {/* roseta de hojas plateadas */}
          <g className="fv-sway-slow">
            <path d="M0 0 q-12 -6 -16 -18" stroke="#8fa07a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M0 0 q12 -6 16 -18" stroke="#8fa07a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M0 0 q-6 -10 -4 -22" stroke="#a4b48e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M0 0 q6 -10 4 -22" stroke="#a4b48e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M0 0 V-24" stroke="#b6c4a2" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="0" cy="-26" r="3.5" fill="#f2e27a" />
          </g>
        </g>
      ))}
    </>
  );
}

/**
 * Backdrop RESTAURACIÓN: ribera (orilla de quebrada) + parche de bosque nativo
 * recuperándose, con marcas de los HITOS del proceso (establecimiento → cierre).
 * El bosque crece según el `stage`/los hitos reales en el render principal.
 */
function RestauracionBackdrop({ tierraGrad, tierraB }) {
  const nativas = [210, 250, 290, 330, 360];
  return (
    <>
      {/* Ladera de fondo en recuperación */}
      <path d="M0 174 Q100 138 200 166 T400 162 V240 H0 Z" fill={tierraB} opacity="0.55" />
      {/* Suelo */}
      <rect x="0" y="184" width="400" height="56" fill={`url(#${tierraGrad})`} />
      {/* Quebrada / ribera (agua serpenteando — el nacimiento a recuperar) */}
      <path
        d="M40 240 C90 210 60 196 110 182 C150 170 130 156 170 150"
        stroke="#67b6d6"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M40 240 C90 210 60 196 110 182 C150 170 130 156 170 150"
        stroke="#8fcde6"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* Cercado del área en restauración (cierre / aislamiento del ganado) */}
      <g stroke="#8a6a3a" strokeWidth="2.4" strokeLinecap="round" opacity="0.8">
        <line x1="240" y1="190" x2="240" y2="176" />
        <line x1="280" y1="194" x2="280" y2="180" />
        <line x1="320" y1="198" x2="320" y2="184" />
        <line x1="236" y1="184" x2="324" y2="192" />
      </g>
      {/* Plántulas nativas recién establecidas (hito establecimiento) */}
      {nativas.map((sx, i) => (
        <g
          key={`nat${sx}`}
          transform={`translate(${sx} ${200 + (i % 2) * 6})`}
          className="fv-grow"
          style={{ animationDelay: `${0.3 + i * 0.08}s` }}
        >
          <rect x="-1.5" y="-12" width="3" height="12" rx="1.5" fill="#5b8a3c" />
          <path d="M0 -12 q-7 -3 -3 -10" stroke="#5bb06e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M0 -12 q7 -3 3 -10" stroke="#5bb06e" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      ))}
    </>
  );
}
