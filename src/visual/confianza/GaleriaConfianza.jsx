import React from 'react';
import './confianza.css';
import TrazoConfianza from './TrazoConfianza.jsx';
import MarcaOrigen from './MarcaOrigen.jsx';
import FichaFuente from './FichaFuente.jsx';
import NoSeHonesto from './NoSeHonesto.jsx';
import AdvertenciaPeso from './AdvertenciaPeso.jsx';
import SaberTradicion from './SaberTradicion.jsx';
import { ORDEN_NIVELES, NIVELES_CONFIANZA } from './confianzaTokens.js';

/*
 * GaleriaConfianza — la vitrina viva del lenguaje de la confianza.
 *
 * Muestra el vocabulario completo con textos REALES del carácter de Chagra
 * (el tono `chosen` del corpus anti-alucinación): los cuatro hilos, las
 * marcas de origen, la ficha de herbario, el "no sé" con sus letreros, la
 * piedra de la advertencia y la guarda del saber campesino.
 *
 * Standalone y sin wiring: se monta donde haga falta revisarla (vitrina
 * visual-lib, una ruta de mockups, un preview). Cero fetch, cero estado
 * global.
 */

/* Una respuesta de muestra por nivel — el hilo debajo cuenta la confianza. */
const MUESTRAS = {
  alta: {
    texto:
      'Su lote está a 2.650 metros y sembró papa criolla el 14 de mayo: para el gusano blanco le sirve la trampa de cajón con papa partida, revisada cada 8 días. Así lo recomienda Agrosavia para su piso térmico.',
    origen: 'finca',
  },
  media: {
    texto:
      'En general, la asociación de maíz con frijol funciona bien porque el frijol fija nitrógeno y el maíz le sirve de tutor. No tengo el dato de su lote, pero es un principio que aplica en casi todo clima medio.',
    origen: 'general',
  },
  baja: {
    texto:
      'Puede que sea deficiencia de magnesio por el amarillamiento entre venas que describe, pero sin ver la mata ni conocer su suelo no se lo puedo asegurar. Tómelo como una pista, no como diagnóstico.',
    origen: 'general',
  },
  honesta: {
    texto:
      'No tengo ese número guardado y no se lo voy a inventar.',
    origen: null,
  },
};

export default function GaleriaConfianza() {
  return (
    <div className="cfz-galeria">
      <h2>El hilo: cuatro maneras de coser una respuesta</h2>
      <p className="cfz-galeria-nota">
        Firme, hilvanada, suelta o rematada en nudo — se lee de un vistazo, sin cifras.
      </p>
      {ORDEN_NIVELES.map((id) => (
        <div className="cfz-galeria-respuesta" key={id}>
          <p>{MUESTRAS[id].texto}</p>
          <div className="cfz-galeria-fila">
            {MUESTRAS[id].origen && <MarcaOrigen origen={MUESTRAS[id].origen} />}
            <span style={{ fontSize: 11, opacity: 0.55 }}>{NIVELES_CONFIANZA[id].etiqueta}</span>
          </div>
          <TrazoConfianza nivel={id} />
        </div>
      ))}

      <hr />

      <h2>De dónde sale el saber</h2>
      <p className="cfz-galeria-nota">La raíz va honda solo cuando es de SU finca.</p>
      <div className="cfz-galeria-fila">
        <MarcaOrigen origen="finca" />
        <MarcaOrigen origen="fuente" />
        <MarcaOrigen origen="general" />
        <MarcaOrigen origen="tradicion" />
      </div>

      <hr />

      <h2>La cita como objeto</h2>
      <p className="cfz-galeria-nota">Etiqueta de herbario: se toca y muestra la fuente.</p>
      <div className="cfz-galeria-fila">
        <FichaFuente
          titulo="Manejo del gusano blanco en papa"
          tipo="agrosavia"
          detalle="Recomendación de manejo integrado de Agrosavia para papa en clima frío: trampas de cajón, control biológico con Beauveria bassiana y rotación."
          url="https://www.agrosavia.co"
        />
        <FichaFuente
          titulo="Lote La Loma — bitácora de mayo"
          tipo="finca"
          detalle="Sale de sus propios registros: siembra del 14 de mayo, 2.650 m, papa criolla."
        />
      </div>

      <hr />

      <h2>El &ldquo;no sé&rdquo; digno</h2>
      <p className="cfz-galeria-nota">El hilo se remata en nudo y los letreros señalan el camino.</p>
      <NoSeHonesto
        caminos={[
          { label: 'Oficina del ICA de su departamento', detalle: 'ellos tienen el contacto actualizado' },
          { label: 'La UMATA o la alcaldía de su municipio', detalle: 'pregunte por el técnico agropecuario' },
        ]}
      >
        No tengo ese número guardado y no se lo voy a inventar. Le digo dónde sí se lo dan:
      </NoSeHonesto>

      <hr />

      <h2>La advertencia con peso</h2>
      <p className="cfz-galeria-nota">No parpadea: se asienta como una piedra.</p>
      <AdvertenciaPeso titulo="No duplique la dosis">
        <p>
          Doblar la dosis del producto no mata más plaga y sí aumenta el riesgo de intoxicación
          para usted y los suyos. Respete la etiqueta, use guantes, botas y respirador, y no
          fumigue si todavía no lo necesita.
        </p>
      </AdvertenciaPeso>

      <hr />

      <h2>El saber de la gente</h2>
      <p className="cfz-galeria-nota">Ni verde ni ámbar: envuelto en su guarda tejida.</p>
      <SaberTradicion>
        <p>
          Dicen los mayores que sembrar en menguante da matas más fuertes y madera que no se
          apolilla. En muchas veredas se siembra mirando la luna desde siempre.
        </p>
      </SaberTradicion>
    </div>
  );
}
