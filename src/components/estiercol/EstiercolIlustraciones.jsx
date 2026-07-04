import React from 'react';

/**
 * Ilustraciones propias del módulo "Del corral al abono".
 * SVG a mano (tipo cuaderno de campo): trazo redondo, tierra colorada, gas
 * ámbar, biol/planta verde. Colores fijos de ILUSTRACIÓN (no de tema) porque
 * viven dentro de cards que ya ponen su propio fondo; se eligieron con contraste
 * alto para leerse al sol en los 4 temas.
 */

/* Paleta de la ilustración (tierra / gas / agua / planta). */
const C = {
  tierra: '#7c4a24',
  tierraOsc: '#5a3418',
  gas: '#f5b53d',
  gasClaro: '#ffd982',
  biol: '#4a9b6e',
  biolClaro: '#7fd0a3',
  agua: '#3f9fd4',
  trazo: '#2c1c0f',
  cielo: '#cfe8d6',
};

/**
 * Biodigestor tubular en corte. `llenado` (0..1) infla la cúpula de gas y activa
 * las burbujas + la llama del fogón. `animated` controla las micro-animaciones.
 *
 * @param {{ llenado?: number, animated?: boolean, className?: string }} props
 */
export function BiodigestorIlustracion({ llenado = 0.6, animated = true, className = '' }) {
  const f = Math.max(0, Math.min(1, llenado));
  // La cúpula crece de una tira fina (vacío) a una campana gruesa (lleno).
  const domoAltura = 10 + f * 40; // px
  const domoTop = 96 - domoAltura;
  const hayGas = f > 0.02;

  return (
    <svg
      viewBox="0 0 320 200"
      className={className}
      role="img"
      aria-label="Corte de un biodigestor tubular: entra la mezcla de estiércol y agua, se llena de biogás en la parte de arriba y sale el biol líquido por el otro lado."
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {/* Cielo/aire */}
      <rect x="0" y="0" width="320" height="118" fill={C.cielo} opacity="0.35" />
      {/* Suelo */}
      <path d="M0 118 H320 V200 H0 Z" fill={C.tierra} opacity="0.9" />
      <path d="M0 118 H320" stroke={C.tierraOsc} strokeWidth="3" strokeLinecap="round" />
      {/* Textura de tierra (puntitos) */}
      {[[28, 150], [70, 176], [150, 188], [212, 158], [268, 182], [300, 150]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.4" fill={C.tierraOsc} opacity="0.5" />
      ))}

      {/* Zanja + bolsa tubular (cuerpo del digestor), medio enterrada */}
      <g>
        {/* Cámara líquida (la mezcla en digestión) */}
        <path
          d="M60 96 Q60 132 96 132 H224 Q260 132 260 96 Z"
          fill={C.tierraOsc}
          opacity="0.55"
        />
        <path
          d="M64 98 Q66 126 98 126 H222 Q254 126 256 98 Z"
          fill={C.agua}
          opacity="0.45"
        />

        {/* Cúpula de gas (se infla con `llenado`) */}
        <g className={animated && hayGas ? 'estiercol-cupula' : undefined}>
          <path
            d={`M60 96 Q60 ${domoTop} 160 ${domoTop} Q260 ${domoTop} 260 96 Z`}
            fill={hayGas ? C.gas : '#e7e2d8'}
            opacity={hayGas ? 0.85 : 0.4}
          />
          <path
            d={`M60 96 Q60 ${domoTop} 160 ${domoTop} Q260 ${domoTop} 260 96`}
            fill="none"
            stroke={C.trazo}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {hayGas && (
            <text x="160" y={domoTop + domoAltura / 2 + 4} textAnchor="middle"
              fontSize="11" fontWeight="700" fill={C.trazo} opacity="0.8">
              biogás
            </text>
          )}
        </g>

        {/* Contorno del cuerpo */}
        <path
          d="M60 96 Q60 132 96 132 H224 Q260 132 260 96"
          fill="none"
          stroke={C.trazo}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Burbujas subiendo */}
        {animated && hayGas && (
          <g fill={C.gasClaro} stroke={C.gas} strokeWidth="1">
            <circle className="estiercol-burbuja" cx="120" cy="120" r="3" />
            <circle className="estiercol-burbuja estiercol-burbuja--b" cx="160" cy="122" r="2.4" />
            <circle className="estiercol-burbuja estiercol-burbuja--c" cx="196" cy="120" r="3.4" />
            <circle className="estiercol-burbuja estiercol-burbuja--d" cx="142" cy="122" r="2" />
          </g>
        )}
      </g>

      {/* Entrada: tubo de carga (mezcla estiércol + agua) */}
      <g>
        <path d="M22 74 L58 100" stroke={C.trazo} strokeWidth="9" strokeLinecap="round" />
        <path d="M22 74 L58 100" stroke={C.tierra} strokeWidth="5" strokeLinecap="round" />
        <circle cx="20" cy="72" r="12" fill={C.tierraOsc} stroke={C.trazo} strokeWidth="2" />
        <text x="20" y="52" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.trazo}>entra</text>
        <text x="20" y="42" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.trazo}>mezcla</text>
      </g>

      {/* Salida: biol (efluente fertilizante) a un tanque */}
      <g>
        <path d="M260 100 L296 104" stroke={C.trazo} strokeWidth="9" strokeLinecap="round" />
        <path d="M260 100 L296 104" stroke={C.biol} strokeWidth="5" strokeLinecap="round" />
        <path d="M286 104 h26 v34 a4 4 0 0 1 -4 4 h-18 a4 4 0 0 1 -4 -4 Z"
          fill={C.biol} opacity="0.35" stroke={C.trazo} strokeWidth="2" />
        <text x="299" y="60" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.trazo}>biol</text>
        <path d="M299 66 V96" stroke={C.biol} strokeWidth="2" strokeLinecap="round"
          className={animated ? 'estiercol-flujo' : undefined} />
      </g>

      {/* Línea de gas + fogón */}
      <g>
        <path d="M160 34 V52" stroke={C.trazo} strokeWidth="3" strokeLinecap="round" />
        <path
          d="M160 34 Q160 12 196 12 H236"
          fill="none"
          stroke={C.trazo}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={hayGas ? undefined : '4 5'}
        />
        {/* Fogón */}
        <rect x="232" y="12" width="30" height="8" rx="3" fill={C.tierraOsc} stroke={C.trazo} strokeWidth="1.6" />
        {hayGas && (
          <path
            className={animated ? 'estiercol-llama' : undefined}
            d="M247 12 q-6 -8 0 -14 q6 6 0 14 Z"
            fill={C.gas}
            stroke={C.gasClaro}
            strokeWidth="1"
          />
        )}
      </g>
    </svg>
  );
}

/**
 * El ciclo cerrado en una sola imagen: CORRAL → PILA/DIGESTOR → BIOL+BIOGÁS →
 * SUELO/PLANTA, con flechas que fluyen. Es el emblema del módulo.
 *
 * @param {{ animated?: boolean, className?: string }} props
 */
export function CicloCorralAbono({ animated = true, className = '' }) {
  const nodo = (x, y, fill) => (
    <circle cx={x} cy={y} r="30" fill={fill} opacity="0.16" stroke={fill} strokeWidth="2" />
  );
  const flecha = (d) => (
    <path d={d} fill="none" stroke={C.trazo} strokeWidth="2.4" strokeLinecap="round"
      opacity="0.75" className={animated ? 'estiercol-flujo' : undefined} />
  );
  return (
    <svg
      viewBox="0 0 300 300"
      className={className}
      role="img"
      aria-label="El ciclo: del corral sale el estiércol, se procesa en pila o biodigestor, produce biol y biogás, y el abono vuelve al suelo y la planta."
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {/* Nodos */}
      {nodo(150, 52, C.tierra)}
      <text x="150" y="49" textAnchor="middle" fontSize="26">🐖</text>
      <text x="150" y="92" textAnchor="middle" fontSize="12" fontWeight="800" fill={C.trazo}>Corral</text>

      {nodo(248, 150, C.gas)}
      <text x="248" y="147" textAnchor="middle" fontSize="24">🛢️</text>
      <text x="248" y="190" textAnchor="middle" fontSize="12" fontWeight="800" fill={C.trazo}>Procesa</text>

      {nodo(150, 248, C.biol)}
      <text x="150" y="245" textAnchor="middle" fontSize="24">💧</text>
      <text x="150" y="220" textAnchor="middle" fontSize="12" fontWeight="800" fill={C.trazo}>Biol y biogás</text>

      {nodo(52, 150, C.biolClaro)}
      <text x="52" y="147" textAnchor="middle" fontSize="24">🌱</text>
      <text x="52" y="190" textAnchor="middle" fontSize="12" fontWeight="800" fill={C.trazo}>Suelo</text>

      {/* Flechas del ciclo (sentido horario) */}
      {flecha('M182 66 Q222 84 236 122')}
      {flecha('M236 178 Q222 216 182 234')}
      {flecha('M118 234 Q78 216 64 178')}
      {flecha('M64 122 Q78 84 118 66')}
    </svg>
  );
}

/**
 * Glifo pequeño y propio para cada abono (tarjetas de "Abonos de estiércol").
 * `tipo`: gallinaza | porquinaza | bovinaza | biol | biosol | compost |
 * lombricompost. Devuelve un SVG compacto de 44×44.
 *
 * @param {{ tipo: string, size?: number, className?: string }} props
 */
export function AbonoGlifo({ tipo, size = 44, className = '' }) {
  const base = (children) => (
    <svg viewBox="0 0 44 44" width={size} height={size} className={className}
      role="img" aria-hidden="true" style={{ display: 'block' }}>
      {children}
    </svg>
  );
  const sacoTierra = (fill, stroke) => (
    <>
      <path d="M12 16 q10 -8 20 0 l3 22 a3 3 0 0 1 -3 3 H12 a3 3 0 0 1 -3 -3 Z"
        fill={fill} opacity="0.85" stroke={stroke} strokeWidth="1.6" />
      <path d="M13 16 q9 -6 18 0" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    </>
  );
  const gota = (fill, stroke) => (
    <path d="M22 8 C30 20 32 26 32 30 a10 10 0 0 1 -20 0 c0 -4 2 -10 10 -22 Z"
      fill={fill} opacity="0.85" stroke={stroke} strokeWidth="1.6" />
  );
  switch (tipo) {
    case 'gallinaza':
      return base(<>
        {sacoTierra('#e8b84b', C.trazo)}
        <circle cx="18" cy="27" r="1.8" fill={C.trazo} />
        <circle cx="26" cy="30" r="1.8" fill={C.trazo} />
        <circle cx="22" cy="34" r="1.8" fill={C.trazo} />
      </>);
    case 'porquinaza':
      return base(<>
        {sacoTierra('#e59aa6', C.trazo)}
        <circle cx="18" cy="28" r="1.8" fill={C.trazo} />
        <circle cx="26" cy="28" r="1.8" fill={C.trazo} />
      </>);
    case 'bovinaza':
      return base(<>
        {sacoTierra('#c88a52', C.trazo)}
        <path d="M15 30 h14 M17 34 h10" stroke={C.trazo} strokeWidth="1.6" strokeLinecap="round" />
      </>);
    case 'biol':
      return base(<>
        {gota(C.biol, C.trazo)}
        <path d="M17 27 h10 M18 31 h8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      </>);
    case 'biosol':
      return base(<>
        <rect x="11" y="18" width="22" height="20" rx="3" fill="#b98a4e" opacity="0.85" stroke={C.trazo} strokeWidth="1.6" />
        <path d="M22 8 v8 M14 12 l4 4 M30 12 l-4 4" stroke={C.gas} strokeWidth="2" strokeLinecap="round" />
      </>);
    case 'compost':
      return base(<>
        <path d="M8 34 q14 -12 28 0 Z" fill="#7c5a34" opacity="0.85" stroke={C.trazo} strokeWidth="1.6" />
        <path d="M16 30 q2 -6 6 -6 M24 32 q2 -5 5 -5" stroke={C.biol} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </>);
    case 'lombricompost':
      return base(<>
        <path d="M8 34 q14 -12 28 0 Z" fill="#4a3218" opacity="0.9" stroke={C.trazo} strokeWidth="1.6" />
        <path d="M14 30 q3 -3 6 0 q3 3 6 0" fill="none" stroke="#e59aa6" strokeWidth="2.4" strokeLinecap="round" />
      </>);
    default:
      return base(<circle cx="22" cy="22" r="12" fill={C.tierra} opacity="0.6" />);
  }
}

export default BiodigestorIlustracion;
