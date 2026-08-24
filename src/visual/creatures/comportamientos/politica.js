/* Política de presencia R1-R5 del compai, resuelta sin efectos secundarios. */

export const POLITICA_R1_R5 = Object.freeze({
  R1: 'anclado-y-no-obstruye',
  R2: 'se-atenua-al-interactuar',
  R3: 'ensena-en-idle',
  R4: 'responde-al-toque',
  R5: 'aviso-adaptado',
});

export function resolverPoliticaR1R5({
  interactuando = false,
  hover = false,
  pressed = false,
  menuAbierto = false,
  panelAbierto = false,
  silenciado = false,
  hoyNo = false,
  ocupado = false,
  aviso = false,
  hintDisponible = false,
  anclado = true,
} = {}) {
  const puedeAtenuar = interactuando && !hover && !pressed && !menuAbierto
    && !panelAbierto && !aviso && !silenciado;
  const puedeEnsenar = !interactuando && !aviso && !silenciado && !hoyNo
    && !ocupado && !menuAbierto && !panelAbierto && hintDisponible;

  return Object.freeze({
    R1: Object.freeze({ anclado: anclado !== false, noObstruye: true }),
    R2: Object.freeze({ atenuado: Boolean(puedeAtenuar) }),
    R3: Object.freeze({ ensena: Boolean(puedeEnsenar) }),
    R4: Object.freeze({ interactivo: true, menuAbierto: Boolean(menuAbierto) }),
    R5: Object.freeze({ aviso: Boolean(aviso), prioridad: Boolean(aviso) }),
  });
}
