/*
 * Gestos de idle para animales de la finca. Cada gesto recibe el grupo que
 * anima, el tiempo transcurrido y una fase estable por instancia.
 */

export const GESTOS = Object.freeze({
  pasta: (g, t, fase) => {
    g.rotation.z = -0.15 - (Math.sin(t * 0.55 + fase) * 0.5 + 0.5) * 0.55;
  },
  picotea: (g, t, fase) => {
    const c = (Math.sin(t * 2.4 + fase) + 1) / 2;
    g.rotation.z = -Math.pow(c, 4) * 0.9;
  },
  hocica: (g, t, fase) => {
    const c = Math.max(0, Math.sin(t * 1.1 + fase));
    g.rotation.z = -(c ** 4) * 0.35;
  },
  mira: (g, t, fase) => {
    g.rotation.y = Math.sin(t * 0.4 + fase) * 0.45;
    g.rotation.x = Math.sin(t * 0.23 + fase * 2) * 0.1;
  },
  tantea: (g, t, fase) => {
    g.rotation.z = -0.1 - (Math.sin(t * 0.7 + fase) * 0.5 + 0.5) * 0.35;
  },
  sigueCerda: (g, t, fase, cerdaPos, desplazamiento, giro = 0) => {
    const paso = Math.sin(t * 1.6 + fase) * 0.09;
    const lado = Math.cos(t * 1.2 + fase) * 0.045;
    g.position.x = cerdaPos[0] + desplazamiento[0] + paso;
    g.position.y = cerdaPos[1] + desplazamiento[1];
    g.position.z = cerdaPos[2] + desplazamiento[2] + lado;
    g.rotation.y = giro + paso * 1.8;
  },
});
