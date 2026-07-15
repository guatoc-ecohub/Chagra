/*
 * PaladaDeSeco — el control. Una palada de material seco, agarrada con el dedo.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * QUÉ MIDE EL RIEL, Y POR QUÉ ESO ES TODO
 *
 * El riel NO dice "qué tan limpia está la cochera" ni "qué tan buen productor
 * es usted". Dice CUÁNTO MATERIAL SECO HAY EN LA CAMA. Nada más.
 *
 * Y ese recorte es la pieza entera, porque contradice lo que todo el mundo cree:
 *
 *   "Casi siempre el problema no es que limpie poco, sino que limpia sin agregar
 *    suficiente material carbonado nuevo."
 *
 * El hombre que lava con manguera dos veces al día está trabajando MÁS que el
 * vecino y su cochera huele PEOR. Si este control se llamara "aseo", la pieza
 * repetiría el error que vino a corregir y encima lo haría sentir culpable de
 * algo que ya está haciendo. Se llama aserrín. Es más barato y funciona.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * EL RIEL NO ES LINEAL
 *
 * La primera mitad del riel se come apenas un tercio del material. Al arrastrar,
 * uno siente que las primeras paladas CAMBIAN MUCHO —el lodo cede, el velo se
 * desinfla, las moscas se ralean— y que después la cosa se pone lenta y hay que
 * seguir echando para ganar poquito.
 *
 * Esa resistencia en el dedo es el dato: la primera palada es la que más rinde
 * ("cualquier material carbonado seco es mejor que no echar nada") y la cama
 * profunda de verdad es tozudez, no un truco. El que llega hasta el final del
 * riel sintió lo que cuesta.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LO QUE NO HAY
 *
 * · Ni un número. Ni ppm, ni C:N, ni centímetros, ni "78% de eficiencia". El
 *   maestro no da cifras (ver `senalesDelCuerpo.js`) y esta pieza tampoco.
 *   Lo que se lee son las tres señales del cuerpo: el puño, los ojos, la mosca.
 * · Ni barra de progreso, ni verificado verde, ni "¡Felicitaciones!". Llegar a
 *   cama profunda no es ganar un nivel: es que la cochera dejó de robarle. La
 *   dirección educativa de la casa es observación, no gamificación.
 * · Ni un regaño. Ninguna frase dice "debe" ni "no debe".
 *
 * Es un <input type=range> de verdad: anda con el dedo, con las flechas del
 * teclado y con lector de pantalla, y en un teléfono humilde no cuesta nada.
 * Blancos de 44px, para mano de campo con barro y sol en la pantalla.
 *
 * En "usted", como toda la UI de la casa.
 */
import { useCallback } from 'react';
import { aire } from './aireCargado.js';
import { PARADAS, paradaDe, senalesDe } from './senalesDelCuerpo.js';
import './olor.css';

/*
 * La curva del riel. `pos` (lo que uno arrastra, 0..1) → `carbono` (lo que hay
 * en la cama). Potencia 1.6: la mitad del riel entrega como un tercio del
 * material. Las primeras paladas rinden; las últimas hay que sudarlas.
 */
const carbonoDesdePos = (p) => Math.pow(Math.min(1, Math.max(0, p)), 1.6);
const posDesdeCarbono = (c) => Math.pow(Math.min(1, Math.max(0, c)), 1 / 1.6);

/**
 * @param {{
 *   carbono: number,
 *   onCarbono: (v: number) => void,
 * }} props
 */
export default function PaladaDeSeco({ carbono, onCarbono }) {
  const a = aire(carbono);
  const parada = paradaDe(carbono);
  const senales = senalesDe(a);
  const pos = posDesdeCarbono(carbono);

  const arrastrar = useCallback(
    (e) => onCarbono(carbonoDesdePos(Number(e.target.value) / 1000)),
    [onCarbono],
  );

  return (
    <div className="ol">
      {/* Dónde está la cama, ahora. */}
      <div className="ol__cabeza">
        <div className="ol__titulo" aria-live="polite">
          {parada.titulo}
        </div>
      </div>

      {/* Qué está pasando ahí adentro. Física, no orden. */}
      <p className="ol__texto">{parada.texto}</p>

      {/* El riel: cuánto material seco. */}
      <div className="ol__riel">
        <div className="ol__pista" aria-hidden="true">
          {/* Se llena del color del material seco, no de un verde de "correcto". */}
          <div className="ol__seco" style={{ width: `${pos * 100}%` }} />
          {PARADAS.map((p) => (
            <span key={p.clave} className="ol__hito" style={{ left: `${posDesdeCarbono(p.carbono) * 100}%` }} />
          ))}
        </div>
        <input
          className="ol__input"
          type="range"
          min={0}
          max={1000}
          step={1}
          value={Math.round(pos * 1000)}
          onChange={arrastrar}
          aria-label="Material seco en la cama: aserrín, cascarilla de arroz, cisco de café, hoja seca"
          aria-valuetext={`${parada.titulo}. ${senales.map((s) => s.texto).join('. ')}`}
        />
      </div>

      {/* Las paradas del camino. Se puede tocar cualquiera. */}
      <div className="ol__paradas">
        {PARADAS.map((p) => (
          <button
            key={p.clave}
            type="button"
            className={`ol__parada${p.clave === parada.clave ? ' ol__parada--aqui' : ''}`}
            style={{ left: `${posDesdeCarbono(p.carbono) * 100}%` }}
            onClick={() => onCarbono(p.carbono)}
            aria-current={p.clave === parada.clave ? 'step' : undefined}
          >
            {p.titulo}
          </button>
        ))}
      </div>

      {/*
        Las señales del cuerpo. Esto reemplaza al HUD que esta pieza no tiene:
        no hay aparato, hay mano, ojos y nariz. Cada una se pinta apenas de
        ámbar o de verde — nunca de rojo de alarma, que en la paleta de la casa
        no existe (el rojo es cochinilla y café cereza, textil y fruto).
      */}
      <ul className="ol__senales">
        {senales.map((s) => (
          <li key={s.texto} className={`ol__senal${s.bien ? ' ol__senal--bien' : ''}`}>
            <span className="ol__senalTexto">{s.texto}</span>
            {/* El aparte: la frase del maestro que traduce lo que uno siente.
                Sale sola, cuando toca, y se calla cuando no. */}
            {s.aparte && <span className="ol__aparte">{s.aparte}</span>}
          </li>
        ))}
      </ul>

      {/*
        La tesis, en letra chica y sin subrayarla. Si la pieza está bien hecha,
        para cuando uno lee esto ya lo sabía: lo vio subirse por el techo.
      */}
      <p className="ol__tesis">
        {a.amoniaco > 0.35
          ? 'Ese olor no es normal: es nitrógeno volándose. Abono que ya pagó, saliéndose por el techo.'
          : 'El mismo nitrógeno que se volaba ahora está en la cama. De ahí sale para la huerta.'}
      </p>
    </div>
  );
}
