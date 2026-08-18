// ── criaturas/index.js — EL REGISTRO DE LOS SIETE COMPAÑEROS ────────────────
//
// Los siete son canónicos. Tres ya están modelados; los otros cuatro entran
// SIN tocar el visor: se les escribe su `construir()` en un archivo hermano y
// se cambia `construir: null` por la función. Nada más.
//
// CONTRATO que devuelve cada `construir()`:
//   {
//     grupo: THREE.Group,          // la malla, en las unidades que le sirvan
//     metrosPorUnidad: number,     // para que la regla del piso no mienta
//     puntos: [                    // ⚠️ las posiciones SE MIDEN sobre la malla
//       { id, etiqueta, descripcion, posicion:[x,y,z] }
//     ]
//   }
// y la ficha (nombre, nombreCientifico, rol, tamano, estado, donde) vive aquí.
// Para sumar una cuarta criatura: modelarla con anatomia.js, devolver sus
// puntos medidos sobre anclas y dejar su ficha grafo-compatible sin inventar
// los campos que no existan.
//
// CIENCIA: si un dato no está firme, no está. Preferimos una ficha corta antes
// que una ficha con un número inventado. Por eso a la angelita no se le pone
// categoría de riesgo: no tiene evaluación formal que podamos citar.

import { construirOso } from './oso.js';
import { construirJaguar } from './jaguar.js';
import { construirAngelita } from './angelita.js';
import { construirZariguella } from './zariguella.js';
import { construirGuacamaya } from './guacamaya.js';
import { construirChivito } from './chivito.js';
import { construirLuciernaga } from './luciernaga.js';

export const BESTIARIO = [
  {
    id: 'oso',
    nombre: 'Oso andino',
    nombreCientifico: 'Tremarctos ornatus',
    apodo: 'El guardián del bosque alto',
    rol: 'Camina despacio y sabe dónde está el agua. Es el único oso de Suramérica y la especie sombrilla de estos cerros: donde queda territorio para él, queda bosque conectado, páramo sano y nacimiento de agua. Come sobre todo planta y fruto, y al moverse va sembrando el bosque que se comió.',
    tamano: 'Hembras 35–80 kg · machos 100–175 kg · unos 70–90 cm a la cruz',
    estado: 'UICN: Vulnerable',
    donde: 'Bosque andino y páramo, desde Venezuela hasta Bolivia',
    construir: construirOso,
  },
  {
    id: 'jaguar',
    nombre: 'Jaguar',
    nombreCientifico: 'Panthera onca',
    apodo: 'El que aparece y desaparece',
    rol: 'Conoce el monte de noche. Es el felino más grande de América y el tope de la cadena: si hay jaguar hay presas, y si hay presas hay monte grande y entero. No se cuenta viéndolo — se cuenta por las rosetas, que son distintas en cada individuo.',
    tamano: '45–100 kg · 1,1–1,8 m de cuerpo + 45–75 cm de cola',
    estado: 'UICN: Casi amenazado',
    donde: 'Selva, bosque y humedal, del norte de México al norte de Argentina',
    construir: construirJaguar,
  },
  {
    id: 'angelita',
    nombre: 'Abeja angelita',
    nombreCientifico: 'Tetragonisca angustula',
    apodo: 'La abeja de la casa',
    rol: 'Sabe qué está floreciendo. No tiene aguijón, así que vive en un tronco o una caja en el patio sin problema con nadie. Poliniza cultivo y monte nativo, y su miel —más líquida y más ácida que la de la abeja europea— se guarda como remedio de casa. Es el sensor vivo de la finca: lo que entra al nido cuenta qué floreció esta semana.',
    tamano: '4–5 mm',
    estado: null,
    donde: 'De México al norte de Argentina; en casa, en tronco hueco o caja',
    construir: construirAngelita,
  },

  /* ── LOS CUATRO QUE SIGUEN ────────────────────────────────────────────────
     La ficha ya está escrita y verificada; falta el `construir()`. `partes`
     deja anotado qué puntos calientes tiene que devolver ese generador, para
     que quien lo escriba no tenga que decidir el guion otra vez. ─────────── */
  {
    id: 'zariguella',
    nombre: 'Zarigüeya',
    nombreCientifico: 'Didelphis sp.',
    apodo: 'La que ronda la huerta de noche',
    rol: 'Se come la plaga mientras todos duermen, y carga a las crías al lomo mientras trabaja. Es marsupial: las crías terminan de formarse pegadas a la madre, no adentro.',
    tamano: 'Del tamaño de un gato, con cola casi tan larga como el cuerpo',
    estado: null,
    donde: 'Toda América tropical, y muy bien en el borde de la finca',
    construir: construirZariguella,
    partes: ['cola prensil', 'marsupio', 'hocico y dentadura', 'pulgar oponible del pie', 'orejas desnudas'],
  },
  {
    id: 'guacamaya',
    nombre: 'Guacamaya',
    nombreCientifico: 'Ara sp.',
    apodo: 'La que trae semillas de otras laderas',
    rol: 'Vuela lejos todos los días entre dormidero y comedero, y en ese viaje mueve semillas de un lado del valle al otro. Donde vuela, el bosque se vuelve a coser.',
    tamano: 'Hasta cerca de 1 m de largo total, con la cola',
    estado: null,
    donde: 'Bosque húmedo y borde de bosque; anida en huecos de árbol viejo',
    construir: construirGuacamaya,
    partes: ['pico ganchudo', 'cola larga', 'pata zigodáctila', 'piel desnuda de la cara', 'plumas de vuelo'],
  },
  {
    id: 'chivito',
    nombre: 'Chivito de páramo',
    nombreCientifico: 'Oxypogon sp.',
    apodo: 'El pájaro del páramo',
    rol: 'Colibrí de altura, de los que viven donde ya casi no hay árbol. Se le ve en el frailejón. Avisa antes de que cambie el tiempo — cuando baja la nube, baja él.',
    tamano: 'Unos 10–12 cm, cresta y barba incluidas',
    estado: null,
    donde: 'Páramo de los Andes del norte, entre frailejones',
    construir: construirChivito,
    partes: ['cresta', 'barba', 'pico recto', 'alas de batido rápido', 'lengua'],
  },
  {
    id: 'luciernaga',
    nombre: 'Luciérnaga',
    nombreCientifico: 'Familia Lampyridae',
    apodo: 'La que se enciende',
    rol: 'Se enciende cuando algo vale la pena mirar de cerca. Es un escarabajo, no una mosca: la luz la hace en el abdomen con una reacción química, casi sin calor, y con ella se habla con las otras. Donde hay luciérnaga hay poca luz artificial y poco veneno.',
    tamano: 'Casi siempre menos de 2 cm',
    estado: null,
    donde: 'Borde de monte, rastrojo y quebrada, de noche',
    construir: construirLuciernaga,
    // A un bicho cuya seña es LUZ PROPIA no se lo juzga a mediodía: el visor
    // baja el rig a crepúsculo cuando la criatura lo declara.
    penumbra: true,
    partes: ['linterna del abdomen', 'élitros', 'antenas', 'ojos grandes'],
  },
];

export const porId = (id) => BESTIARIO.find((c) => c.id === id) || null;
export const listos = () => BESTIARIO.filter((c) => typeof c.construir === 'function');
