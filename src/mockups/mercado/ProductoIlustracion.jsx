/*
 * ProductoIlustracion — dibujos SVG propios de cada producto del mercado. Planos
 * y cálidos, sobre fondo transparente (el color de la banda lo pone la tarjeta).
 * Sin imágenes externas: todo trazo propio. Cada dibujo cabe en un viewBox
 * 0 0 120 120 y se centra solo.
 *
 * Props:
 *   tipo   'tomate' | 'mora' | 'papa' | 'cafe' | 'miel' | 'aguacate' |
 *          'cilantro' | 'haba' | 'kale' | 'esparrago' | 'acelga' |
 *          'aromatica' | 'apio' | 'brocoli' | 'calabaza' | 'cebolla' |
 *          'cebolla_roja' | 'cebolla_verde' | 'coliflor' | 'espinaca' |
 *          'hinojo' | 'lechuga' | 'lechuga_roja' | 'perejil' | 'remolacha' |
 *          'repollo' | 'rucula' | 'trebol'
 *   size   número (px). Defecto 120.
 *   className, title.
 */
export function ProductoIlustracion({ tipo, size = 120, className = '', title = '' }) {
  const dibujo = DIBUJOS[tipo] || DIBUJOS.tomate;
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className || undefined}
      role="img"
      aria-label={title || tipo}
    >
      <title>{title || tipo}</title>
      {dibujo}
    </svg>
  );
}

const DIBUJOS = {
  tomate: (
    <g>
      <ellipse cx="60" cy="92" rx="34" ry="6" fill="#2c2418" opacity="0.12" />
      <path d="M60,32 C86,32 96,54 96,72 C96,92 80,104 60,104 C40,104 24,92 24,72 C24,54 34,32 60,32 Z" fill="#d23f28" />
      <path d="M46,44 C36,50 32,62 33,74 C34,82 39,90 47,95 C34,92 26,80 27,66 C28,54 36,46 46,44 Z" fill="#ff6a4d" opacity="0.7" />
      <ellipse cx="72" cy="58" rx="9" ry="13" fill="#ff8f6a" opacity="0.5" />
      <path d="M60,36 l-9,-8 M60,36 l9,-8 M60,36 l0,-11 M60,36 l-12,-2 M60,36 l12,-2" stroke="#3f7f3a" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="34" r="4" fill="#4a8f3a" />
    </g>
  ),
  mora: (
    /* Mora de Castilla = zarzamora (Rubus glaucus): UNA fruta compuesta de
       muchas drupas chiquitas apretadas en forma cónica-ovalada, NO un
       racimo de esferas grandes colgando de un tallo (eso es uva). Silueta
       cónica única + textura de drupas + cáliz verde arriba (rasgo real de
       la mora, se le queda pegado el cáliz al cosecharla). Dos moras más
       chicas al lado sugieren "puñado", sin volver a armar un racimo. */
    <g>
      <ellipse cx="60" cy="104" rx="28" ry="5" fill="#2c2418" opacity="0.12" />

      {/* mora chica, izquierda, detrás */}
      <path d="M32,70 C40,68 46,76 45,86 C44,94 38,98 32,96 C26,94 23,86 25,78 C26,74 28,71 32,70 Z" fill="#2a1030" />
      <g fill="#54234f" opacity="0.9">
        <circle cx="31" cy="76" r="3" /><circle cx="38" cy="78" r="3" /><circle cx="28" cy="83" r="3" />
        <circle cx="36" cy="86" r="3" /><circle cx="30" cy="91" r="2.6" />
      </g>

      {/* mora chica, derecha, detrás */}
      <path d="M88,72 C96,72 100,82 96,90 C93,97 85,98 80,93 C76,89 77,80 82,75 C84,73 86,72 88,72 Z" fill="#2a1030" />
      <g fill="#54234f" opacity="0.9">
        <circle cx="88" cy="79" r="3" /><circle cx="94" cy="83" r="2.8" /><circle cx="84" cy="87" r="3" />
        <circle cx="90" cy="90" r="2.6" />
      </g>

      {/* cáliz verde: sépalos que quedan pegados al pedúnculo */}
      <path d="M60,30 l-7,-7 M60,30 l7,-7 M60,30 l0,-10 M60,30 l-10,-1 M60,30 l10,-1" stroke="#4a8f3a" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M60,30 C58,34 56,37 53,40" stroke="#3f7f3a" strokeWidth="3.6" strokeLinecap="round" fill="none" />

      {/* mora PRINCIPAL: silueta cónica única, no esferas colgando */}
      <path d="M60,36 C76,38 86,52 84,68 C82,86 72,102 60,104 C48,102 38,86 36,68 C34,52 44,38 60,36 Z" fill="#2a1030" />

      {/* textura de drupas: filas apretadas siguiendo el cono, se achican hacia abajo */}
      <g fill="#54234f">
        <circle cx="52" cy="48" r="4.4" /><circle cx="60" cy="45" r="4.6" /><circle cx="68" cy="48" r="4.4" />
        <circle cx="45" cy="56" r="4.6" /><circle cx="54" cy="55" r="4.4" /><circle cx="66" cy="55" r="4.4" /><circle cx="75" cy="56" r="4.6" />
        <circle cx="42" cy="66" r="4.6" /><circle cx="51" cy="66" r="4.6" /><circle cx="60" cy="65" r="4.8" /><circle cx="69" cy="66" r="4.6" /><circle cx="78" cy="66" r="4.6" />
        <circle cx="44" cy="76" r="4.4" /><circle cx="53" cy="77" r="4.6" /><circle cx="67" cy="77" r="4.6" /><circle cx="76" cy="76" r="4.4" />
        <circle cx="48" cy="86" r="4" /><circle cx="58" cy="88" r="4.2" /><circle cx="68" cy="86" r="4" />
        <circle cx="54" cy="95" r="3.4" /><circle cx="62" cy="96" r="3.4" />
      </g>
      {/* brillo: un puntito claro en cada drupa, arriba-izquierda — es lo que
          da el efecto "bumpy" característico de la mora, no de la uva */}
      <g fill="#9a6aa8" opacity="0.8">
        <circle cx="50" cy="46" r="1.3" /><circle cx="58" cy="43" r="1.3" /><circle cx="66" cy="46" r="1.3" />
        <circle cx="43" cy="54" r="1.3" /><circle cx="52" cy="53" r="1.3" /><circle cx="64" cy="53" r="1.3" /><circle cx="73" cy="54" r="1.3" />
        <circle cx="40" cy="64" r="1.3" /><circle cx="49" cy="64" r="1.3" /><circle cx="58" cy="63" r="1.4" /><circle cx="67" cy="64" r="1.3" /><circle cx="76" cy="64" r="1.3" />
        <circle cx="42" cy="74" r="1.2" /><circle cx="51" cy="75" r="1.3" /><circle cx="65" cy="75" r="1.3" /><circle cx="74" cy="74" r="1.2" />
        <circle cx="46" cy="84" r="1.1" /><circle cx="56" cy="86" r="1.2" /><circle cx="66" cy="84" r="1.1" />
      </g>
    </g>
  ),
  papa: (
    <g>
      <ellipse cx="60" cy="96" rx="36" ry="7" fill="#2c2418" opacity="0.12" />
      <ellipse cx="46" cy="62" rx="22" ry="18" fill="#e0a53a" transform="rotate(-12 46 62)" />
      <ellipse cx="74" cy="72" rx="20" ry="16" fill="#d99a2e" transform="rotate(10 74 72)" />
      <ellipse cx="60" cy="52" rx="18" ry="15" fill="#eab24a" transform="rotate(6 60 52)" />
      <g fill="#a8781f" opacity="0.7">
        <circle cx="40" cy="60" r="2.2" />
        <circle cx="52" cy="66" r="2.2" />
        <circle cx="66" cy="50" r="2.2" />
        <circle cx="78" cy="70" r="2.2" />
        <circle cx="70" cy="78" r="2.2" />
        <circle cx="56" cy="54" r="2" />
      </g>
      <ellipse cx="54" cy="48" rx="6" ry="4" fill="#f6cf7a" opacity="0.6" />
    </g>
  ),
  cafe: (
    <g>
      <ellipse cx="60" cy="100" rx="30" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M60,24 C56,32 50,36 44,38" stroke="#3f7f3a" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M40,40 C30,42 26,52 34,56 C42,60 52,52 50,42 Z" fill="#4a8f3a" />
      <g>
        <circle cx="50" cy="60" r="14" fill="#c62f22" />
        <circle cx="70" cy="52" r="14" fill="#d23f28" />
        <circle cx="64" cy="76" r="14" fill="#b62a1e" />
        <circle cx="46" cy="60" r="4" fill="#8a1f16" />
        <circle cx="66" cy="52" r="4" fill="#8a1f16" />
        <circle cx="60" cy="76" r="4" fill="#8a1f16" />
      </g>
      <ellipse cx="46" cy="54" rx="4" ry="6" fill="#ff7a5a" opacity="0.5" />
      <ellipse cx="66" cy="46" rx="4" ry="6" fill="#ff7a5a" opacity="0.5" />
    </g>
  ),
  miel: (
    <g>
      <ellipse cx="60" cy="104" rx="28" ry="5" fill="#2c2418" opacity="0.12" />
      <rect x="46" y="20" width="28" height="10" rx="3" fill="#6f5a3c" />
      <path d="M42,34 C42,32 44,30 46,30 L74,30 C76,30 78,32 78,34 L80,58 C82,64 82,70 80,78 L80,96 C80,100 76,102 72,102 L48,102 C44,102 40,100 40,96 L40,78 C38,70 38,64 40,58 Z" fill="#e8a72e" />
      <path d="M45,64 C45,60 48,58 52,58 L68,58 C72,58 75,60 75,64 L75,92 C75,96 72,97 68,97 L52,97 C48,97 45,96 45,92 Z" fill="#f6cf7a" opacity="0.55" />
      <rect x="44" y="44" width="32" height="14" rx="2" fill="#efe7d6" />
      <path d="M52,51 l4,0 l2,-3 l2,6 l2,-3 l4,0" stroke="#c1902f" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="50" cy="74" rx="4" ry="10" fill="#ffe6a0" opacity="0.7" />
    </g>
  ),
  aguacate: (
    <g>
      <ellipse cx="60" cy="102" rx="30" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M60,22 C58,28 58,32 60,36" stroke="#6f5a3c" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M60,34 C78,34 88,54 88,72 C88,92 76,104 60,104 C44,104 32,92 32,72 C32,54 42,34 60,34 Z" fill="#3f5a1f" />
      <path d="M60,44 C72,44 80,58 80,74 C80,90 71,98 60,98 C49,98 40,90 40,74 C40,58 48,44 60,44 Z" fill="#c8d24a" />
      <ellipse cx="60" cy="78" rx="13" ry="15" fill="#8a5a2c" />
      <ellipse cx="56" cy="74" rx="5" ry="6" fill="#a5723a" opacity="0.7" />
      <path d="M46,58 C50,54 54,52 58,52" stroke="#e6ee9a" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
    </g>
  ),
  cilantro: (
    <g>
      <ellipse cx="60" cy="102" rx="26" ry="5" fill="#2c2418" opacity="0.12" />
      {/* amarre del atado */}
      <path d="M48,84 q12,6 24,0 l-2,8 q-10,5 -20,0 Z" fill="#c9a26a" />
      <path d="M50,88 q10,5 20,0" stroke="#a8781f" strokeWidth="1.6" fill="none" opacity="0.7" />
      {/* tallos */}
      <g stroke="#4a8f3a" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M56,86 C54,70 50,56 42,44" />
        <path d="M60,86 C60,68 60,52 60,38" />
        <path d="M64,86 C66,70 70,56 78,44" />
        <path d="M58,86 C55,72 50,62 46,56" opacity="0.7" />
        <path d="M62,86 C65,72 70,62 74,56" opacity="0.7" />
      </g>
      {/* hojas: matas redondeadas de cilantro */}
      <g fill="#3f7f3a">
        <circle cx="40" cy="40" r="9" />
        <circle cx="31" cy="46" r="7" />
        <circle cx="48" cy="34" r="8" />
        <circle cx="60" cy="30" r="9" />
        <circle cx="52" cy="24" r="7" />
        <circle cx="68" cy="24" r="7" />
        <circle cx="72" cy="36" r="8" />
        <circle cx="80" cy="40" r="9" />
        <circle cx="88" cy="47" r="7" />
        <circle cx="45" cy="52" r="7" />
        <circle cx="75" cy="52" r="7" />
      </g>
      <g fill="#6fae4a" opacity="0.85">
        <circle cx="44" cy="37" r="4" />
        <circle cx="58" cy="27" r="4" />
        <circle cx="70" cy="30" r="3.6" />
        <circle cx="78" cy="43" r="4" />
        <circle cx="36" cy="45" r="3.4" />
      </g>
      {/* raíces: cortado con raíz para que dure */}
      <g stroke="#c9a26a" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M57,94 q-3,5 -6,7" />
        <path d="M60,95 q0,5 1,8" />
        <path d="M63,94 q3,5 6,6" />
      </g>
    </g>
  ),
  haba: (
    <g>
      <ellipse cx="60" cy="100" rx="32" ry="5" fill="#2c2418" opacity="0.12" />
      {/* vaina de atrás */}
      <path d="M30,42 C46,36 74,44 86,62 C90,68 88,74 82,74 C62,74 40,64 30,50 C27,46 27,43 30,42 Z" fill="#5a9a44" transform="rotate(9 58 58)" opacity="0.85" />
      {/* vaina principal, gorda y en curva */}
      <path d="M26,58 C42,50 74,56 88,76 C93,83 90,90 83,89 C60,88 38,80 27,66 C23,61 23,59 26,58 Z" fill="#6fae4a" />
      {/* grano insinuado dentro de la vaina */}
      <g fill="#8ec464" opacity="0.9">
        <ellipse cx="43" cy="66" rx="8" ry="7" />
        <ellipse cx="60" cy="71" rx="9" ry="7.5" />
        <ellipse cx="77" cy="78" rx="8" ry="7" />
      </g>
      <path d="M28,60 C44,54 72,60 85,77" stroke="#4a8f3a" strokeWidth="2" fill="none" opacity="0.6" />
      {/* pedúnculo */}
      <path d="M26,58 C22,52 20,46 22,40" stroke="#3f7f3a" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      {/* dos granos sueltos, desgranados */}
      <ellipse cx="88" cy="46" rx="10" ry="8" fill="#b9d47e" transform="rotate(-14 88 46)" />
      <path d="M80,44 q3,-3 7,-3" stroke="#8aa653" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="74" cy="32" rx="9" ry="7" fill="#c8dd90" transform="rotate(10 74 32)" />
      <path d="M67,31 q3,-3 6,-3" stroke="#9ab264" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  ),

  /* ── hortalizas de hoja: manojo de tallos + hojas, mismo esqueleto del
     cilantro, silueta/color propios por cultivo ── */
  espinaca: (
    <g>
      <ellipse cx="60" cy="100" rx="28" ry="5" fill="#2c2418" opacity="0.12" />
      <g stroke="#2f6b3a" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M50,92 C46,76 40,60 30,46" />
        <path d="M60,92 C60,74 58,56 54,40" />
        <path d="M70,92 C74,76 80,60 90,46" />
      </g>
      <g fill="#2f6b3a">
        <ellipse cx="28" cy="42" rx="13" ry="9" transform="rotate(-18 28 42)" />
        <ellipse cx="52" cy="34" rx="12" ry="9" transform="rotate(-4 52 34)" />
        <ellipse cx="70" cy="30" rx="12" ry="9" transform="rotate(8 70 30)" />
        <ellipse cx="90" cy="42" rx="13" ry="9" transform="rotate(20 90 42)" />
        <ellipse cx="40" cy="58" rx="12" ry="8" transform="rotate(-10 40 58)" />
        <ellipse cx="80" cy="58" rx="12" ry="8" transform="rotate(10 80 58)" />
      </g>
      <g fill="#4a8f52" opacity="0.55">
        <ellipse cx="52" cy="34" rx="4" ry="3" />
        <ellipse cx="70" cy="30" rx="4" ry="3" />
      </g>
    </g>
  ),
  rucula: (
    <g>
      <ellipse cx="60" cy="100" rx="26" ry="5" fill="#2c2418" opacity="0.12" />
      <g stroke="#3f6b2f" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M52,90 C48,74 42,58 34,44" />
        <path d="M60,90 C60,72 60,54 60,36" />
        <path d="M68,90 C72,74 78,58 86,44" />
      </g>
      {/* hojas jaspeadas/dentadas, silueta angular distinta a espinaca */}
      <g fill="#4c7a35">
        <path d="M34,44 l-10,-6 3,8 -9,-1 8,7 -10,3 10,4 -6,8 10,-2 -1,10 7,-7 5,9 4,-9 6,7 0,-10 8,4 -4,-9 9,2 -7,-7 9,-4 -9,-2 6,-8 -9,1 3,-9 Z" transform="translate(-28 -8) scale(0.62)" opacity="0" />
      </g>
      <g fill="#4c7a35">
        <path d="M34,44 C24,40 20,32 24,24 C32,28 38,36 34,44 Z" />
        <path d="M60,36 C52,30 50,20 56,12 C64,18 66,28 60,36 Z" />
        <path d="M86,44 C96,40 100,32 96,24 C88,28 82,36 86,44 Z" />
        <path d="M60,60 C50,56 44,48 48,40 C58,44 64,52 60,60 Z" />
        <path d="M60,60 C70,56 76,48 72,40 C62,44 56,52 60,60 Z" />
      </g>
    </g>
  ),
  perejil: (
    <g>
      <ellipse cx="60" cy="100" rx="27" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M46,84 q14,6 28,0 l-2,8 q-12,5 -24,0 Z" fill="#c9a26a" />
      <g stroke="#2e6b3a" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M52,86 C50,68 44,52 34,38" />
        <path d="M60,86 C60,66 60,48 60,32" />
        <path d="M68,86 C70,68 76,52 86,38" />
      </g>
      {/* hojas rizadas: cúmulos densos de pequeños círculos, más apretado que cilantro */}
      <g fill="#2e6b3a">
        <circle cx="34" cy="36" r="7" /><circle cx="27" cy="42" r="5.5" /><circle cx="40" cy="30" r="6" />
        <circle cx="60" cy="30" r="7" /><circle cx="52" cy="24" r="5.5" /><circle cx="68" cy="24" r="5.5" />
        <circle cx="86" cy="36" r="7" /><circle cx="93" cy="42" r="5.5" /><circle cx="80" cy="30" r="6" />
        <circle cx="46" cy="50" r="5.5" /><circle cx="74" cy="50" r="5.5" />
      </g>
      <g fill="#57a35f" opacity="0.7">
        <circle cx="36" cy="34" r="2.6" /><circle cx="60" cy="28" r="2.6" /><circle cx="84" cy="34" r="2.6" />
      </g>
    </g>
  ),
  apio: (
    <g>
      <ellipse cx="60" cy="102" rx="28" ry="5" fill="#2c2418" opacity="0.12" />
      {/* pencas anchas y planas, no tallos finos */}
      <path d="M46,92 C42,72 40,50 42,28 C46,26 50,26 52,30 C50,52 50,74 52,92 Z" fill="#a8c96a" />
      <path d="M60,92 C58,70 58,48 60,24 C64,22 68,22 70,26 C68,50 68,72 68,92 Z" fill="#b6d478" />
      <path d="M74,92 C72,72 72,50 74,30 C78,28 82,28 82,32 C80,52 80,74 78,92 Z" fill="#a0c25f" />
      <path d="M50,30 C46,24 42,18 40,12 C48,14 54,20 56,28 Z" fill="#7fae4a" />
      <path d="M64,26 C62,18 62,12 64,6 C70,10 72,18 70,26 Z" fill="#8ec153" />
      <path d="M78,32 C80,24 84,18 90,14 C90,22 86,28 80,34 Z" fill="#7fae4a" />
      <path d="M46,92 q14,6 28,0" stroke="#7fae4a" strokeWidth="1.6" fill="none" opacity="0.6" />
    </g>
  ),
  hinojo: (
    <g>
      <ellipse cx="60" cy="102" rx="26" ry="5" fill="#2c2418" opacity="0.12" />
      {/* bulbo blanco-verde abajo */}
      <path d="M60,92 C42,92 34,80 36,66 C38,54 48,48 60,48 C72,48 82,54 84,66 C86,80 78,92 60,92 Z" fill="#e8f0d8" />
      <path d="M42,66 C46,58 52,54 60,54 C68,54 74,58 78,66" stroke="#c8d8a8" strokeWidth="1.6" fill="none" opacity="0.7" />
      {/* frondas plumosas arriba, muy distintas a cualquier otra hoja */}
      <g stroke="#4a8f52" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M60,48 C58,36 54,26 46,16" />
        <path d="M46,16 q-6,2 -10,-2 M46,16 q-2,-6 2,-10 M46,16 q6,0 8,6" />
        <path d="M60,48 C60,34 60,22 60,10" />
        <path d="M60,10 q-6,0 -8,-6 M60,10 q6,0 8,-6 M60,10 q0,-6 4,-8" />
        <path d="M60,48 C62,36 66,26 74,16" />
        <path d="M74,16 q6,2 10,-2 M74,16 q2,-6 -2,-10 M74,16 q-6,0 -8,6" />
      </g>
    </g>
  ),
  aromatica: (
    <g>
      <ellipse cx="60" cy="100" rx="26" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M46,84 q14,6 28,0 l-2,8 q-12,5 -24,0 Z" fill="#c9a26a" />
      {/* ramillete MIXTO a propósito (el producto es "aromáticas frescas"
          surtidas): tres tonos de verde distintos, no un solo cultivo */}
      <g stroke="#3f7f3a" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M50,86 C46,68 40,50 30,36" />
        <path d="M60,86 C60,66 60,46 60,28" />
        <path d="M70,86 C74,68 80,50 90,36" />
      </g>
      <g fill="#4a8f3a"><circle cx="30" cy="34" r="7" /><circle cx="22" cy="40" r="5.5" /><circle cx="38" cy="28" r="6" /></g>
      <path d="M52,26 C48,20 48,14 52,8 C58,12 60,20 56,28 Z" fill="#6fae4a" />
      <path d="M64,26 C68,20 68,14 64,8 C58,12 56,20 60,28 Z" fill="#8ec464" />
      <g fill="#3f7f5a"><circle cx="90" cy="34" r="7" /><circle cx="97" cy="40" r="5.5" /><circle cx="82" cy="28" r="6" /></g>
    </g>
  ),
  acelga: (
    <g>
      <ellipse cx="60" cy="100" rx="30" ry="5" fill="#2c2418" opacity="0.12" />
      {/* pencas de color (rasgo distintivo real de la acelga de colores) */}
      <path d="M44,92 C40,72 38,50 42,30 C46,28 50,28 51,32 C48,52 48,74 50,92 Z" fill="#d94a6a" />
      <path d="M60,92 C58,70 58,48 60,24 C64,22 68,22 69,26 C66,48 66,72 68,92 Z" fill="#e0a53a" />
      <path d="M76,92 C74,72 74,50 78,30 C82,28 86,28 87,32 C82,52 80,74 78,92 Z" fill="#c94aa0" />
      {/* hojas onduladas verdes encima de cada penca */}
      <path d="M46,32 C34,28 26,18 28,8 C40,10 50,20 51,32 Z" fill="#3f7f3a" />
      <path d="M64,26 C56,20 52,10 56,2 C66,6 70,16 65,26 Z" fill="#4a8f44" />
      <path d="M82,32 C92,26 98,16 94,6 C84,10 78,20 78,32 Z" fill="#3f7f3a" />
    </g>
  ),
  kale: (
    <g>
      <ellipse cx="60" cy="100" rx="30" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M60,92 C58,76 56,60 54,44" stroke="#2c5a38" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* hojas RIZADAS grandes: borde festoneado, verde azulado oscuro */}
      <path d="M54,60 C34,56 20,42 24,24 C40,28 52,42 56,62 Z" fill="#2f5e42" />
      <path d="M54,60 q-16,-2 -24,-14 q6,0 10,4 q-2,-6 2,-10 q4,4 4,10 q4,-4 8,-2 Z" fill="#3a6e4d" opacity="0.6" />
      <path d="M64,60 C84,56 98,42 94,24 C78,28 66,42 62,62 Z" fill="#3f6b47" />
      <path d="M64,60 q16,-2 24,-14 q-6,0 -10,4 q2,-6 -2,-10 q-4,4 -4,10 q-4,-4 -8,-2 Z" fill="#4c7d54" opacity="0.6" />
      <path d="M58,90 C42,88 28,76 30,60 C44,64 54,74 58,90 Z" fill="#2f5e42" />
      <path d="M62,90 C78,88 92,76 90,60 C76,64 66,74 62,90 Z" fill="#3f6b47" />
      <path d="M60,44 L60,92" stroke="#c8dba0" strokeWidth="1.4" opacity="0.4" />
    </g>
  ),
  lechuga: (
    <g>
      <ellipse cx="60" cy="98" rx="34" ry="6" fill="#2c2418" opacity="0.12" />
      {/* cabeza redonda de hojas superpuestas, más "bola" que manojo */}
      <path d="M60,32 C86,32 98,54 96,72 C94,90 78,98 60,98 C42,98 26,90 24,72 C22,54 34,32 60,32 Z" fill="#8ec153" />
      <path d="M60,40 C80,40 90,56 88,70 C86,84 74,90 60,90 C46,90 34,84 32,70 C30,56 40,40 60,40 Z" fill="#a5d06a" />
      <path d="M60,46 C74,46 82,58 80,68 C78,80 70,84 60,84 C50,84 42,80 40,68 C38,58 46,46 60,46 Z" fill="#bfe085" opacity="0.85" />
      <path d="M60,32 C60,50 60,66 60,84" stroke="#7fae4a" strokeWidth="1.2" opacity="0.4" fill="none" />
    </g>
  ),
  lechuga_roja: (
    <g>
      <ellipse cx="60" cy="98" rx="34" ry="6" fill="#2c2418" opacity="0.12" />
      <path d="M60,32 C86,32 98,54 96,72 C94,90 78,98 60,98 C42,98 26,90 24,72 C22,54 34,32 60,32 Z" fill="#8a3f4a" />
      <path d="M60,40 C80,40 90,56 88,70 C86,84 74,90 60,90 C46,90 34,84 32,70 C30,56 40,40 60,40 Z" fill="#b25a5f" />
      <path d="M60,46 C74,46 82,58 80,68 C78,80 70,84 60,84 C50,84 42,80 40,68 C38,58 46,46 60,46 Z" fill="#c9807a" opacity="0.85" />
      <path d="M56,48 C60,58 60,72 56,82" stroke="#7fae4a" strokeWidth="2" opacity="0.35" fill="none" strokeLinecap="round" />
    </g>
  ),

  /* ── bulbos: allium (cebollas) ── */
  cebolla: (
    <g>
      <ellipse cx="60" cy="100" rx="26" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M60,96 C42,96 32,84 32,68 C32,50 44,36 60,36 C76,36 88,50 88,68 C88,84 78,96 60,96 Z" fill="#e8dfc4" />
      <path d="M42,68 C42,54 50,42 60,40 C58,52 56,68 58,88" stroke="#c9bd94" strokeWidth="1.6" fill="none" opacity="0.7" />
      <path d="M70,42 C76,50 80,58 78,68 C76,78 70,88 62,92" stroke="#c9bd94" strokeWidth="1.6" fill="none" opacity="0.7" />
      <path d="M60,36 C58,26 58,16 60,8" stroke="#8ec153" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M60,36 C64,28 68,20 68,10" stroke="#7fae4a" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />
      <path d="M46,50 C48,60 48,72 46,86" stroke="#d8cca8" strokeWidth="1.2" fill="none" opacity="0.5" />
    </g>
  ),
  cebolla_roja: (
    <g>
      <ellipse cx="60" cy="100" rx="26" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M60,96 C42,96 32,84 32,68 C32,50 44,36 60,36 C76,36 88,50 88,68 C88,84 78,96 60,96 Z" fill="#7a3f5e" />
      <path d="M42,68 C42,54 50,42 60,40 C58,52 56,68 58,88" stroke="#9a5a7c" strokeWidth="1.6" fill="none" opacity="0.7" />
      <path d="M70,42 C76,50 80,58 78,68 C76,78 70,88 62,92" stroke="#9a5a7c" strokeWidth="1.6" fill="none" opacity="0.7" />
      <path d="M60,36 C58,26 58,16 60,8" stroke="#8ec153" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M60,36 C64,28 68,20 68,10" stroke="#7fae4a" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />
      <ellipse cx="60" cy="66" rx="26" ry="20" fill="#9a5a7c" opacity="0.3" />
    </g>
  ),
  cebolla_verde: (
    <g>
      <ellipse cx="60" cy="102" rx="24" ry="5" fill="#2c2418" opacity="0.12" />
      {/* atado de tallos largos verde-blanco, no bulbo — es "cebolla larga" */}
      <path d="M48,96 C46,84 44,70 46,54 C48,50 52,50 52,54 C50,70 51,84 54,96 Z" fill="#e8f0d8" />
      <path d="M58,96 C57,82 56,64 58,46 C60,42 64,42 64,46 C62,64 62,82 63,96 Z" fill="#dcecc4" />
      <path d="M68,96 C67,84 68,70 70,54 C72,50 76,50 75,54 C72,70 71,84 73,96 Z" fill="#e8f0d8" />
      <path d="M46,54 C44,42 42,30 44,16" stroke="#8ec153" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path d="M58,46 C58,32 58,20 60,8" stroke="#6fae4a" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path d="M70,54 C72,42 74,30 74,16" stroke="#8ec153" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path d="M46,86 q14,6 28,0" stroke="#c9a26a" strokeWidth="2" fill="none" opacity="0.6" />
    </g>
  ),

  /* ── cabezas redondas: brócoli / coliflor / repollo / calabaza / remolacha ── */
  brocoli: (
    <g>
      <ellipse cx="60" cy="100" rx="28" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M56,60 C56,74 56,86 54,96" stroke="#c9c096" strokeWidth="8" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="46" r="30" fill="#3f7f3a" />
      <g fill="#4f8f44">
        <circle cx="44" cy="36" r="10" /><circle cx="60" cy="28" r="11" /><circle cx="78" cy="36" r="10" />
        <circle cx="36" cy="52" r="9" /><circle cx="84" cy="52" r="9" /><circle cx="60" cy="58" r="10" />
      </g>
      <g fill="#6fae4a" opacity="0.6">
        <circle cx="48" cy="34" r="3" /><circle cx="66" cy="26" r="3" /><circle cx="78" cy="40" r="3" /><circle cx="60" cy="54" r="3" />
      </g>
    </g>
  ),
  coliflor: (
    <g>
      <ellipse cx="60" cy="100" rx="30" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M30,50 C26,40 30,30 40,28 C36,36 40,44 46,46 Z" fill="#4a8f3a" />
      <path d="M90,50 C94,40 90,30 80,28 C84,36 80,44 74,46 Z" fill="#4a8f3a" />
      <path d="M60,32 C56,28 56,22 60,18 C64,22 64,28 60,32 Z" fill="#5f9f4a" />
      <circle cx="60" cy="62" r="34" fill="#f2ead8" />
      <g fill="#e6dcc0">
        <circle cx="44" cy="50" r="9" /><circle cx="60" cy="42" r="10" /><circle cx="78" cy="50" r="9" />
        <circle cx="36" cy="66" r="8" /><circle cx="84" cy="66" r="8" /><circle cx="52" cy="76" r="9" /><circle cx="70" cy="76" r="9" />
      </g>
    </g>
  ),
  repollo: (
    <g>
      <ellipse cx="60" cy="100" rx="32" ry="6" fill="#2c2418" opacity="0.12" />
      <circle cx="60" cy="62" r="36" fill="#5f9f4a" />
      <path d="M60,26 C78,26 92,42 92,62 C92,82 78,98 60,98" stroke="#4a8f3a" strokeWidth="1.4" fill="none" opacity="0.5" />
      <path d="M60,26 C42,26 28,42 28,62 C28,82 42,98 60,98" stroke="#7fbf5a" strokeWidth="1.4" fill="none" opacity="0.5" />
      <circle cx="60" cy="62" r="24" fill="#6fae4a" opacity="0.7" />
      <circle cx="60" cy="62" r="13" fill="#8ec153" opacity="0.8" />
    </g>
  ),
  calabaza: (
    <g>
      <ellipse cx="60" cy="102" rx="32" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M60,30 C58,24 58,18 62,14" stroke="#4a8f3a" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M62,18 q8,-2 10,4 q-6,4 -12,0 Z" fill="#4a8f3a" />
      <path d="M60,34 C86,34 96,54 96,68 C96,90 80,100 60,100 C40,100 24,90 24,68 C24,54 34,34 60,34 Z" fill="#e0a53a" />
      <path d="M60,34 C60,56 60,78 60,100 M42,38 C46,58 46,78 44,98 M78,38 C74,58 74,78 76,98" stroke="#c98a2e" strokeWidth="2.4" fill="none" opacity="0.55" />
    </g>
  ),
  remolacha: (
    <g>
      <ellipse cx="60" cy="104" rx="26" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M46,42 C40,30 38,18 42,6 C48,14 52,26 52,40 Z" fill="#7a2f4a" />
      <path d="M60,40 C58,26 58,14 60,2 C64,12 66,26 64,40 Z" fill="#8a3f5a" />
      <path d="M74,42 C80,30 82,18 78,6 C72,14 68,26 68,40 Z" fill="#7a2f4a" />
      <path d="M60,96 C42,96 32,84 34,68 C36,52 46,40 60,40 C74,40 84,52 86,68 C88,84 78,96 60,96 Z" fill="#8a1f3a" />
      <path d="M60,44 C70,44 78,54 80,66 C60,68 60,54 60,44 Z" fill="#a03a54" opacity="0.6" />
      <path d="M46,88 q14,6 28,0" stroke="#c98a5e" strokeWidth="1.6" fill="none" opacity="0.5" />
    </g>
  ),

  /* ── trébol: hoja de tres, cobertura de suelo (no se vende en bulto grande) ── */
  trebol: (
    <g>
      <ellipse cx="60" cy="102" rx="24" ry="5" fill="#2c2418" opacity="0.12" />
      <path d="M60,90 C60,74 60,58 60,44" stroke="#3f7f3a" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M60,50 C60,36 50,26 38,26 C38,40 48,50 60,50 Z" fill="#4a8f44" />
      <path d="M60,50 C60,36 70,26 82,26 C82,40 72,50 60,50 Z" fill="#5f9f4a" />
      <path d="M60,50 C48,50 40,42 40,30 C52,30 60,38 60,50 Z" fill="#3f7f3a" opacity="0.85" />
      <circle cx="46" cy="34" r="8" fill="#3f7f3a" />
      <circle cx="74" cy="34" r="8" fill="#4a8f44" />
      <circle cx="60" cy="24" r="8" fill="#5f9f4a" />
      <path d="M46,34 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0" fill="#2c5a2a" opacity="0.4" />
    </g>
  ),
};

export default ProductoIlustracion;
