/*
 * RestauracionTiempo3D — vitrina pública (#/mockups/restauracion-tiempo-3d) del
 * mundo "el potrero volviéndose monte, a través del tiempo".
 *
 * CABLEO (rescate de huérfano, patrón feedback_construido_pero_no_cableado):
 * `RestauracionEnElTiempo.jsx` (src/visual/mundo3d/restauracion/) es LA PIEZA
 * COMPLETA — su propia cabecera dice "demo aislada: se monta sola, sin rutas
 * ni datos de finca. Es un cuadro, no una pantalla del app". Nada la montaba:
 * ni App.jsx (el shell clásico que sirve 3d.guatoc.co/app) ni ningún otro
 * mockup. Este wrapper hace exactamente lo que pide su cabecera — montarla
 * directo — con el encabezado didáctico que usan las vitrinas hermanas
 * (Mundo3DAgua, Mundo3DSuelo).
 *
 * NO reimplementa nada: `RestauracionEnElTiempo` ya trae su propio
 * device-tiering (decidirTier/permite3D → 3D en equipo que da, corte SVG
 * LaderaEnFranjas en gama baja) y su línea de tiempo (LineaTiempo, riel no
 * lineal + reduced-motion). Este mockup solo agrega el marco de vitrina.
 *
 * Autocontenida: cero CDN/imágenes externas. Móvil-first (320px). Copy en
 * español de Colombia, en "usted".
 */
import RestauracionEnElTiempo from '../visual/mundo3d/restauracion/RestauracionEnElTiempo.jsx';
import './RestauracionTiempo3D.css';

export default function RestauracionTiempo3D() {
  return (
    <main className="rt3d">
      <header className="rt3d__head">
        <p className="rt3d__kicker">Los mundos de su finca · vitrina</p>
        <h1>El monte que vuelve</h1>
        <p className="rt3d__lema">
          Camine los años de un potrero que se hace monte otra vez: qué llega
          primero, qué llega después y por qué. Restaurar es lento — cada año
          de estos es un año de verdad.
        </p>
      </header>

      <section className="rt3d__escena" aria-label="La ladera a través del tiempo">
        <RestauracionEnElTiempo />
      </section>
    </main>
  );
}
