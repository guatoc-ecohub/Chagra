/*
 * AtmosferaMundo — la ATMÓSFERA compartida como componente DROP-IN para cualquier
 * `<Canvas>` (no solo los dioramas de EscenaBase3D).
 *
 * Pinta EXACTAMENTE los mismos `<color>`, `<fog>`, luces, estrellas y sombras de
 * contacto que `EscenaBase3D` monta para la familia de dioramas — mismos colores
 * (mezcla 60% hacia la hora madre del valle), mismos multiplicadores de luz,
 * mismo bloom de sombra — pero SUELTO, para que las escenas de "mundo vivo"
 * (bosque, cacao, cafetal, papa, sierra) que arman su propio Canvas dejen de
 * clavar un cielo estático y HEREDEN el ciclo diurno vivo y la paleta del valle.
 *
 * Uso (dentro del `<Canvas>` de la escena, reemplazando su `<color>`/luces):
 *
 *   <AtmosferaMundo familia="sotobosque" tier={tier} reducedMotion={rm} radio={7} />
 *
 * Tier-safe: en 'bajo' (frugal) apaga niebla, estrellas y alfombras (overdraw) —
 * el mismo contrato de costo que EscenaBase3D. `radio` es la escala de la escena
 * (la distancia cámara↔centro): escala el near/far de la niebla y el tamaño de
 * las alfombras de contacto para que el velo caiga donde debe.
 */
import { Stars } from '@react-three/drei';
import { perfilDeTier } from '../deviceTier.js';
import { SombraContacto } from '../escenas/SombraContacto.jsx';
import { useAtmosferaMundo } from './atmosfera.js';

/**
 * @param {object} props
 * @param {string} [props.familia='neutro']  clave de CIELOS (atmosferaMadre):
 *   neutro | agua | tierra | corral | plaza | huerta | sotobosque | ladera | alba.
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']  device-tier (presupuesto).
 * @param {boolean} [props.reducedMotion=false]  quieta (apaga el día acelerado y
 *   la rotación de estrellas).
 * @param {number} [props.radio=6.5]  escala de la escena (cámara↔centro); escala
 *   niebla y alfombras de contacto.
 * @param {number} [props.piso=0]  altura Y del suelo (posa las alfombras).
 * @param {boolean} [props.conSuelo=true]  monta las alfombras de contacto que
 *   "posan" el diorama. Póngalo en false si la escena ya trae su propio suelo.
 * @param {boolean} [props.conNiebla=true]  monta la niebla de profundidad.
 * @param {boolean} [props.conEstrellas=true]  deja asomar las estrellas de noche.
 * @param {{left:number,right:number,top:number,bottom:number,far:number}|null}
 *   [props.sombra=null]  frustum de sombra a medida de la escena (el contrato de
 *   LuzMadre): cuando viene Y el tier lo permite (perfil.sombras, solo 'alto'),
 *   el sol de la franja proyecta shadow-map real — la luz colada del sombrío que
 *   los mundos de cultivo no pueden perder. Sin `sombra`, cero shadow-map (el
 *   costo de siempre).
 */
export default function AtmosferaMundo({
  familia = 'neutro',
  tier = 'alto',
  reducedMotion = false,
  radio = 6.5,
  piso = 0,
  conSuelo = true,
  conNiebla = true,
  conEstrellas = true,
  sombra = null,
}) {
  const atm = useAtmosferaMundo({ familia, reducedMotion });
  const frugal = tier === 'bajo';
  const perfil = perfilDeTier(tier);
  const conSombra = !!(sombra && perfil.sombras);

  return (
    <>
      <color attach="background" args={[atm.fondo]} />
      {conNiebla && !frugal && (
        <fog attach="fog" args={[atm.niebla, radio * 1.4, radio * 4.6]} />
      )}
      <hemisphereLight intensity={0.55 * atm.intensidad} color={atm.cielo} groundColor={atm.suelo} />
      <ambientLight intensity={0.28 * atm.intensidad} color={atm.luz} />
      {/* El sol de la franja — mismo arco que el valle (rasante al amanecer,
          cenital al mediodía, luna de noche): el lenguaje de sombreado no cambia
          al entrar al mundo. Con `sombra` (y tier alto) proyecta shadow-map. */}
      <directionalLight
        position={atm.solPos}
        intensity={0.9 * atm.intensidad}
        color={atm.luz}
        castShadow={conSombra}
        {...(conSombra
          ? {
              'shadow-mapSize': [1024, 1024],
              'shadow-camera-far': sombra.far ?? 30,
              'shadow-camera-left': sombra.left ?? -12,
              'shadow-camera-right': sombra.right ?? 12,
              'shadow-camera-top': sombra.top ?? 12,
              'shadow-camera-bottom': sombra.bottom ?? -12,
            }
          : null)}
      />
      {/* Relleno frío tenue desde el lado opuesto: despega los volúmenes del
          fondo cálido sin matar el contraste (clave del look claymation). */}
      <directionalLight position={[-5, 4, -6]} intensity={0.22} color={atm.relleno} />

      {conEstrellas && atm.estrellas > 0 && !frugal && (
        <Stars
          radius={radio * 8}
          depth={30}
          count={Math.round(perfil.estrellas * atm.estrellas)}
          factor={3}
          saturation={0}
          fade
          speed={reducedMotion ? 0 : 0.5}
        />
      )}

      {conSuelo && !frugal && (
        <>
          <SombraContacto
            refExt={undefined}
            pos={[0, piso + 0.008, 0]}
            radio={radio * 0.68}
            color={atm.alfombra}
            opacidad={0.5}
            orden={1}
          />
          <SombraContacto
            refExt={undefined}
            pos={[0, piso + 0.02, 0]}
            radio={radio * 0.4}
            color={atm.sombra}
            opacidad={0.3}
            orden={2}
          />
        </>
      )}
    </>
  );
}
