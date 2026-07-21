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
 *     del intermediario.
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
    { producto: cultivo, color, pos: [-0.85, 0, 0.75] },
    { producto: cultivo, color, pos: [0.55, 0, 0.7] },
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

      {/* los canastos con la cosecha REAL de la finca (sobre las mesas y el piso) */}
      {canastos.map((c, i) => (
        <Canasto key={i} pos={c.pos} color={c.color} />
      ))}
      {/* plaza tranquila (sin cosecha reciente): un canasto VACÍO que espera */}
      {plazaTranquila && <Canasto pos={[-0.85, 0, 0.75]} vacio />}

      {/* la tarima del sello de procedencia (el terroir andino) */}
      <TarimaProcedencia pos={[-1.4, 0, -0.35]} />

      {/* la balanza del precio justo — posada en el empedrado (antes flotaba
          ~0.45 sobre el piso sin mesa que la sostuviera). */}
      <Balanza pos={[0.15, 0, 0.55]} />

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
            destino={[x, 0, 0.4]}
            reducedMotion={reducedMotion}
            tier={tier}
            onPick={onHotspot}
          />
        );
      })}

      {/* la fauna que anima la feria (polinizadores de puesto y plaza) */}
      <Fauna items={fauna} reducedMotion={reducedMotion} />
    </group>
  );
}

export default function EscenaMercado(props) {
  // Cielo cálido de plaza de mercado a media mañana (se mezcla igual hacia la
  // hora dorada del valle: entrar debe sentirse como acercarse, no otra app).
  const cielo = CIELOS.plaza;
  const fauna = faunaDeMundo(props.mundoId, { tier: props.tier });
  return (
    <EscenaBase3D {...props} cielo={cielo} entrada={{ ...props.entrada, centro: [0, 0.5, 0] }}>
      <Diorama
        params={props.params}
        reducedMotion={props.reducedMotion}
        tier={props.tier}
        fauna={fauna}
        estadoFinca={props.estadoFinca}
      />
    </EscenaBase3D>
  );
}
