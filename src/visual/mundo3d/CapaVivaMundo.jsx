/*
 * CapaVivaMundo — LA capa viva del mundo 3D: compone en un solo grupo montable
 * los efectos vivos que ya existen en dev (no los re-implementa, los IMPORTA):
 *
 *   · ParticulasAmbientales — el aire por defecto (polen de hora dorada) y sus
 *     variantes según el clima REAL de estadoFinca (luciérnagas de noche,
 *     polvo en la niebla, mariposas de día). Sin dato de clima → polen sereno.
 *   · MomentosFinca (MomentoNace / MomentoCosecha / MomentoVende) — beats que
 *     celebran que el DATO REAL cambió, detectado observando estadoFinca entre
 *     renders (nunca al cargar: ver VENTANA_CARGA_MS).
 *   · HotspotFeedback — halo + onda + chispas sobre el hotspot ACTIVO.
 *
 *   (CielosHora.jsx no existe en dev a la fecha de esta capa; cuando aterrice,
 *    se compone aquí mismo. MomentoCrece queda importable por el host para
 *    beats por-mata: esta capa no tiene la posición de matas individuales.)
 *
 * CABLEO (UNA línea, dentro del <Canvas> de EscenaBase3D / la escena-mundo;
 * esta capa NO toca EscenaBase3D ni Mundo ni las escenas):
 *
 *   <CapaVivaMundo estadoFinca={estadoFinca} hotspots={hotspots} mundoId={mundoId} tier={tier} reducedMotion={reducedMotion} />
 *
 *   - `estadoFinca` viene de useFincaViva() (el espejo vivo del dato real).
 *   - `hotspots` es la lista del mundo (mundoData: { id, pos, ... }); el activo
 *     se indica con `hotspotActivoId` (o con `activo: true` en el hotspot).
 *   - `tier`/`reducedMotion` vienen de decidirTier() como en todo el framework.
 *   - `activo={false}` apaga la capa entera (transiciones, mundos dormidos).
 *
 * CONTRATO ANTI-FABRICACIÓN (el mismo de useFincaViva): sin dato → nada
 * inventado, capa tranquila:
 *   · Los MOMENTOS solo corren cuando un valor REAL cambió entre dos
 *     observaciones reales DESPUÉS de la ventana de carga (la primera aparición
 *     de un dato es el cache calentando, no un hecho de hoy → no se celebra).
 *   · MomentoNace: matasTotal (conteo real de buildFincaScene) SUBIÓ.
 *   · MomentoCosecha: cambió el cultivo de cosechaReciente (dato real del
 *     store de cosecha).
 *   · MomentoVende: escucha `estadoFinca.ventaReciente` (dato EN CAMINO —
 *     useFincaViva aún no lo emite; hasta entonces este beat nunca corre).
 *   · El feedback de hotspot solo existe si hay hotspot activo señalado.
 *   · Las partículas son ambiente estético (aire, no afirmación de dato); su
 *     única lectura de dato es el clima real, y sin clima caen al polen base.
 *
 * Presupuesto: las partículas son 1-3 draw calls por nube (ver
 * ParticulasAmbientales); los momentos solo montan mientras su beat está vivo;
 * HotspotFeedback inactivo se apaga solo (visible=false, costo ~0).
 * reduced-motion y tier viajan a cada pieza, que ya sabe aquietarse.
 *
 * ESLint: ningún ref se lee durante render (solo en efectos); los flancos del
 * dato se detectan en useEffect y viven en estado React.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MomentoNace, MomentoCosecha, MomentoVende } from './MomentosFinca.jsx';
import HotspotFeedback from './HotspotFeedback.jsx';
import { ParticulasAmbientales } from './ParticulasAmbientales.jsx';

/*
 * Ventana de carga: cambios de estadoFinca dentro de este lapso tras montar se
 * leen como "el cache/stores calentando" (null → dato), NO como un hecho que
 * acaba de pasar en la finca. Solo después se celebran flancos.
 */
const VENTANA_CARGA_MS = 4000;

/* Ancla local de los momentos (referencia estable: r3f no re-aplica). */
/** @type {[number, number, number]} */
const ANCLA_MOMENTOS = [0, 0, 0];

/* Siembra determinista por mundo: cada mundo respira con su propia nube. */
function semillaDeMundo(mundoId) {
  const s = String(mundoId || 'valle');
  let h = 9;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h + 1;
}

/*
 * El AIRE según el clima real ('dorada'|'soleado'|'niebla'|'lluvia'|'noche').
 * Sin dato de clima → polen de hora dorada (el default sereno de la casa).
 * Lluvia → aire limpio (partículas flotando bajo el aguacero leen falso).
 */
function nubesDeClima(clima) {
  if (clima === 'lluvia') return [];
  if (clima === 'noche') return [{ tipo: 'luciernagas', densidad: 0.9 }];
  if (clima === 'niebla') return [{ tipo: 'polvo', densidad: 0.8 }];
  if (clima === 'dorada') {
    return [
      { tipo: 'polen', densidad: 1 },
      { tipo: 'luciernagas', densidad: 0.5 },
      { tipo: 'mariposas', densidad: 0.7 },
    ];
  }
  // 'soleado' y sin dato: el polen base; de día también cruzan mariposas.
  const nubes = [{ tipo: 'polen', densidad: 0.8 }];
  if (clima === 'soleado') nubes.push({ tipo: 'mariposas', densidad: 0.5 });
  return nubes;
}

/**
 * CapaVivaMundo — grupo r3f montable como child del <Canvas> (EscenaBase3D ya
 * trae la luz que piden los momentos). Ver el CABLEO del header.
 *
 * @param {object} p
 * @param {object|null} p.estadoFinca   de useFincaViva() (espejo del dato real)
 * @param {Array}   [p.hotspots=[]]     hotspots del mundo ({ id, pos, ... })
 * @param {string|null} [p.mundoId]     mundo actual (varía la siembra del aire)
 * @param {'alto'|'medio'|'bajo'} [p.tier='medio']  de decidirTier()
 * @param {boolean} [p.reducedMotion=false]
 * @param {boolean} [p.activo=true]     false → la capa entera no dibuja nada
 * @param {string|null} [p.hotspotActivoId=null]  id del hotspot resaltado
 *                                      (alternativa: `activo: true` en el hotspot)
 */
export default function CapaVivaMundo({
  estadoFinca = null,
  hotspots = [],
  mundoId = null,
  tier = 'medio',
  reducedMotion = false,
  activo = true,
  hotspotActivoId = null,
}) {
  /* ── beats vivos (estado React; los flancos se detectan en el efecto) ── */
  const [beatNace, setBeatNace] = useState(null); // { clave }
  const [beatCosecha, setBeatCosecha] = useState(null); // { clave, cultivo }
  const [beatVende, setBeatVende] = useState(null); // { clave }

  /* Última observación REAL de cada señal (undefined = nunca vista). */
  const prevMatasTotal = useRef(undefined);
  const prevCultivo = useRef(undefined);
  const prevVenta = useRef(undefined);
  const nacimientoMs = useRef(null); // instante de montaje (ventana de carga)
  const contadorBeat = useRef(0);

  useEffect(() => {
    if (nacimientoMs.current == null) nacimientoMs.current = Date.now();
  }, []);

  /* Observa estadoFinca entre renders y arma el beat cuando el dato CAMBIÓ. */
  useEffect(() => {
    const caliente =
      nacimientoMs.current != null &&
      Date.now() - nacimientoMs.current > VENTANA_CARGA_MS;

    // NACE: el conteo real de matas subió (dos observaciones reales).
    const total = estadoFinca?.saludFinca?.matasTotal;
    if (Number.isFinite(total)) {
      const antes = prevMatasTotal.current;
      if (Number.isFinite(antes) && total > antes && caliente) {
        contadorBeat.current += 1;
        setBeatNace({ clave: `nace-${contadorBeat.current}` });
      }
      prevMatasTotal.current = total;
    }

    // COSECHA: cambió el cultivo cosechado más reciente (dato real, en ventana).
    const cultivo = estadoFinca?.cosechaReciente?.cultivo ?? null;
    if (prevCultivo.current !== undefined) {
      if (cultivo != null && cultivo !== prevCultivo.current && caliente) {
        contadorBeat.current += 1;
        setBeatCosecha({ clave: `cosecha-${contadorBeat.current}`, cultivo });
      }
    }
    prevCultivo.current = cultivo;

    // VENDE: dato EN CAMINO (useFincaViva aún no emite ventaReciente).
    const venta = estadoFinca?.ventaReciente?.id ?? estadoFinca?.ventaReciente ?? null;
    if (prevVenta.current !== undefined) {
      if (venta != null && venta !== prevVenta.current && caliente) {
        contadorBeat.current += 1;
        setBeatVende({ clave: `vende-${contadorBeat.current}` });
      }
    }
    prevVenta.current = venta;
  }, [estadoFinca]);

  /* ── el aire: nubes según el clima real (default: polen dorado) ── */
  const clima = estadoFinca?.clima ?? null;
  const semilla = useMemo(() => semillaDeMundo(mundoId), [mundoId]);
  const nubes = useMemo(() => nubesDeClima(clima), [clima]);

  if (!activo) return null;

  return (
    <group>
      {/* 1) EL AIRE — presencia por defecto; lo único que lee es el clima real */}
      {nubes.map((n) => (
        <ParticulasAmbientales
          key={n.tipo}
          tipo={/** @type {"polen"|"luciernagas"|"polvo"|"mariposas"} */ (n.tipo)}
          densidad={n.densidad}
          tier={tier}
          reducedMotion={reducedMotion}
          semilla={semilla}
        />
      ))}

      {/* 2) LOS MOMENTOS — solo cuando el dato real cambió (ver contrato) */}
      <group position={ANCLA_MOMENTOS}>
        <MomentoNace
          activo={!!beatNace}
          claveBeat={beatNace?.clave}
          position={/** @type {const} */ ([-0.9, 0, 0.9])}
          tier={tier}
          reducedMotion={reducedMotion}
          onFin={() => setBeatNace(null)}
        />
        <MomentoCosecha
          activo={!!beatCosecha}
          claveBeat={beatCosecha?.clave}
          position={/** @type {const} */ ([0.9, 0, 0.7])}
          tier={tier}
          reducedMotion={reducedMotion}
          onFin={() => setBeatCosecha(null)}
        />
        <MomentoVende
          activo={!!beatVende}
          claveBeat={beatVende?.clave}
          position={/** @type {const} */ ([0, 0, 1.1])}
          tier={tier}
          reducedMotion={reducedMotion}
          onFin={() => setBeatVende(null)}
        />
      </group>

      {/* 3) EL TOQUE — feedback solo sobre el hotspot señalado como activo */}
      {(Array.isArray(hotspots) ? hotspots : []).map((h) =>
        h && Array.isArray(h.pos) ? (
          <HotspotFeedback
            key={h.id}
            activo={h.activo === true || (hotspotActivoId != null && h.id === hotspotActivoId)}
            pos={/** @type {[number, number, number]} */ (h.pos)}
            tier={tier}
            reducedMotion={reducedMotion}
          />
        ) : null,
      )}
    </group>
  );
}
