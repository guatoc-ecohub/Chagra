/*
 * ArtesaniaAndinaTelarDemo — vitrina pública (#/mockups/artesania-andina-telar)
 * de la CAPA 2D (SVG, three-free) del lenguaje de forma "artesanía andina":
 * paleta de tintes, trazo que respira, patrones de telar (rombo/zigzag/
 * escalonado), banda chumbe, greca escalonada, marco de tarjeta y las
 * siluetas de cerámica low-poly — todo dibujado por las primitivas de
 * `ArtesaniaAndina.jsx` (nada reinventado aquí, cero CSS/props nuevos sobre
 * las piezas).
 *
 * CABLEO (rescate de huérfano, ver ops/TRIAJE-HUERFANOS-3D-2026-07-21.md #4
 * en Chagra-strategy): la propia cabecera de `ArtesaniaAndina.jsx` trae la
 * instrucción "standalone (storybook / pantalla de estilo): montar
 * <ShowcaseArtesania> directo". Este mockup hace exactamente eso — es la
 * integración de riesgo cero de esa cabecera; adoptar `<MarcoTelar>` /
 * `<BandaChumbe>` / `<GrecaEscalonada>` como tratamiento de las tarjetas 2D
 * (`laminas2d/LaminaCultivo.jsx`, `Ficha.jsx`, `Infografia.jsx`) queda
 * pendiente de dirección de arte, como marca el propio triaje.
 *
 * Es la CAPA 2D del kit, hermana de `ArtesaniaAndinaDemo.jsx` (la vitrina 3D
 * de siluetas revolucionadas — hoy solo en `dev`, pendiente de promoción a
 * `main`, por eso no está cableada aquí junto a ella). Ambas consumen el
 * MISMO módulo de datos (`artesaniaAndina.js`) pero dibujan capas distintas
 * (SVG plano vs. lathe 3D): no hay duplicación real entre ellas.
 *
 * Autocontenida: cero CDN/imágenes externas, sin auth, sin datos de finca.
 * Español de Colombia, en "usted".
 */
import ShowcaseArtesania from '../visual/mundo3d/ArtesaniaAndina.jsx';
import './ArtesaniaAndinaTelarDemo.css';

export default function ArtesaniaAndinaTelarDemo() {
  return (
    <main className="artei">
      <header className="artei__head">
        <p className="artei__kicker">Lenguaje de forma · vitrina</p>
        <h1>Artesanía andina: el telar como vocabulario</h1>
        <p className="artei__lema">
          Paleta de tintes naturales, trazo que respira y patrones de telar
          (rombo, zigzag, escalonado) — el mismo lenguaje de forma listo para
          vestir tarjetas, marcos y siluetas de cerámica de toda la finca.
        </p>
      </header>
      <div className="artei__lienzo">
        <ShowcaseArtesania />
      </div>
    </main>
  );
}
