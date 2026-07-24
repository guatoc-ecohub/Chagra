/**
 * Ambient module shims para assets estáticos (queue/069.6).
 *
 * Vite resuelve `import './x.css'` / imports de imágenes en build; `checkJs`
 * solo necesita saber que el specifier existe (no tipa el contenido). Sin
 * esto, cada import reporta TS2882/TS2307 (módulo sin declaración de tipos).
 *
 * Vive en su propio archivo porque TS no reconoce `declare module` de
 * wildcard si convive en el mismo `.d.ts` que un bloque `declare global`
 * (verificado empíricamente — mezclarlos con `index.d.ts` no funciona).
 */
declare module '*.css';
declare module '*.png';
// Vite `?raw` suffix (import de un archivo como string crudo, p.ej. para leer
// App.jsx como texto y verificar contratos de rutas por regex sin montar el
// módulo — ver src/__tests__/App.mockup-routes-contract.test.js).
declare module '*?raw' {
  const contenido: string;
  export default contenido;
}
