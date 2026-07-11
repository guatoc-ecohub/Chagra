/**
 * MOCKUP "La voz con forma" — ruta #/mockups/voz-con-forma.
 *
 * Cuando el campesino dice «hola, Chagra», en vez de un micrófono genérico
 * aparece un IRIS orgánico que ES la identidad visual de la voz de Chagra:
 * anillos concéntricos de agua/tronco que respiran, reaccionan al volumen
 * y se aquietan al terminar. Cálido y de tierra — NO sci-fi (es el
 * contrapunto deliberado al astrolabio holográfico de EscuchaOverlay).
 *
 * Datos DE MUESTRA (no cablea micrófono ni sesión): decisión visual pura.
 * El primitivo reusable vive en `src/visual/voz/IrisVoz.jsx`, listo para
 * producción (recibe el RMS real vía `getNivel`).
 *
 * Reusa de la librería visual (src/visual/effects):
 *  - GlowFilter (el glow canónico, estático) — dentro de IrisVoz.
 *  - --vfx-beat (5.2s): la respiración del iris late con el resto de la casa.
 *  - Reglas de la casa: solo transform/opacity, cero setState por frame,
 *    prefers-reduced-motion = fotograma digno, responsive hasta 320px.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup dev con datos de
   muestra (no UI de producto); si se productiza, el copy migra a messages.js
   (ADR-050). */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import IrisVoz from '../visual/voz';
import '../visual/effects/effects.css';
import './vozConForma.css';

/* ── La conversación de muestra (guion determinista) ─────────────────────────
 * Un ciclo completo de la voz: quieta → la llaman → escucha → piensa →
 * responde → se aquieta. Cada paso fija el estado del iris y qué se ve del
 * hilo de conversación. Datos plausibles de finca fría (~2.900 m). */
const GUION = [
  {
    estado: 'reposo',
    dur: 2000,
    nota: 'La finca está tranquila. La voz apenas respira.',
  },
  {
    estado: 'escuchando',
    dur: 1300,
    nota: 'La oyó nombrar: el iris se enciende color miel.',
    wake: true,
  },
  {
    estado: 'escuchando',
    dur: 4600,
    nota: 'Las ondas viajan hacia adentro: su voz entra hasta la brasa.',
    wake: true,
    burbujas: 1,
  },
  {
    estado: 'pensando',
    dur: 2400,
    nota: 'Los anillos se trenzan: agua dando vueltas antes de aclararse.',
    wake: true,
    burbujas: 1,
  },
  {
    estado: 'hablando',
    dur: 7000,
    nota: 'Ahora las ondas nacen en la brasa y salen: la voz es de Chagra.',
    wake: true,
    burbujas: 2,
  },
  {
    estado: 'reposo',
    dur: 2600,
    nota: 'La voz se aquieta hasta que usted la vuelva a llamar.',
    wake: true,
    burbujas: 2,
  },
];

const BURBUJAS = [
  {
    quien: 'campesino',
    nombre: 'Usted',
    texto: '¿Cómo amaneció el tomate después del frío de anoche?',
  },
  {
    quien: 'chagra',
    nombre: 'Chagra',
    texto:
      'Anoche bajó a 4 grados en su vereda. Revise las hojas nuevas del lote dos: si amanecieron oscuras o vidriosas, riegue temprano y deje la poda para otro día.',
  },
];

const ETIQUETAS = {
  reposo: 'En reposo',
  escuchando: 'Escuchando',
  pensando: 'Pensando',
  hablando: 'Hablando',
};

const ANUNCIOS = {
  reposo: 'La voz está en reposo.',
  escuchando: 'Chagra está escuchando.',
  pensando: 'Chagra está pensando.',
  hablando: 'Chagra está hablando.',
};

/* ── Anatomía: la regla de cada momento ────────────────────────────────────── */
const MOMENTOS = [
  {
    estado: 'reposo',
    titulo: 'Reposo',
    regla: 'Apenas respira, al mismo ritmo que el resto de la casa. La brasa queda en rescoldo: está viva, pero no pide atención.',
  },
  {
    estado: 'escuchando',
    titulo: 'Escuchando',
    regla: 'Las ondas viajan hacia adentro — su voz entra hasta el centro. El brillo sube y baja con el volumen real, nada es fingido.',
  },
  {
    estado: 'pensando',
    titulo: 'Pensando',
    regla: 'Los anillos se trenzan y giran despacio, como el agua que da vueltas antes de aclararse. Sin nivel: la voz ya está adentro.',
  },
  {
    estado: 'hablando',
    titulo: 'Hablando',
    regla: 'Las ondas nacen en la brasa y salen hacia afuera: ahora la voz es de Chagra, y trae el verde de lo que crece.',
  },
];

export default function VozConForma() {
  const [manual, setManual] = useState('reposo');
  const [reproduciendo, setReproduciendo] = useState(false);
  const [paso, setPaso] = useState(0);
  const timerRef = useRef(null);

  const pasoActual = GUION[paso] || GUION[0];
  const estado = reproduciendo ? pasoActual.estado : manual;

  /* Guion: cada paso agenda el siguiente; al final el ciclo se detiene solo
     (la voz se aquieta — no dejamos un loop infinito pidiendo atención). */
  useEffect(() => {
    if (!reproduciendo) return undefined;
    timerRef.current = setTimeout(() => {
      if (paso >= GUION.length - 1) {
        setReproduciendo(false);
        setManual('reposo');
      } else {
        setPaso((p) => p + 1);
      }
    }, pasoActual.dur);
    return () => clearTimeout(timerRef.current);
  }, [reproduciendo, paso, pasoActual.dur]);

  const reproducir = () => {
    setPaso(0);
    setReproduciendo(true);
  };

  const elegir = (est) => {
    setReproduciendo(false);
    setManual(est);
  };

  const notaViva = reproduciendo
    ? pasoActual.nota
    : MOMENTOS.find((m) => m.estado === estado)?.regla;

  const burbujasVisibles = useMemo(
    () => (reproduciendo ? BURBUJAS.slice(0, pasoActual.burbujas || 0) : []),
    [reproduciendo, pasoActual.burbujas],
  );

  return (
    <div className="vcf" data-estado={estado}>
      <div className="vcf-luz" aria-hidden="true" />

      <header className="vcf-cabecera">
        <p className="vcf-eyebrow">Mockup de galería · decisión visual · datos de muestra</p>
        <h1 className="vcf-titulo">La voz con forma</h1>
        <p className="vcf-sub">
          Cuando usted dice <b>«hola, Chagra»</b>, la app no le muestra un micrófono:
          le muestra su voz — anillos de agua y de tronco alrededor de una brasa.
        </p>
      </header>

      {/* ── El iris, en grande ───────────────────────────────────────────── */}
      <section className="vcf-hero" aria-label="El iris de la voz">
        <div className="vcf-escenario">
          {pasoActual.wake && reproduciendo && (
            <span className="vcf-wake" aria-hidden="true">«hola, Chagra»</span>
          )}
          <IrisVoz estado={estado} size={300} className="vcf-iris-hero" />
          <p className="vcf-estado" aria-live="polite">
            <span className="vcf-estado-punto" aria-hidden="true" />
            {ANUNCIOS[estado]}
          </p>
          {notaViva && <p className="vcf-nota">{notaViva}</p>}
        </div>

        <div className="vcf-mando">
          <button
            type="button"
            className="vcf-btn-demo"
            onClick={reproducir}
            disabled={reproduciendo}
          >
            {reproduciendo ? 'Conversando…' : 'Ver una conversación'}
          </button>
          <div className="vcf-estados" role="group" aria-label="Elegir estado del iris">
            {MOMENTOS.map((m) => (
              <button
                key={m.estado}
                type="button"
                className="vcf-btn-estado"
                aria-pressed={!reproduciendo && manual === m.estado}
                onClick={() => elegir(m.estado)}
              >
                {ETIQUETAS[m.estado]}
              </button>
            ))}
          </div>

          <div className="vcf-hilo" aria-live="polite">
            {burbujasVisibles.map((b) => (
              <div key={b.quien} className={`vcf-burbuja vcf-burbuja-${b.quien}`}>
                <span className="vcf-burbuja-quien">{b.nombre}</span>
                <p>{b.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Anatomía: un solo gesto, cuatro momentos ─────────────────────── */}
      <section className="vcf-seccion">
        <h2>Un solo gesto, cuatro momentos</h2>
        <p className="vcf-seccion-sub">
          La forma nunca cambia — cambia la vida que lleva adentro. El movimiento
          tiene dirección con sentido: escuchar entra, hablar sale.
        </p>
        <div className="vcf-momentos">
          {MOMENTOS.map((m) => (
            <article key={m.estado} className="vcf-momento">
              <IrisVoz estado={m.estado} size={104} />
              <h3>{m.titulo}</h3>
              <p>{m.regla}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── La identidad sobrevive en pequeño ────────────────────────────── */}
      <section className="vcf-seccion">
        <h2>La misma voz, en cualquier tamaño</h2>
        <p className="vcf-seccion-sub">
          Del chip de la barra al botón de manos libres: es siempre el mismo
          iris, nunca "otro icono de micrófono".
        </p>
        <div className="vcf-tamanos">
          <figure className="vcf-contexto">
            <div className="vcf-falsa-barra">
              <span className="vcf-falsa-marca">Chagra</span>
              <span className="vcf-falso-chip">
                <IrisVoz estado="escuchando" size={22} />
                La estoy oyendo…
              </span>
            </div>
            <figcaption>Chip de estado en la barra (22 px)</figcaption>
          </figure>
          <figure className="vcf-contexto">
            <div className="vcf-falso-pie">
              <span className="vcf-falsa-pestana">Hoy</span>
              <span className="vcf-falso-fab">
                <IrisVoz estado="reposo" size={56} />
              </span>
              <span className="vcf-falsa-pestana">Mi finca</span>
            </div>
            <figcaption>Botón de manos libres (56 px) — en reposo, apenas respira</figcaption>
          </figure>
          <figure className="vcf-contexto">
            <div className="vcf-falsa-tarjeta">
              <IrisVoz estado="hablando" size={72} />
              <div>
                <b>Chagra le está respondiendo</b>
                <p>La respuesta también se lee aquí, por si prefiere el texto.</p>
              </div>
            </div>
            <figcaption>Acompañando la respuesta hablada (72 px)</figcaption>
          </figure>
        </div>
      </section>

      {/* ── Nota de intención ────────────────────────────────────────────── */}
      <section className="vcf-seccion vcf-intencion">
        <h2>¿Por qué no un micrófono?</h2>
        <p>
          El micrófono es el aparato; la voz es la relación. Un icono de micrófono
          dice "esto graba". El iris dice "esto <em>escucha</em>": se enciende con
          usted, retiene un instante lo que oyó y se aquieta cuando terminan de
          hablar. Sus anillos son los de las ondas en una totuma de agua y los del
          tronco de un árbol viejo — la forma que el campo le da al tiempo y al sonido.
        </p>
        <ul className="vcf-fichas">
          <li>
            <b>Honesto:</b> el brillo responde al nivel real del micrófono
            (aquí simulado); no hay animación fingida.
          </li>
          <li>
            <b>De la casa:</b> respira al ritmo compartido (<code>--vfx-beat</code>)
            y usa el glow canónico de <code>src/visual/effects</code>.
          </li>
          <li>
            <b>Listo para producción:</b> el primitivo vive en
            <code> src/visual/voz/IrisVoz.jsx</code> — estados, tamaños,
            <code> getNivel</code> para el RMS real y reduced-motion digno.
          </li>
        </ul>
        <p className="vcf-pie">
          Ruta <code>#/mockups/voz-con-forma</code> · sin sesión · datos de muestra.
        </p>
      </section>
    </div>
  );
}
