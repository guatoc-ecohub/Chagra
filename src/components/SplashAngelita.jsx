/**
 * SplashAngelita.jsx — Splash screen animada con la abeja Angelita.
 *
 * Reemplaza el ChagraGrowLoader genérico con una animación SVG de la abeja
 * Angelita (ya existe en AbejaAngelita.jsx) volando mientras carga.
 * Sin Three.js — es SVG puro, carga instantánea.
 */
export default function SplashAngelita() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020617]">
      <div className="animate-bounce" aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          {/* Cuerpo de abeja simplificado */}
          <ellipse cx="32" cy="30" rx="14" ry="10" fill="#fbbf24" />
          {/* Rayas */}
          <rect x="24" y="24" width="16" height="3" rx="1" fill="#1a0a00" />
          <rect x="26" y="30" width="14" height="3" rx="1" fill="#1a0a00" />
          <rect x="24" y="36" width="16" height="2" rx="1" fill="#1a0a00" />
          {/* Alas */}
          <ellipse cx="22" cy="18" rx="8" ry="10" fill="#c7d2fe" opacity="0.7" />
          <ellipse cx="42" cy="18" rx="8" ry="10" fill="#c7d2fe" opacity="0.7" />
          {/* Ojitos */}
          <circle cx="28" cy="26" r="3" fill="white" />
          <circle cx="36" cy="26" r="3" fill="white" />
          <circle cx="28" cy="26" r="1.5" fill="#1a0a00" />
          <circle cx="36" cy="26" r="1.5" fill="#1a0a00" />
          {/* Sonrisa */}
          <path d="M28 34 Q32 38 36 34" stroke="#1a0a00" strokeWidth="1" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      <div className="mt-4 text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase">Chagra</div>
    </div>
  );
}
