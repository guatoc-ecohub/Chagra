/**
 * Ambient module augmentation para propiedades CSS custom (`--foo`) en
 * estilos inline de React (queue tsc-gate cleanup).
 *
 * `csstype` (la librería de la que `React.CSSProperties` reexporta su tipo
 * base) NO declara un índice para custom properties (`--algo`) por defecto,
 * así que cualquier `style={{ '--mi-var': valor }}` dispara TS2353 ("Object
 * literal may only specify known properties"). El patrón usado en varios
 * componentes (ChagraGrowLoader, AgentHero, themeIcon, Confetti, etc.) para
 * animar/tema vía CSS variables inyectadas desde JS choca con esto en
 * cascada (~37 errores en 6 archivos).
 *
 * Este augmentation es el fix oficial documentado por csstype para este
 * caso (https://github.com/frenic/csstype#what-should-i-do-when-i-get-type-errors)
 * — zero impacto en runtime, solo amplía el tipo que ve el checker.
 */
declare module 'csstype' {
  interface Properties {
    [index: `--${string}`]: string | number | undefined;
  }
}
