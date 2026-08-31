/*
 * API pública de comportamientos para cualquier compai visual.
 * La identidad y el dibujo siguen en cada creature. Esta capa solo compone
 * conducta, estados y gates, sin duplicar keyframes ni geometría.
 */
import { idleDeCreature } from './idle.js';
import { cuerpoDeClima, ropaDeClimaBicho } from './clima.js';
import { visemaDesdeRMS, VISEMA } from './lipsync.js';
import { aplicarRubberhose } from './rubberhose.js';
import { resolverPoliticaR1R5 } from './politica.js';
import { aplicarGesto } from './gestos.js';

export * from './gestos.js';
export * from './idle.js';
export * from './clima.js';
export * from './lipsync.js';
export * from './poder.js';
export * from './rubberhose.js';
export * from './politica.js';
export * from './transicion.js';

function slugDeCriatura(criatura) {
  if (typeof criatura === 'string') return criatura;
  return criatura?.slug || criatura?.id || 'abeja-angelita';
}

/** Compone todos los comportamientos compartidos en un snapshot declarativo. */
export function aplicarComportamientos(criatura, {
  idle = {},
  clima = {},
  lipsync = {},
  gestos = {},
  politica = {},
} = {}) {
  const slug = slugDeCriatura(criatura);
  const activo = idle.activo ?? idle.animated ?? true;
  const cuerpo = cuerpoDeClima(clima.estado ?? clima.clima ?? null, {
    enso: clima.enso,
    tier: clima.tier,
    perfil: clima.perfil,
  });
  const ropa = clima.vestuario
    ? ropaDeClimaBicho(slug, clima.estado ?? clima.clima ?? null, { tempC: clima.tempC })
    : null;
  const visema = lipsync.visema
    || (Number.isFinite(lipsync.rms) ? visemaDesdeRMS(lipsync.rms) : null);
  const pose = aplicarGesto(gestos.pose || 'vuela', { activo });

  return Object.freeze({
    criatura: slug,
    idle: idleDeCreature(idle.tiempo ?? idle.t ?? 0, {
      especie: slug,
      semilla: idle.semilla,
      hora: idle.hora,
      reducedMotion: idle.reducedMotion,
      tier: idle.tier,
      llegadaHace: idle.llegadaHace,
    }),
    clima: Object.freeze({ ...cuerpo, ropa }),
    lipsync: Object.freeze({
      visema: visema || null,
      hablando: Boolean(lipsync.hablando),
      cerrado: !visema || visema === VISEMA.CERRADA,
    }),
    gestos: Object.freeze({
      pose,
      animo: gestos.animo ?? 'sereno',
      energia: gestos.energia ?? 1,
      mojada: Boolean(gestos.mojada),
      sed: Boolean(gestos.sed),
      comiendo: Boolean(gestos.comiendo),
      polen: Boolean(gestos.polen),
      gafas: gestos.gafas || false,
      cejas: gestos.cejas || null,
      mundoId: gestos.mundoId || null,
      poder: Boolean(gestos.poder),
      lineBoil: Boolean(gestos.lineBoil),
    }),
    rubberhose: aplicarRubberhose({ activo, tier: idle.tier }),
    politica: resolverPoliticaR1R5(politica),
  });
}

export default aplicarComportamientos;
