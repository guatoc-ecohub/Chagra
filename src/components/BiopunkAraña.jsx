import React, { useMemo } from 'react';

/**
 * BiopunkAraña — Visualización micorrizal de las capacidades del agente.
 *
 * Cada función es una rama/hifa del hongo. Las funciones conectadas
 * brillan con neón teal. Las pendientes tienen bioluminiscencia tenue
 * y están etiquetadas como "Próximamente".
 *
 * Diseño campesino-friendly: metáfora del hongo (nutrientes, conexión
 * subterránea, red de vida) con estética bio-punk neón.
 */
export default function BiopunkAraña({ capabilities, activeCapability, onSelect }) {
  const network = useMemo(() => {
    // Layout radial: centro = Chagra, funciones en círculo
    const nodes = capabilities.map((cap, i) => {
      const angle = (Math.PI * 2 / capabilities.length) * i - Math.PI / 2;
      const radius = cap.connected ? 130 : 110;
      return {
        ...cap,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        angle,
        nodeSize: cap.connected ? 24 : 20,
        glowIntensity: cap.connected ? 1 : 0.4,
      };
    });
    return nodes;
  }, [capabilities]);

  return (
    <div className="relative w-full h-80 flex items-center justify-center" aria-label="Red micorrizal de funciones del agente">
      <svg viewBox="-180 -180 360 360" className="w-full h-full overflow-visible">
        {/* Definiciones: gradientes, filtros, patrones */}
        <defs>
          <radialGradient id="myceliumCenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0e2a2e" />
            <stop offset="60%" stopColor="#0b1a20" />
            <stop offset="100%" stopColor="#0a0e14" />
          </radialGradient>
          <radialGradient id="nodeConnected" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#19c79a" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#065f46" />
          </radialGradient>
          <radialGradient id="nodePending" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="50%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </radialGradient>
          <filter id="neonGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feFlood floodColor="#19c79a" floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dimGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Círculo central: cuerpo del hongo / núcleo */}
        <circle cx="0" cy="0" r="45" fill="url(#myceliumCenter)" stroke="#19c79a" strokeWidth="2" opacity="0.8" />
        <circle cx="0" cy="0" r="35" fill="none" stroke="#19c79a" strokeWidth="1" opacity="0.4" strokeDasharray="4 4">
          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="20s" repeatCount="indefinite" />
        </circle>

        {/* Texto central: Chagra */}
        <text x="0" y="-5" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="900" fill="#19c79a" letterSpacing="2">
          CHAGRA
        </text>
        <text x="0" y="12" textAnchor="middle" fontSize="7" fill="#5eead4" opacity="0.8">
          red micorrizal
        </text>

        {/* Hifas (líneas) conectando centro a nodos */}
        {network.map((node) => {
          const isPending = !node.connected;
          return (
            <g key={`hypha-${node.id}`}>
              <path
                d={`M 0 0 Q ${node.x * 0.5} ${node.y * 0.5} ${node.x} ${node.y}`}
                fill="none"
                stroke={isPending ? '#451a03' : '#19c79a'}
                strokeWidth={isPending ? 1.5 : 3}
                opacity={isPending ? 0.4 : 0.7}
                strokeLinecap="round"
                strokeDasharray={isPending ? '6 4' : 'none'}
              />
              {/* Puntos de anastomosis (pulsos) */}
              {!isPending && (
                <circle cx={node.x * 0.5} cy={node.y * 0.5} r="3" fill="#19c79a" opacity="0.6">
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Nodos (cuerpos fructíferos / esporas) */}
        {network.map((node) => {
          const isActive = activeCapability === node.id;
          const isPending = !node.connected;
          const filter = isActive ? 'url(#neonGlow)' : isPending ? 'url(#dimGlow)' : undefined;
          const fill = isPending ? 'url(#nodePending)' : 'url(#nodeConnected)';
          const opacity = isPending ? 0.6 : 1;

          return (
            <g key={`node-${node.id}`} opacity={opacity} filter={filter}>
              {/* Cuerpo fructífero */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.nodeSize}
                fill={fill}
                stroke={isPending ? '#78350f' : '#5eead4'}
                strokeWidth={isActive ? 3 : 1.5}
                className="cursor-pointer transition-all hover:scale-110"
                onClick={() => onSelect?.(node.id)}
              />
              {/* Icono */}
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="14"
                fill={isPending ? '#d97706' : '#a7f3d0'}
                className="cursor-pointer select-none"
                onClick={() => onSelect?.(node.id)}
              >
                {node.icon}
              </text>
              {/* Etiqueta radial */}
              <text
                x={node.x + (Math.cos(node.angle) * (node.nodeSize + 14))}
                y={node.y + (Math.sin(node.angle) * (node.nodeSize + 14))}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={isPending ? '#b45309' : '#5eead4'}
                className="select-none"
              >
                {node.label}
              </text>
              {isPending && (
                <text
                  x={node.x + (Math.cos(node.angle) * (node.nodeSize + 26))}
                  y={node.y + (Math.sin(node.angle) * (node.nodeSize + 26))}
                  textAnchor="middle"
                  fontSize="7"
                  fill="#b45309"
                  opacity="0.7"
                >
                  (Próximamente)
                </text>
              )}
            </g>
          );
        })}

        {/* Sporas flotantes (ambiente) */}
        {[...Array(8)].map((_, i) => (
          <circle key={`spore-${i}`} r="2" fill="#19c79a" opacity="0.3">
            <animateMotion dur={`${8 + i * 3}s`} repeatCount="indefinite" path={`M ${Math.random() * 360 - 180} ${Math.random() * 360 - 180} Q ${Math.random() * 360 - 180} ${Math.random() * 360 - 180} ${Math.random() * 360 - 180} ${Math.random() * 360 - 180}`} />
          </circle>
        ))}
      </svg>
    </div>
  );
}
