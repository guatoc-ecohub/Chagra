/*
 * EscenaMercado — ARQUETIPO `mercado`: el MERCADO CAMPESINO y la venta justa.
 *
 * De la familia del `flujo` (una RUTA que se recorre), pero aquí el camino es la
 * CADENA CORTA del campo a la mesa: la cosecha sale de la finca y llega a la
 * plaza sin dar la vuelta por diez manos. El espacio mismo cuenta la
 * comercialización justa de la finca andina:
 *
 *   · la RUTA campo→mercado — la cinta que baja de la parcela verde (al fondo)
 *     hasta los puestos: corta y directa, del productor al comprador;
 *   · los PUESTOS con su TOLDO — el lugar del mercado campesino, dos toldos de
 *     colores con su mesa (uno de la huerta, otro del vecino);
 *   · los CANASTOS con lo de la finca — tomate, papa, maíz y café en su mimbre,
 *     la cosecha propia puesta a la vista;
 *   · la TARIMA DE PROCEDENCIA — el letrero del terroir: de qué vereda y qué
 *     piso térmico viene (el sello de origen andino que da confianza y valor);
 *   · la BALANZA del PRECIO JUSTO — la pesa que reparte parejo, sin la tajada
 *     del intermediario;
 *   · la GENTE de la feria — los campesinos VENDIENDO detrás de su mesa y quien
 *     compra al frente (rubber-hose de primitivas: ruana + sombrero);
 *   · los BANDERINES de día de mercado, colgados entre los dos toldos.
 *
 * Todo `MeshLambert`/`Basic`, sin sombras (contrato de EscenaBase3D). Geometría
 * de primitivas: cero GLTF, offline y liviano.
 *
 * ESPEJO VIVO (auditoría §5b): los CANASTOS de producto son el reflejo de la
 * COSECHA RECIENTE REAL de la finca (`estadoFinca.cosechaReciente`, que arma
 * useFincaViva). CONTRATO ANTI-FABRICACIÓN ESTRICTO: sin cosecha reciente, la
 * plaza queda TRANQUILA (canastos vacíos, sin producto) — jamás fingimos una
 * venta ni surtimos productos que nadie cosechó. Cuando hay cosecha, la plaza se
 * llena del cultivo REAL que salió de la finca (un lote creíble del mismo
 * producto, no cuatro surtidos de muestra).
 */
import { useMemo } from 'react';
import { Quaternion, Vector3 } from 'three';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Fauna } from './FaunaEscena.jsx';
import AnimalMomento from './AnimalMomento.jsx';
import { normalizarAnimales } from './CorralVivo.jsx';
import { faunaDeMundo } from '../faunaFuncional.js';
import { CIELOS, PALETA } from '../atmosferaMadre.js';

/* La fauna funcional de la feria (POLINIZADORES entre las flores del puesto y la
   cosecha: sin polinizador no hay cosecha que vender) vive en faunaFuncional.js. */

/* Color del PRODUCTO por cultivo real (los que de verdad salen de una finca
   andina). Es solo el tono del montón en el canasto; un cultivo no listado cae a
   un tono producto neutro (ámbar de mimbre), NUNCA a un producto inventado. */
const COLOR_PRODUCTO = {
  tomate: '#d24b3a', papa: '#c9a15a', maiz: '#e7c451', cafe: '#7a4a24',
  frijol: '#8a5a34', arveja: '#7a9a3f', mora: '#5a2a44', aguacate: '#4e6a2e',
  platano: '#d9c24b', banano: '#e0c34a', yuca: '#cbb98a', cebolla: '#c8b6d6',
  zanahoria: '#d07a34', lulo: '#d99a2f', uchuva: '#e0b23a', cilantro: '#5f8a3f',
  repollo: '#8aa84a', curuba: '#c8b23a', naranja: '#e0902f', limon: '#c9d24a',
  arracacha: '#e0cf9a', habichuela: '#6f9a3f', pepino: '#7fa83f', ahuyama: '#d98a2f',
};
/** Tono producto neutro para un cultivo sin color propio (mimbre ámbar). */
const PRODUCTO_NEUTRO = '#c98a3f';

/* Dónde vive la BALANZA en esta plaza (frente-izquierda, en el empedrado
   abierto) y dónde flota su píldora `precio` (en el cielo, sobre ella). Una
   sola fuente para que letrero y pesa no se desencuentren. */
const POS_BALANZA = /** @type {[number, number, number]} */ ([-0.5, 0, 0.78]);
const POS_PILDORA_PRECIO = [POS_BALANZA[0], 1.55, POS_BALANZA[2]];

/** Minúsculas y sin tildes, para casar el nombre del cultivo con el mapa. */
function normalizaCultivo(nombre) {
  return String(nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combina y quita tildes
    .trim();
}

/**
 * Color del producto de un cultivo REAL. Casa por palabra clave contenida
 * ("tomate chonto" → tomate); si no reconoce el cultivo, tono producto neutro
 * (nunca inventa que es tomate ni café).
 */
function colorDeProducto(cultivo) {
  const clave = normalizaCultivo(cultivo);
  if (!clave) return PRODUCTO_NEUTRO;
  for (const k of Object.keys(COLOR_PRODUCTO)) {
    if (clave.includes(k)) return COLOR_PRODUCTO[k];
  }
  return PRODUCTO_NEUTRO;
}

/**
 * Los CANASTOS que van a la plaza, ESPEJO de la cosecha reciente real.
 * Anti-fabricación: sin cosecha → [] (plaza tranquila, sin producto). Con
 * cosecha → un par de canastos del MISMO cultivo real (un lote creíble), no un
 * surtido de muestra. Un `params.canastos` explícito (vitrina) manda por encima.
 *
 * Con cosecha, el lote se ve DONDE se vende: canastos SOBRE las mesas (la mesa
 * es para eso), canastos al PIE de cada mesa (el producto al frente del puesto,
 * visible bajo el ala del toldo — el toldo tapa la mesa desde la cámara de
 * calle) y el bulto ante quien compra — así el producto se lee de una.
 *
 * @param {object|null} cosechaReciente  { cultivo, mundoId } | null
 * @param {Array|undefined} override  params.canastos explícito (vitrina)
 * @returns {Array<{producto:string, color:string, pos:number[]}>}
 */
function canastosDeCosecha(cosechaReciente, override) {
  if (Array.isArray(override)) return override;
  const cultivo = cosechaReciente?.cultivo;
  if (!cultivo) return [];
  const color = colorDeProducto(cultivo);
  return [
    { producto: cultivo, color, pos: [-0.85, 0.475, 0.2] }, // en la mesa del vecino
    { producto: cultivo, color, pos: [0.9, 0.475, -0.1] },  // en la mesa de la huerta
    { producto: cultivo, color, pos: [-0.62, 0, 0.68] },    // al pie del puesto del vecino
    { producto: cultivo, color, pos: [1.08, 0, 0.42] },     // al pie del puesto de la huerta
    { producto: cultivo, color, pos: [0.62, 0, 0.98] },     // el bulto ante quien compra
  ];
}

/* Un CANASTO de mimbre con su montón de producto. El canasto es un tronco de
   cono facetado (el tejido); encima, una loma de esferitas del color de lo que
   trae (tomate rojo, papa tierra, maíz dorado, café tostado). `vacio` deja el
   mimbre SOLO, sin montón: la señal HONESTA de plaza sin cosecha reciente (no
   fingimos un producto que nadie trajo). */
function Canasto({ pos, color = '#d24b3a', vacio = false }) {
  // el montoncito: unas esferas apiladas, determinista (misma forma siempre)
  const frutos = useMemo(() => {
    const base = [
      [0, 0.19, 0], [0.07, 0.17, 0.05], [-0.06, 0.17, 0.06],
      [0.05, 0.17, -0.07], [-0.05, 0.18, -0.05], [0, 0.23, 0],
    ];
    return base;
  }, []);
  return (
    <group position={pos}>
      {/* el mimbre (tronco de cono) */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.15, 0.11, 0.16, 9]} />
        <meshLambertMaterial color="#a9773f" flatShading />
      </mesh>
      {/* el borde del canasto */}
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.145, 0.02, 6, 12]} />
        <meshLambertMaterial color="#8a5f30" flatShading />
      </mesh>
      {/* el producto de la finca (solo si hay cosecha: canasto vacío no lo pone) */}
      {!vacio && frutos.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.055, 7, 6]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Un PUESTO de mercado: cuatro palos, la mesa y el TOLDO a dos aguas (el techo
   de tela de color). Es el lugar reconocible de la feria campesina. */
function Puesto({ pos, color = '#c96a2f' }) {
  const patas = [[-0.5, 0.32], [0.5, 0.32], [-0.5, -0.32], [0.5, -0.32]];
  return (
    <group position={pos}>
      {/* las patas del puesto */}
      {patas.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]}>
          <cylinderGeometry args={[0.028, 0.032, 0.44, 5]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
      ))}
      {/* la mesa (tablón) */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.15, 0.05, 0.72]} />
        <meshLambertMaterial color="#a9814f" flatShading />
      </mesh>
      {/* el toldo a dos aguas (prisma triangular = cono de 3 lados) */}
      <mesh position={[0, 0.92, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.86, 0.4, 4]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      {/* el remate del toldo */}
      <mesh position={[0, 1.14, 0]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshLambertMaterial color="#f2e2c0" flatShading />
      </mesh>
      {/* los postes que sostienen el toldo */}
      {[[-0.5, 0], [0.5, 0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.68, z]}>
          <cylinderGeometry args={[0.02, 0.02, 0.48, 5]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* La TARIMA DE PROCEDENCIA: un poste con su placa redondeada — el sello de
   origen. Dice de dónde viene la cosecha (vereda, piso térmico): el terroir
   andino que da confianza y valor a lo de la finca. */
function TarimaProcedencia({ pos }) {
  return (
    <group position={pos}>
      {/* el poste */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 0.8, 6]} />
        <meshLambertMaterial color={PALETA.tierraClara} flatShading />
      </mesh>
      {/* la placa del sello de origen (madera clara) */}
      <mesh position={[0, 0.86, 0]}>
        <boxGeometry args={[0.5, 0.34, 0.04]} />
        <meshLambertMaterial color="#efdcb4" flatShading />
      </mesh>
      {/* el sello redondo (procedencia andina) */}
      <mesh position={[0, 0.86, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.02, 14]} />
        <meshLambertMaterial color="#3f8f4e" flatShading />
      </mesh>
      {/* la montañita del sello (el piso térmico de donde viene) */}
      <mesh position={[0, 0.85, 0.05]}>
        <coneGeometry args={[0.06, 0.09, 4]} />
        <meshLambertMaterial color="#efdcb4" flatShading />
      </mesh>
    </group>
  );
}

/* La BALANZA del precio justo: un fiel con su brazo y dos platillos. La pesa que
   reparte parejo — el trato directo, sin la tajada del intermediario. */
function Balanza({ pos }) {
  return (
    <group position={pos}>
      {/* la columna */}
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.48, 6]} />
        <meshLambertMaterial color="#b9932f" flatShading />
      </mesh>
      {/* el brazo */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.44, 0.02, 0.02]} />
        <meshLambertMaterial color="#d4b24a" flatShading />
      </mesh>
      {/* los dos platillos, parejos */}
      {[-0.2, 0.2].map((x) => (
        <mesh key={x} position={[x, 0.42, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.08, 0.06, 10]} />
          <meshLambertMaterial color="#d4b24a" flatShading />
        </mesh>
      ))}
      {/* el fiel */}
      <mesh position={[0, 0.53, 0]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshLambertMaterial color="#8a6a2f" flatShading />
      </mesh>
    </group>
  );
}

/* Un CAMPESINO de la feria (el brief del mundo: "vender directo es poner la
   cara"): silueta rubber-hose de primitivas — la ruana en cono, la cabeza, el
   sombrero de ala ancha con su franja y los brazos hacia la mesa. Sin cara
   dibujada (la escala del diorama no la pide): el sombrero + la ruana SON el
   personaje, como en las láminas. `rotY` lo gira (el que compra mira al que
   vende). */
function Campesino({ pos, ruana = '#5c6b35', rotY = 0 }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* la ruana (el cuerpo entero: cono ancho de hombros caídos) */}
      <mesh position={[0, 0.23, 0]}>
        <coneGeometry args={[0.16, 0.46, 7]} />
        <meshLambertMaterial color={ruana} flatShading />
      </mesh>
      {/* la cabeza */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.075, 8, 7]} />
        <meshLambertMaterial color="#d9a06a" flatShading />
      </mesh>
      {/* el sombrero: ala ancha + copa con su franja oscura */}
      <mesh position={[0, 0.565, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 0.018, 10]} />
        <meshLambertMaterial color="#efe3c2" flatShading />
      </mesh>
      <mesh position={[0, 0.585, 0]}>
        <cylinderGeometry args={[0.06, 0.066, 0.016, 8]} />
        <meshLambertMaterial color="#4a3a24" flatShading />
      </mesh>
      <mesh position={[0, 0.615, 0]}>
        <cylinderGeometry args={[0.055, 0.062, 0.05, 8]} />
        <meshLambertMaterial color="#efe3c2" flatShading />
      </mesh>
      {/* los brazos, hacia la mesa (el gesto de atender) */}
      {[-1, 1].map((lado) => (
        <mesh
          key={lado}
          position={[lado * 0.135, 0.32, 0.05]}
          rotation={[-0.5, 0, lado * -0.75]}
        >
          <cylinderGeometry args={[0.02, 0.024, 0.2, 5]} />
          <meshLambertMaterial color={ruana} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Los BANDERINES de la feria: un mástil corto sobre el remate de cada toldo
   (izan la cuerda POR ENCIMA de los conos, para que cruce contra el cielo y no
   se pierda contra la tela) y la cuerda de cabuya entre las puntas — dos tramos
   rectos con su seno al medio, low-poly honesto — con sus triángulos de papel.
   Es la seña de "día de mercado" que se lee desde lejos, sin un asset externo. */
function Banderines({ desde, hasta, alza = 0.24, sag = 0.12 }) {
  const { mastiles, tramos, banderas } = useMemo(() => {
    const a = new Vector3(desde[0], desde[1] + alza, desde[2]);
    const b = new Vector3(hasta[0], hasta[1] + alza, hasta[2]);
    const palos = [desde, hasta].map((p) => [p[0], p[1] + alza / 2, p[2]]);
    const m = a.clone().add(b).multiplyScalar(0.5);
    m.y -= sag;
    const arriba = new Vector3(0, 1, 0);
    const pares = [[a, m], [m, b]];
    const segs = pares.map(([p, q]) => {
      const dir = q.clone().sub(p);
      const len = dir.length();
      const quat = new Quaternion().setFromUnitVectors(arriba, dir.clone().normalize());
      const mid = p.clone().add(q).multiplyScalar(0.5);
      return { mid: mid.toArray(), quat, len };
    });
    /* triángulos alternados (papel de plaza: rojo, maíz, verde, añil) */
    const COLORES = ['#c94f3f', '#e7c451', '#3f8f4e', '#4a7ab5'];
    const flags = [];
    pares.forEach(([p, q]) => {
      for (const t of [0.18, 0.42, 0.66, 0.9]) {
        const pt = p.clone().lerp(q, t);
        pt.y -= 0.055;
        flags.push({ pos: pt.toArray(), color: COLORES[flags.length % 4] });
      }
    });
    return { mastiles: palos, tramos: segs, banderas: flags };
  }, [desde, hasta, alza, sag]);
  return (
    <group>
      {mastiles.map((p, i) => (
        <mesh key={`m${i}`} position={p}>
          <cylinderGeometry args={[0.012, 0.014, alza, 4]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
      ))}
      {tramos.map((s, i) => (
        <mesh key={`c${i}`} position={s.mid} quaternion={s.quat}>
          <cylinderGeometry args={[0.008, 0.008, s.len, 4]} />
          <meshLambertMaterial color="#d9c69a" />
        </mesh>
      ))}
      {banderas.map((f, i) => (
        <mesh key={`b${i}`} position={f.pos} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.04, 0.09, 3]} />
          <meshLambertMaterial color={f.color} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Una MATA de la parcela (al fondo de la ruta): de aquí sale la cosecha. Tallo
   verde + copa redonda — la finca que alimenta la plaza. */
function MataCampo({ pos, color = '#4e8f3f' }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.32, 5]} />
        <meshLambertMaterial color="#5a6a2e" flatShading />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <sphereGeometry args={[0.16, 8, 7]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

function Diorama({ params, reducedMotion, tier, fauna, estadoFinca, onHotspot = () => {} }) {
  const puestos = params?.puestos || [
    { color: '#c96a2f', pos: [-0.85, 0, 0.2] },
    { color: '#3f8f4e', pos: [0.9, 0, -0.1] },
  ];
  // Los VENDIDOS del hato LLEGAN al mercado (audit §5a.4): el mismo dato del
  // corral, ahora en cuerpo. Bajan caminando por la ruta campo→plaza (desde la
  // parcela del fondo hasta el frente de los puestos). Normalizamos para heredar
  // silueta/pelaje/tamaño reales; la posición aquí es la de la ruta, no el corral.
  const llegando = useMemo(
    () => normalizarAnimales((params?.animales || []).filter((a) => a.estado === 'vendido')),
    [params?.animales],
  );
  // ESPEJO VIVO de la cosecha reciente REAL (§5b): los canastos son el cultivo
  // que de verdad salió de la finca. Sin cosecha reciente → [] (plaza tranquila);
  // jamás surtimos productos de muestra. `params.canastos` explícito (vitrina)
  // manda por encima del dato real.
  const canastos = useMemo(
    () => canastosDeCosecha(estadoFinca?.cosechaReciente, params?.canastos),
    [estadoFinca?.cosechaReciente, params?.canastos],
  );
  // Plaza tranquila: no hay cosecha reciente que traer. La feria queda armada
  // (puestos, tarima, balanza) con UN canasto VACÍO al frente — señal honesta de
  // "lista, esperando la cosecha", no un puesto roto ni surtido inventado.
  const plazaTranquila = canastos.length === 0;

  // La parcela del fondo: unas matas de donde sale la cosecha (el origen de la
  // ruta campo→mercado). Repartidas con aire al fondo del diorama.
  const parcela = useMemo(() => (
    [
      [-0.7, -2.2, '#4e8f3f'], [-0.2, -2.5, '#57993f'], [0.35, -2.2, '#468637'],
      [0.85, -2.45, '#5a9a3f'],
    ]
  ), []);

  return (
    <group>
      {/* el piso de la plaza (empedrado cálido) */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 28]} />
        <meshLambertMaterial color="#b79a6a" />
      </mesh>

      {/* la RUTA campo→mercado: la cinta corta que baja de la parcela verde (al
          fondo, -z) hasta los puestos. Es la cadena corta, del productor al
          comprador, sin dar la vuelta. */}
      <mesh position={[0.1, 0.005, -1.0]} rotation={[-Math.PI / 2, 0, 0.04]}>
        <planeGeometry args={[0.7, 2.6]} />
        <meshLambertMaterial color={PALETA.maderaClara} />
      </mesh>
      {/* la parcela de donde sale todo (el campo, al fondo de la ruta) */}
      <mesh position={[0.1, 0.006, -2.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.85, 20]} />
        <meshLambertMaterial color="#6d8a3e" />
      </mesh>
      {parcela.map(([x, z, c], i) => (
        <MataCampo key={i} pos={[Number(x), 0, Number(z)]} color={/** @type {string} */ (c)} />
      ))}

      {/* el anillo vivo de la plaza (el borde de la feria) */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.6, 0.045, 8, 44]} />
        <meshBasicMaterial color="#c98a3f" transparent opacity={0.7} />
      </mesh>

      {/* los puestos con su toldo */}
      {puestos.map((p, i) => (
        <Puesto key={i} pos={p.pos} color={p.color} />
      ))}

      {/* los banderines de día de mercado, colgados entre los dos toldos */}
      {puestos.length >= 2 && (
        <Banderines
          desde={[puestos[0].pos[0], 1.14, puestos[0].pos[2]]}
          hasta={[puestos[1].pos[0], 1.14, puestos[1].pos[2]]}
        />
      )}

      {/* la GENTE de la feria (el corazón del brief: campesinos VENDIENDO):
          cada vendedor atendiendo en la esquina de su puesto — por FUERA del
          ala del toldo, que detrás de la mesa el techo los tapaba desde la
          cámara — y quien compra al frente, con su canasto: el trato directo
          hecho cuerpo. Giros mirando al centro de la plaza (a su clientela). */}
      {puestos[0] && (
        <Campesino
          pos={[puestos[0].pos[0] - 0.77, 0, puestos[0].pos[2] + 0.42]}
          ruana="#5c6b35"
          rotY={1.35}
        />
      )}
      {puestos[1] && (
        <Campesino
          pos={[puestos[1].pos[0] + 0.62, 0, puestos[1].pos[2] + 0.32]}
          ruana="#a04434"
          rotY={-1.25}
        />
      )}
      {/* quien compra llega por el frente derecho, de medio lado (que la luz
          de la plaza le dé en la ruana y no lea como silueta a contraluz) */}
      <group scale={0.92}>
        <Campesino pos={[0.95, 0, 1.2]} ruana="#9aa8c5" rotY={-Math.PI * 0.7} />
      </group>

      {/* los canastos con la cosecha REAL de la finca (sobre las mesas y el piso) */}
      {canastos.map((c, i) => (
        <Canasto key={i} pos={c.pos} color={c.color} />
      ))}
      {/* plaza tranquila (sin cosecha reciente): un canasto VACÍO esperando
          sobre la mesa — la feria lista, la cosecha que aún no llega */}
      {plazaTranquila && <Canasto pos={[-0.85, 0.475, 0.2]} vacio />}

      {/* la tarima del sello de procedencia (el terroir andino) */}
      <TarimaProcedencia pos={[-1.4, 0, -0.35]} />

      {/* la balanza del precio justo — posada en el empedrado del frente-
          izquierda (el punto despejado de la plaza: antes vivía en el centro
          exacto y su píldora tapaba los puestos; su hotspot la acompaña). */}
      <Balanza pos={POS_BALANZA} />

      {/* los VENDIDOS que llegan del corral: bajan por la ruta y se posan al
          frente de los puestos, cada uno con su NOMBRE (el dato viajó con él). */}
      {llegando.map((a, i) => {
        const x = 0.1 + (i - (llegando.length - 1) / 2) * 0.6;
        return (
          <AnimalMomento
            key={a.id}
            animal={a}
            modo="llega"
            origen={[x, 0, -2.1]}
            destino={[x, 0, 0.75]}
            reducedMotion={reducedMotion}
            tier={tier}
            /* tocar al vendido abre la puerta de VENDER (contrato onHotspot =
               (view, data), no el objeto animal: eso rompía la narración) */
            onPick={() => onHotspot('mercado')}
          />
        );
      })}

      {/* la fauna que anima la feria (polinizadores de puesto y plaza) */}
      <Fauna items={fauna} reducedMotion={reducedMotion} tier={tier} viento={estadoFinca?.viento} />
    </group>
  );
}

export default function EscenaMercado(props) {
  // Cielo cálido de plaza de mercado a media mañana (se mezcla igual hacia la
  // hora dorada del valle: entrar debe sentirse como acercarse, no otra app).
  const cielo = CIELOS.plaza;
  const fauna = faunaDeMundo(props.mundoId, { tier: props.tier });
  // Ajuste PRESENTACIONAL de la escena (gate visual 2026-07-30): las píldoras
  // de las puertas flotaban a media altura del diorama y la PLENA (el foco por
  // "más apuntado" de EscenaBase3D, siempre la más central) caía encima de los
  // puestos, la gente y los banderines — tapaba el mercado entero. Se suben
  // TODAS por encima de la línea de banderines (y≈1.14): la plena queda como el
  // rótulo flotante de la plaza en la franja de cielo vacía (Angelita la ronda
  // allá arriba) y las demás se calman a punto-chip sobre su puerta. `precio`
  // además acompaña a la balanza, que en esta escena vive al frente-izquierda
  // (ver Diorama). El DATO (mundoData) no se toca: view, label y puerta siguen
  // idénticos; solo se acomoda el letrero en el aire.
  const hotspots = useMemo(
    () =>
      (props.hotspots || []).map((h) => {
        if (h.id === 'precio') return { ...h, pos: POS_PILDORA_PRECIO };
        // TODAS las demás también por encima de la línea de banderines: la que
        // gane el foco (la más centrada cambia con la cámara) siempre queda en
        // el cielo, nunca tapando puestos/gente/producto.
        return { ...h, pos: [h.pos[0], 1.45, h.pos[2]] };
      }),
    [props.hotspots],
  );
  return (
    <EscenaBase3D
      {...props}
      hotspots={hotspots}
      cielo={cielo}
      /* Encuadre propio de la escena (gate visual 2026-07-30): con zoom 7 la
         plaza quedaba chiquita en un mar de cielo. 5.2 la sienta en el marco
         (la cámara arranca ~6.5u del centro, la plaza llena el ancho) y el
         centro bajito deja aire arriba para toldos y banderines sin cortarlos. */
      entrada={{ ...props.entrada, zoom: 5.2, centro: [0, 0.25, 0] }}
      /* Cámara a media altura de calle (no el picado default de zoom*0.5): a
         esta plaza se entra caminando — así se ve DEBAJO de los toldos (mesas,
         gente, producto) y los banderines quedan contra el cielo. */
      camara={{ position: [2.9, 2.05, 5.2], fov: 44 }}
    >
      <Diorama
        params={props.params}
        reducedMotion={props.reducedMotion}
        tier={props.tier}
        fauna={fauna}
        estadoFinca={props.estadoFinca}
        onHotspot={props.onHotspot}
      />
    </EscenaBase3D>
  );
}
