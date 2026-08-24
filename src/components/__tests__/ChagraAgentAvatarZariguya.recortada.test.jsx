/**
 * ChagraAgentAvatarZariguya.recortada.test.jsx — la CARA del agente zarigüeya
 * es la LÁMINA RECORTADA POR ALFA (ZariguyaLaminaViva), no el vector ni el
 * auto-trazado vtracer (rechazado en vivo por el operador 2026-08-23: "no se
 * ve limpia, manchas blancas en el bigote, el contorno raro").
 *
 * Blinda el patrón del port (mismo que oso del bastón / jaguar): el adaptador
 * traduce state → estado directo y pasa el visema del lip-sync, sin traducir
 * a pose/husmea.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import ChagraAgentAvatarZariguya from '../ChagraAgentAvatarZariguya.jsx';

// La lámina recortada hornea capas por canvas en useEffect; en jsdom no hay
// canvas y degrada a fotograma digno. Aquí se verifica SOLO el contrato del
// adaptador (que renderice la recortada con el estado y el rótulo correctos),
// con un doble ligero que preserva las props que importan.
vi.mock('../../visual/creatures/ZariguyaLaminaViva', () => ({
  default: ({ estado, visema, title }) => (
    <div
      data-test="recortada"
      role="img"
      aria-label={title}
      data-agt-estado={estado}
      data-visema={visema || undefined}
    />
  ),
}));

afterEach(cleanup);

describe('ChagraAgentAvatarZariguya — la cara es la lámina recortada', () => {
  it('renderiza la recortada (no el vector ni el trazado)', () => {
    const { container } = render(<ChagraAgentAvatarZariguya state="idle" ariaLabel="Chagra IA" />);
    const n = container.querySelector('[data-test="recortada"]');
    expect(n).toBeTruthy();
    expect(n.getAttribute('aria-label')).toBe('Chagra IA');
    expect(n.getAttribute('data-agt-estado')).toBe('idle');
  });

  it('traduce state → estado directo (idle/thinking/speaking/listening)', () => {
    for (const s of ['idle', 'thinking', 'speaking', 'listening']) {
      const { container } = render(<ChagraAgentAvatarZariguya state={s} />);
      expect(container.querySelector('[data-test="recortada"]').getAttribute('data-agt-estado')).toBe(s);
      cleanup();
    }
  });

  it('speaking pasa el visema del lip-sync a la cara', () => {
    const { container } = render(<ChagraAgentAvatarZariguya state="speaking" />);
    expect(container.querySelector('[data-test="recortada"]').getAttribute('data-visema')).toBe('V2');
  });

  it('con onClick envuelve en un botón real (teclado + lector de pantalla)', () => {
    const { container } = render(
      <ChagraAgentAvatarZariguya state="idle" onClick={() => {}} ariaLabel="Elegir zarigüeya" />,
    );
    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-label')).toBe('Elegir zarigüeya');
    expect(btn.querySelector('[data-test="recortada"]')).toBeTruthy();
  });
});
