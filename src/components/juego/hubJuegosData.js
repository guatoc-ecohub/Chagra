/*
 * hubJuegosData — el CATÁLOGO de la sala de juegos (HubJuegos).
 *
 * Cada juego es una ruta REAL del manifiesto de prod (rutasProdChagraApp.js);
 * aquí solo vive su cartel: título, práctica agroecológica que enseña
 * (`ensena`, el letrero pedagógico — no decoración), detalle corto en usted,
 * la criatura rubber-hose protagonista y el tinte RGB del cartel.
 *
 * Vive aparte del componente por la regla react-refresh (un archivo de
 * componentes no exporta constantes) y para que el catálogo sea testeable.
 *
 * i18n: copy servido solo en es-CO (mismo criterio que los juegos que nombra).
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { Colibri } from '../../visual/creatures/Colibri.jsx';
import { Escarabajo } from '../../visual/creatures/Escarabajo.jsx';
import { Lombriz } from '../../visual/creatures/Lombriz.jsx';
import { RanaAndina } from '../../visual/creatures/RanaAndina.jsx';
import { Jaguar } from '../../visual/creatures/Jaguar.jsx';
import { Morrocoy } from '../../visual/creatures/Morrocoy.jsx';
import { Danta } from '../../visual/creatures/Danta.jsx';
import { Perezoso } from '../../visual/creatures/Perezoso.jsx';
import { Ardilla } from '../../visual/creatures/Ardilla.jsx';

/**
 * @type {Array<{id: string, view: string, titulo: string, ensena: string,
 *   detalle: string, Criatura: (props: any) => any, tinte: string}>}
 */
export const JUEGOS_CHAGRA = [
  {
    id: 'mi-finca-viva',
    view: 'juego',
    titulo: 'Mi Finca Viva',
    ensena: 'La finca que evoluciona',
    detalle:
      'Su finca de verdad se vuelve un mundo que florece: criaturas, misiones e insignias que salen de sus propios registros.',
    Criatura: Colibri,
    tinte: '52, 211, 153',
  },
  {
    id: 'defensores',
    view: 'defensores',
    titulo: 'Defensores de la Finca',
    ensena: 'Control biológico',
    detalle:
      'Corra y salte por la ladera soltando los bichos buenos que controlan a las plagas, sin un solo veneno.',
    Criatura: Escarabajo,
    tinte: '45, 212, 191',
  },
  {
    id: 'milpa',
    view: 'milpa',
    titulo: 'La Milpa',
    ensena: 'Asociaciones de cultivo',
    detalle:
      'Siembre maíz, fríjol y ahuyama juntos — las tres hermanas — y mire cómo rinden más que cada uno por su lado.',
    Criatura: Ardilla,
    tinte: '163, 230, 53',
  },
  {
    id: 'doom-finca',
    view: 'doom_finca',
    titulo: 'Doom de la Finca',
    ensena: 'Manejo de plagas',
    detalle:
      'Recorra el invernadero en primera persona, identifique la plaga y lance el controlador biológico correcto.',
    Criatura: RanaAndina,
    tinte: '251, 146, 60',
  },
  {
    id: 'subsuelo',
    view: 'subsuelo',
    titulo: 'Mundo Subsuelo',
    ensena: 'Suelo vivo',
    detalle:
      'Baje bajo sus botas: alimente la tierra con compost, conecte raíces con hongos y despierte a las lombrices.',
    Criatura: Lombriz,
    tinte: '34, 211, 238',
  },
  {
    id: 'finca-odyssey',
    view: 'finca_odyssey',
    titulo: 'Mi finca en 3D',
    ensena: 'Riego y cuidado',
    detalle:
      'Cruce el túnel mágico a su finca en tres dimensiones y aterrice en el huerto a cuidar el riego y las abejas.',
    Criatura: Danta,
    tinte: '129, 140, 248',
  },
  {
    id: 'rescate-ladera',
    view: 'metal_slug_campo',
    titulo: 'Rescate en la ladera',
    ensena: 'Plagas y fauna silvestre',
    detalle:
      'Acción de plataforma: controle plagas reales con el organismo benéfico correcto y libere la fauna cazada.',
    Criatura: Jaguar,
    tinte: '245, 158, 11',
  },
  {
    id: 'mono-vs-poli',
    view: 'mono_vs_poli',
    titulo: '¿Mono o poli?',
    ensena: 'Datos con fuente',
    detalle:
      'Compare monocultivo contra policultivo con cifras medidas de verdad: rendimiento, nitrógeno y control de plaga.',
    Criatura: Morrocoy,
    tinte: '167, 139, 250',
  },
  {
    id: 'monte-vuelve',
    view: 'monte_vuelve',
    titulo: 'El monte vuelve',
    ensena: 'Restauración ecológica',
    detalle:
      'Camine los años de un potrero que vuelve a ser monte: qué llega primero, qué llega después y por qué.',
    Criatura: Perezoso,
    tinte: '74, 222, 128',
  },
];

/* Las criaturas del mostrador del toldo (hero y banner) — los obreros del
   suelo, asomados y vivos. */
export const PORTEROS_SALA = [
  { Criatura: Escarabajo, size: 44 },
  { Criatura: Lombriz, size: 40 },
  { Criatura: RanaAndina, size: 46 },
];
