import React, { useMemo } from 'react';

/**
 * NatureAraña — Visualización en árbol de las capacidades del agente.
 *
 * Cada función es una rama o hoja del árbol. Las funciones activas/
 * conectadas se muestran con hojas verdes vibrantes. Las pendientes
 * se muestran con hojas otoñales/opacas. La raíz es "Chagra".
 *
 * Diseño campesino-friendly: colores tierra, formas orgánicas, etiquetas
 * en español colombiano claro.
 */
export default function NatureAraña({ capabilities, activeCapability, onSelect }) {
  const tree = useMemo(() => {
    // Layout del árbol: raíz abajo, ramas arriba en semicírculo
    const nodes = capabilities.map((cap, i) => {
      const angle = (Math.PI / (capabilities.length + 1)) * (i + 1);
      const distance = cap.connected ? 140 : 120;
      return {
        ...cap,
        x: Math.cos(angle) * distance,
        y: -Math.sin(angle) * distance,
        angle,
        leafSize: cap.connected ? 28 : 22,
      };
    });
    return nodes;
  }, [capabilities]);

  return (
    <div className="relative w-full h-80 flex items-end justify-center" aria-label="Árbol de funciones del agente">
      <svg viewBox="-180 -180 360 200" className="w-full h-full overflow-visible">
        {/* Definiciones: gradientes y filtros */}
        <defs>
          <linearGradient id="trunkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a3e2b" />
            <stop offset="100%" stopColor="#8b5a3c" />
          </linearGradient>
          <radialGradient id="leafConnected" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#84cc16" />
            <stop offset="70%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#166534" />
          </radialGradient>
          <radialGradient id="leafPending" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="70%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Tronco central */}
        <path
          d="M 0 20 Q -8 -40 -15 -80 Q -5 -100 0 -120"
          fill="none"
          stroke="url(#trunkGrad)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 0 20 Q 8 -40 15 -80 Q 5 -100 0 -120"
          fill="none"
          stroke="url(#trunkGrad)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Ramas y hojas */}
        {tree.map((node, i) => {
          const isActive = activeCapability === node.id;
          const isPending = !node.connected;
          const leafFill = isPending ? 'url(#leafPending)' : 'url(#leafConnected)';
          const opacity = isPending ? 0.6 : 1;
          const filter = isActive ? 'url(#glow)' : undefined;

          return (
            <g key={node.id} opacity={opacity} filter={filter}>
              {/* Rama curva */}
              <path
                d={`M 0 -120 Q ${node.x * 0.3} -140 ${node.x} ${node.y}`}
                fill="none"
                stroke={isPending ? '#a07654' : '#5a8c3a'}
                strokeWidth={isPending ? 3 : 5}
                strokeLinecap="round"
              />
              {/* Hoja */}
              <ellipse
                cx={node.x}
                cy={node.y}
                rx={node.leafSize}
                ry={node.leafSize * 0.6}
                fill={leafFill}
                transform={`rotate(${(node.angle * 180) / Math.PI - 90} ${node.x} ${node.y})`}
                className="cursor-pointer transition-all hover:scale-110"
                onClick={() => onSelect?.(node.id)}
              />
              {/* Icono de la función */}
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="16"
                className="cursor-pointer select-none"
                onClick={() => onSelect?.(node.id)}
              >
                {node.icon}
              </text>
              {/* Etiqueta */}
              <text
                x={node.x}
                y={node.y + node.leafSize + 12}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill={isPending ? '#92400e' : '#14532d'}
                className="select-none"
              >
                {node.label}
              </text>
              {isPending && (
                <text
                  x={node.x}
                  y={node.y + node.leafSize + 24}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#92400e"
                  opacity="0.8"
                >
                  (Próximamente)
                </text>
              )}
            </g>
          );
        })}

        {/* Raíz: Chagra */}
        <text
          x="0"
          y="38"
          textAnchor="middle"
          fontSize="14"
          fontWeight="900"
          fill="#3f2c1d"
        >
          Chagra
        </text>
      </svg>
    </div>
  );
}
