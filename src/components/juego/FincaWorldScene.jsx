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
 * @param {Object} props
 * @param {Object} props.stage       WORLD_STAGES[nivel] (cielo, tierra, arboles, vida)
 * @param {Array}  props.criaturas   criaturas con {emoji, desbloqueada}
 * @param {boolean} [props.vacia]    finca sin datos → mundo "esperando"
 */
export default function FincaWorldScene({ stage, criaturas = [], vacia = false }) {
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
  const gradId = `fv-sky-${stage?.level ?? 0}`;
  const gradTierra = `fv-soil-${stage?.level ?? 0}`;

  return (
    <div
      className="fv-scene"
      data-testid="finca-world-scene"
      data-level={stage?.level ?? 0}
      role="img"
      aria-label={
        vacia
          ? 'Tu finca está esperando que siembres tu primera planta.'
          : `Tu finca en la etapa ${stage?.nombreNino}: ${stage?.mensaje}`
      }
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

        {/* Cielo */}
        <rect x="0" y="0" width="400" height="240" fill={`url(#${gradId})`} />

        {/* Sol — más cálido a mayor nivel */}
        <g className="fv-sun">
          <circle cx="330" cy="48" r="26" fill="#ffe08a" opacity="0.95" />
          <circle cx="330" cy="48" r="18" fill="#ffd24d" />
        </g>

        {/* Nubes */}
        <g className="fv-cloud" fill="#ffffff" opacity="0.85">
          <ellipse cx="80" cy="44" rx="26" ry="13" />
          <ellipse cx="100" cy="40" rx="20" ry="14" />
          <ellipse cx="62" cy="40" rx="16" ry="11" />
        </g>
        <g className="fv-cloud-2" fill="#ffffff" opacity="0.7">
          <ellipse cx="210" cy="64" rx="22" ry="11" />
          <ellipse cx="228" cy="60" rx="16" ry="11" />
        </g>

        {/* Colinas de fondo (más verdes a mayor nivel) */}
        <path
          d="M0 180 Q100 140 200 172 T400 168 V240 H0 Z"
          fill={tierraB}
          opacity="0.5"
        />

        {/* Tierra / suelo */}
        <rect x="0" y="186" width="400" height="54" fill={`url(#${gradTierra})`} />
        <path
          d="M0 186 Q100 176 200 184 T400 182 V200 H0 Z"
          fill={tierraB}
          opacity="0.45"
        />

        {/* Árboles que crecen con el nivel */}
        {arboles.map((t, i) => (
          <g
            key={t.key}
            className={`fv-grow ${i % 2 === 0 ? 'fv-sway' : 'fv-sway-slow'}`}
            transform={`translate(${t.x} ${t.baseY}) scale(${t.scale})`}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            {/* tronco */}
            <rect x="-4" y="0" width="8" height="26" rx="3" fill="#7a5230" />
            {/* copa según tipo */}
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
                {/* frutos cuando ya hay bosque (niveles altos) */}
                {(stage?.level ?? 0) >= 3 && (
                  <>
                    <circle cx="-6" cy="-10" r="3" fill="#ff7a59" />
                    <circle cx="7" cy="-2" r="3" fill="#ffb74d" />
                  </>
                )}
              </>
            )}
          </g>
        ))}

        {/* Matas / plantitas del suelo vivo */}
        {matas.map((m, i) => (
          <g
            key={m.key}
            className="fv-grow"
            transform={`translate(${m.x} ${m.y})`}
            style={{ animationDelay: `${0.3 + i * 0.06}s` }}
          >
            <path d="M0 12 Q-6 0 -2 -6" stroke="#4ca35c" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M0 12 Q6 0 2 -6" stroke="#4ca35c" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M0 12 V-2" stroke="#46985a" strokeWidth="3" fill="none" strokeLinecap="round" />
            {(stage?.level ?? 0) >= 2 && <circle cx="0" cy="-7" r="3" fill="#ff9ec4" />}
          </g>
        ))}

        {/* Semillita cuando la finca está esperando (vacía) */}
        {vacia && (
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
