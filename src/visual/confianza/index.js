/*
 * confianza/ — EL LENGUAJE VISUAL DE LA CONFIANZA en una sola puerta.
 *
 * Chagra prefiere decir "no sé" antes que inventar, y este módulo hace esa
 * honestidad VISIBLE sin un porcentaje ni una gráfica: el hilo que cose cada
 * respuesta a su saber (firme / hilván / suelto / rematado en nudo), la marca
 * de origen (su finca con raíz honda vs saber general), la cita como etiqueta
 * de herbario, el "no sé" con letreros de camino, la advertencia que pesa
 * como piedra y la guarda tejida del saber campesino.
 *
 * Habla el MISMO idioma que las superficies ya aprobadas — el halo de
 * Angelita (visual/agente) y el sello semáforo del chat (SemaforoConfianza +
 * sello-confianza.css) — y los mapeos entre los tres viven en
 * confianzaTokens.js (nivelDelHilo / halo / semaforo). Presentacional puro:
 * nada aquí consulta servicios ni estado global.
 *
 *   import {
 *     TrazoConfianza, MarcaOrigen, FichaFuente,
 *     NoSeHonesto, AdvertenciaPeso, SaberTradicion,
 *     NIVELES_CONFIANZA, nivelDelHilo, ORIGENES_SABER, origenDelSaber,
 *   } from '../visual/confianza';
 */
export { default as TrazoConfianza } from './TrazoConfianza.jsx';
export { default as MarcaOrigen } from './MarcaOrigen.jsx';
export { default as FichaFuente } from './FichaFuente.jsx';
export { default as NoSeHonesto } from './NoSeHonesto.jsx';
export { default as AdvertenciaPeso } from './AdvertenciaPeso.jsx';
export { default as SaberTradicion } from './SaberTradicion.jsx';
export { default as GaleriaConfianza } from './GaleriaConfianza.jsx';

export {
  NIVELES_CONFIANZA,
  ORDEN_NIVELES,
  nivelDelHilo,
  ORIGENES_SABER,
  origenDelSaber,
  TIPOS_FUENTE,
  PESO_ADVERTENCIA,
} from './confianzaTokens.js';

/* Registro de categoría (mismo contrato que CREATURES/LAMINAS/SCENES): la
   vitrina visual-lib puede publicarlo sin adivinar contratos. Se declara
   aquí para que cablearlo en visual/registry.js sea UNA línea futura. */
import TrazoConfianza from './TrazoConfianza.jsx';
import MarcaOrigen from './MarcaOrigen.jsx';
import FichaFuente from './FichaFuente.jsx';
import NoSeHonesto from './NoSeHonesto.jsx';
import AdvertenciaPeso from './AdvertenciaPeso.jsx';
import SaberTradicion from './SaberTradicion.jsx';
import GaleriaConfianza from './GaleriaConfianza.jsx';

export const CONFIANZA = [
  {
    slug: 'trazo-confianza',
    nombre: 'El hilo de la confianza',
    Componente: TrazoConfianza,
    que: 'subrayado cosido: firme / hilván / suelto / rematado en nudo con señal',
    variantes: [
      { label: 'alta (firme)', props: { nivel: 'alta' } },
      { label: 'media (hilván)', props: { nivel: 'media' } },
      { label: 'baja (suelto)', props: { nivel: 'baja' } },
      { label: 'honesta (nudo + camino)', props: { nivel: 'honesta' } },
    ],
  },
  {
    slug: 'marca-origen',
    nombre: 'Marca de origen del saber',
    Componente: MarcaOrigen,
    que: 'de su finca (raíz honda) / con fuente / saber general / saber de la gente',
    variantes: [
      { label: 'de su finca', props: { origen: 'finca' } },
      { label: 'con fuente', props: { origen: 'fuente' } },
      { label: 'saber general', props: { origen: 'general' } },
      { label: 'saber de la gente', props: { origen: 'tradicion' } },
    ],
  },
  {
    slug: 'ficha-fuente',
    nombre: 'Ficha de fuente (herbario)',
    Componente: FichaFuente,
    que: 'la cita como objeto tocable: etiqueta de papel con ojal, cordel y pliego',
    variantes: [
      {
        label: 'con enlace',
        props: {
          titulo: 'Manejo del gusano blanco',
          tipo: 'agrosavia',
          detalle: 'Manejo integrado para papa en clima frío.',
          url: 'https://www.agrosavia.co',
        },
      },
      {
        label: 'registro de la finca',
        props: { titulo: 'Lote La Loma — mayo', tipo: 'finca', detalle: 'Sale de sus propios registros.' },
      },
    ],
  },
  {
    slug: 'no-se-honesto',
    nombre: 'El "no sé" digno',
    Componente: NoSeHonesto,
    que: 'honestidad con letreros de camino: no sé, y le digo a dónde ir',
    variantes: [
      {
        label: 'con caminos',
        props: {
          children: 'No tengo ese número guardado y no se lo voy a inventar.',
          caminos: [{ label: 'La UMATA de su municipio', detalle: 'pregunte por el técnico' }],
        },
      },
    ],
  },
  {
    slug: 'advertencia-peso',
    nombre: 'Advertencia con peso',
    Componente: AdvertenciaPeso,
    que: 'riesgo real (veneno, zoonosis): tinta gruesa, banda cochinilla, piedra asentada',
    variantes: [
      {
        label: 'dosis',
        props: { titulo: 'No duplique la dosis', children: 'Aumenta el riesgo de intoxicación.' },
      },
    ],
  },
  {
    slug: 'saber-tradicion',
    nombre: 'Saber de la gente (guarda tejida)',
    Componente: SaberTradicion,
    que: 'tradición sin descalificar: ni verdad ni mentira — envuelta en textil',
    variantes: [
      { label: 'menguante', props: { children: 'Dicen los mayores que sembrar en menguante da matas más fuertes.' } },
    ],
  },
  {
    slug: 'galeria-confianza',
    nombre: 'Vitrina de la confianza',
    Componente: GaleriaConfianza,
    que: 'todo el lenguaje junto, con textos reales del carácter de Chagra',
    variantes: [{ label: 'completa', props: {} }],
  },
];
