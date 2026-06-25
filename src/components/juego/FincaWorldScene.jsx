import { useMemo } from 'react';

/**
 * FincaWorldScene — el MUNDO ilustrado de "Mi Finca Viva" que crece.
 *
 * Dibuja una finca con SVG inline (offline-first, cero imágenes externas) que
 * se transforma visiblemente según el nivel (0-4): más árboles, más color, más
 * vida y las criaturas REALMENTE desbloqueadas volando/correteando. Animaciones
 * suaves vía juego-finca.css (respetan prefers-reduced-motion).
 *
 * NADA acá inventa progreso: recibe el `stage` (mundo del nivel real) y las
 * `criaturas` ya derivadas de datos reales por fincaGameService. Si la finca
 * está vacía, dibuja la tierra esperando + una semillita.
 *
 * VARIANTE POR PERFIL (mockup F2 "Finca Viva Evolutiva"): la prop `variant`
 * (salida de fincaSceneProfileSelector.selectSceneVariant) decide el BACKDROP +
 * layout base — balcón urbano (deck, baranda, ciudad), invernadero (techo
 * translúcido + hileras), finca rural diversa (colinas, lotes, animales),
 * restauración (bosque/ribera) o páramo (frailejones, alta montaña). El
 * crecimiento/vida (árboles, matas, criaturas, estado vacío) sigue derivándose
 * del `stage`/`criaturas` reales DENTRO de la variante. Si no se pasa `variant`,
 * cae al backdrop rural clásico (compatibilidad: comportamiento previo intacto).
 *
 * Todo el SVG es rsvg-safe (sin foreignObject) y las animaciones respetan
 * prefers-reduced-motion (juego-finca.css). Español de Colombia (tú/usted).
 *
 * @param {Object} props
 * @param {Object} props.stage       WORLD_STAGES[nivel] (cielo, tierra, arboles, vida)
 * @param {Array}  props.criaturas   criaturas con {emoji, desbloqueada}
 * @param {boolean} [props.vacia]    finca sin datos → mundo "esperando"
 * @param {Object} [props.variant]   { kind, escala, animales, cerdos, tinte } del selector
 */
export default function FincaWorldScene({ stage, criaturas = [], vacia = false, variant = null }) {
  const kind = variant?.kind || 'finca';
  const animalesEnEscena = variant ? variant.animales !== false : true;
  const cerdosEnEscena = variant ? variant.cerdos === true : false;

  // Posiciones DETERMINISTAS (no aleatorias entre renders): así el mundo es
  // estable y reconocible para la niña, no parpadea de forma distinta cada vez.
  const arboles = useMemo(() => {
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
  }, [stage, vacia]);

  // Plantitas/arbustos pequeños = "vida" del suelo.
  const matas = useMemo(() => {
    const n = vacia ? 0 : Math.min(stage?.vida || 0, 8);
    const slots = [];
    for (let i = 0; i < n; i += 1) {
      const x = 50 + (i * 41) % 320;
      const y = 192 + ((i * 9) % 16);
      slots.push({ x, y, key: `m${i}` });
    }
    return slots;
  }, [stage, vacia]);

  // Criaturas vivas (desbloqueadas) sobrevolando el mundo. Máximo unas pocas
  // para no saturar — la colección completa se ve en la galería.
  const criaturasVivas = useMemo(
    () => criaturas.filter((c) => c.desbloqueada).slice(0, 6),
    [criaturas],
  );

  const [cieloA, cieloB] = stage?.cielo || ['#bcd9e8', '#e8f3ee'];
  const [tierraA, tierraB] = stage?.tierra || ['#c9a878', '#a98a5e'];
  const sceneKey = `${kind}-${stage?.level ?? 0}`;
  const gradId = `fv-sky-${sceneKey}`;
  const gradTierra = `fv-soil-${sceneKey}`;
  const level = stage?.level ?? 0;

  // Etiqueta accesible por variante (el contexto del lugar real del usuario).
  const variantLabel = VARIANT_ARIA[kind] || VARIANT_ARIA.finca;
  const ariaLabel = vacia
    ? `${variantLabel} Está esperando que siembres tu primera planta.`
    : `${variantLabel} ${stage?.nombreNino ? `Etapa ${stage.nombreNino}: ${stage.mensaje}` : ''}`.trim();

  return (
    <div
      className="fv-scene"
      data-testid="finca-world-scene"
      data-level={level}
      data-variant={kind}
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

        {/* Sol — más cálido a mayor nivel */}
        <g className="fv-sun">
          <circle cx="330" cy="48" r="26" fill="#ffe08a" opacity="0.95" />
          <circle cx="330" cy="48" r="18" fill="#ffd24d" />
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
        {kind === 'invernadero' && <InvernaderoBackdrop tierraGrad={gradTierra} />}
        {kind === 'paramo' && <ParamoBackdrop />}
        {kind === 'restauracion' && (
          <RestauracionBackdrop tierraGrad={gradTierra} tierraB={tierraB} />
        )}
        {kind === 'finca' && <FincaBackdrop tierraGrad={gradTierra} tierraB={tierraB} />}

        {/* ── VIDA (árboles/matas/semilla) — DENTRO de la variante ────────── */}
        {/* En balcón/invernadero la vida vive en materas/camas (no en colinas):
            no se dibujan árboles de finca; las matas representan las materas. En
            páramo no hay árboles de finca (frailejones ya en el backdrop). */}
        {kind !== 'balcon' && kind !== 'invernadero' && kind !== 'paramo' && arboles.map((t, i) => (
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

        {/* Matas / plantitas del suelo vivo. En balcón/invernadero se posan
            sobre las materas/camas (offset hacia el frente del deck/hilera). */}
        {kind !== 'paramo' && matas.map((m, i) => {
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

        {/* Animales de finca (cerdo/gallina) — SOLO en la finca rural y si la
            variante los habilita (perfil con animales). En balcón/invernadero/
            páramo no hay corral. El cerdo solo si el perfil declara cerdos. */}
        {!vacia && kind === 'finca' && animalesEnEscena && (
          <g className="fv-grow" transform="translate(300 200)" style={{ animationDelay: '0.5s' }}>
            {/* gallina (cabeza que picotea) */}
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
            {/* cerdo (cuerpo que se menea) — solo si el perfil declara cerdos */}
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
            variantes con suelo (no en balcón/invernadero, que ya muestran
            materas/camas vacías en su backdrop). */}
        {vacia && kind !== 'balcon' && kind !== 'invernadero' && (
          <g transform="translate(200 196)" className="fv-grow">
            <ellipse cx="0" cy="4" rx="9" ry="6" fill="#8a6a3a" />
            <path d="M0 -2 Q-4 -10 0 -16 Q4 -10 0 -2" fill="#5bb06e" />
          </g>
        )}
      </svg>

      {/* Criaturas vivas — emojis flotando sobre el mundo (animadas, accesibles) */}
      {!vacia && criaturasVivas.length > 0 && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {criaturasVivas.map((c, i) => {
            const left = 12 + ((i * 31) % 70);
            const top = 12 + ((i * 19) % 42);
            return (
              <span
                key={c.id}
                className="fv-float absolute select-none"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  fontSize: '1.7rem',
                  animationDelay: `${i * 0.5}s`,
                }}
              >
                {c.emoji}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Texto accesible base por variante (se concatena con el estado del stage). */
const VARIANT_ARIA = Object.freeze({
  balcon: 'Tu balcón urbano: materas con plantas, baranda y la ciudad de fondo.',
  invernadero: 'Tu invernadero: techo translúcido y camas de cultivo en hilera con riego.',
  finca: 'Tu finca rural: colinas, lotes de cultivo, árboles y animales.',
  restauracion: 'Tu área en restauración: bosque y orilla de quebrada recuperándose con nativas.',
  paramo: 'Tu páramo de alta montaña: frailejones y niebla, sin lotes de cultivo.',
});

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
 * Backdrop INVERNADERO: piso + camas/hileras de cultivo en hilera + arco de
 * techo translúcido + líneas de riego. Monocultivo ordenado bajo cubierta.
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
