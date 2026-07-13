import { BadgeCheck, AlertTriangle, OctagonAlert, Sprout } from 'lucide-react';
import { NIVEL_REPUTACION } from '../../services/red';

/**
 * reputacionCopy — el vocabulario visual del semáforo de reputación de la RED
 * humana. Vive aparte de los componentes (regla react-refresh: un archivo de
 * componente solo exporta componentes) para que ReputacionCard y
 * PreguntarVecinoPanel hablen el MISMO idioma verde/ámbar/rojo.
 *
 * Espeja el idioma del SemaforoConfianza del agente, pero para un actor
 * humano: aquí el color resume HECHOS de entrega del mercado, no curaduría de
 * fuentes. `nuevo` es honestidad, no castigo.
 */
export const NIVEL_REPUTACION_COPY = Object.freeze({
  [NIVEL_REPUTACION.NUEVO]: {
    label: 'Vecino nuevo en la red',
    Icon: Sprout,
    chip: 'bg-slate-700/60 text-slate-300 border-slate-600',
  },
  [NIVEL_REPUTACION.VERDE]: {
    label: 'Entrega cumplida',
    Icon: BadgeCheck,
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  },
  [NIVEL_REPUTACION.AMBAR]: {
    label: 'Conviene confirmar',
    Icon: AlertTriangle,
    chip: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  },
  [NIVEL_REPUTACION.ROJO]: {
    label: 'Con fallas de entrega',
    Icon: OctagonAlert,
    chip: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  },
});

/** El porqué del semáforo, en palabras de la finca (motivo de redReputation). */
export const MOTIVO_REPUTACION_COPY = Object.freeze({
  sin_historial_suficiente:
    'Todavía no tiene tratos suficientes en la red para calificarlo. Eso no es malo: es honesto.',
  entrega_pareja:
    'Ha entregado parejo en los tratos de la red, y con buena calidad cuando la calificaron.',
  entrega_parcial:
    'Ha cumplido en parte. Antes de cerrar un trato grande, confirme con él la entrega.',
  calidad_dispareja:
    'Entrega, pero la calidad que le han calificado ha sido dispareja.',
  fallas_de_entrega:
    'Registra fallas de entrega en tratos de la red. Confirme bien antes de comprometerse.',
});
