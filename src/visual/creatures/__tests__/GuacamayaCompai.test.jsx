import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import GuacamayaCompai from '../GuacamayaCompai.jsx';

/**
 * GuacamayaCompai — cuerpo 2.5D del compañero elegible, reusa el rig F24 del
 * valle (ver comentario del componente). NO confundir con
 * `visual/creatures/Guacamaya.jsx`, el billboard decorativo de
 * FaunaCalido.jsx (otro archivo, otro propósito). Cubre: monta el svg con el
 * contrato data-creature/role="img", el rig+defs quedaron inline (hay markup
 * real, no un placeholder vacío), y dos instancias simultáneas NO comparten
 * ids (el bug de cruce que motivó `nsRigValle.js`).
 *
 * 2026-08-21 ("guacamaya = compai de agente completo"): se agrega cobertura
 * del vocabulario RICO (`estado`, reusando angelitaEstados.js), el `visema`
 * REAL (ya no hardcode `state==='speaking'→'V2'`) y la ausencia de `:host`
 * en el `<style>` renderizado (bug de Shadow DOM arreglado vía
 * `hostALigero()`, ver nsRigValle.js).
 */
describe('GuacamayaCompai', () => {
  test('renderiza el cuerpo real (data-creature=guacamaya, role=img)', () => {
    const { container } = render(<GuacamayaCompai state="idle" />);
    const svg = container.querySelector('svg[data-creature="guacamaya"]');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('role', 'img');
  });

  test('trae el rig del valle inlineado (marcado real, no vacío)', () => {
    const { container } = render(<GuacamayaCompai state="idle" />);
    // `g.guaca-rig` = el wrapper del rig (la capa de luces místicas es otro
    // `<g class="guaca-luces">` que ahora va ANTES, ver bloque de luces abajo).
    const g = container.querySelector('svg[data-creature="guacamaya"] > g.guaca-rig');
    expect(g.innerHTML.length).toBeGreaterThan(500);
    expect(g.innerHTML).toContain('guacaWrap');
  });

  // +15% de presencia (SOLO la guacamaya, FACTOR_TAMANO): el <svg> se dibuja a
  // round(size * 1.15). Con size=40 → 46; el título accesible no cambia.
  test('se dibuja +15% sobre el size nominal, y respeta el título accesible', () => {
    const { container } = render(<GuacamayaCompai size={40} title="Mi guacamaya" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '46'); // round(40 * 1.15)
    expect(svg).toHaveAttribute('height', '46');
    expect(svg).toHaveAttribute('aria-label', 'Mi guacamaya');
  });

  test('el +15% escala con el size pedido (64 → 74, 96 → 110)', () => {
    const { container: c64 } = render(<GuacamayaCompai size={64} />);
    expect(c64.querySelector('svg')).toHaveAttribute('width', '74'); // round(64 * 1.15)
    const { container: c96 } = render(<GuacamayaCompai size={96} />);
    expect(c96.querySelector('svg')).toHaveAttribute('width', '110'); // round(96 * 1.15)
  });

  // ANTES: `data-visema` salía de un HARDCODE (`state==='speaking'→'V2'`).
  // AHORA (2026-08-21): `visema` es un prop REAL — GuacamayaCompai.jsx ya no
  // adivina nada a partir de `state`; quien quiera un visema (el adaptador
  // angosto `ChagraAgentAvatarGuacamaya.jsx`, o un host con `useLipSync`) lo
  // manda explícito. Sin prop, sin visema — aunque `state==="speaking"`.
  test('state="speaking" SIN prop visema ya no trae data-visema (dejó de ser hardcode)', () => {
    const { container } = render(<GuacamayaCompai state="speaking" />);
    expect(container.querySelector('svg')).not.toHaveAttribute('data-visema');
  });

  test('con prop visema="V2" real, data-visema lo refleja (cualquiera sea el state)', () => {
    const { container } = render(<GuacamayaCompai state="idle" visema="V2" />);
    expect(container.querySelector('svg')).toHaveAttribute('data-visema', 'V2');
  });

  test('state="idle" no trae data-visema', () => {
    const { container } = render(<GuacamayaCompai state="idle" />);
    expect(container.querySelector('svg')).not.toHaveAttribute('data-visema');
  });

  test('dos instancias simultáneas namespacean sus ids (sin colisión)', () => {
    const { container } = render(
      <div>
        <GuacamayaCompai />
        <GuacamayaCompai />
      </div>,
    );
    const svgs = container.querySelectorAll('svg[data-creature="guacamaya"]');
    expect(svgs.length).toBe(2);
    const idsA = [...svgs[0].querySelectorAll('[id]')].map((n) => n.id);
    const idsB = [...svgs[1].querySelectorAll('[id]')].map((n) => n.id);
    expect(idsA.length).toBeGreaterThan(0);
    // ningún id de la primera instancia se repite en la segunda
    expect(idsA.some((id) => idsB.includes(id))).toBe(false);
  });

  test('trae su <style> con el CSS del rig recortado (sin el chrome de página del valle)', () => {
    const { container } = render(<GuacamayaCompai />);
    const style = container.querySelector('svg style');
    expect(style).toBeInTheDocument();
    expect(style.textContent).not.toContain('#burbuja');
    expect(style.textContent).not.toContain('font-family:Georgia');
  });

  // Bug de Shadow DOM (documentado en el propio componente): el CSS original
  // usa `:host([data-estado="X"])`, que en LIGHT DOM no matchea nada — todo
  // el repertorio por-estado (habla, señala, dispersa, sana, amenaza, pacto)
  // quedaba inerte. `hostALigero()` lo arregla reescribiendo a `[data-estado="X"]`
  // ANTES de inyectar el <style>.
  test('el <style> renderizado ya NO contiene :host (bug de Shadow DOM arreglado)', () => {
    const { container } = render(<GuacamayaCompai />);
    const style = container.querySelector('svg style');
    expect(style.textContent).not.toContain(':host');
    // y las reglas por-estado SÍ quedan presentes, solo que como selector plano:
    expect(style.textContent).toMatch(/\[data-estado="hablar"\]/);
  });

  describe('vocabulario rico (prop `estado`, reusa angelitaEstados.js)', () => {
    test('sin prop `estado`, el data-estado sale del `state` angosto de siempre (retrocompat)', () => {
      const { container } = render(<GuacamayaCompai state="speaking" />);
      expect(container.querySelector('svg')).toHaveAttribute('data-estado', 'hablar');
    });

    test('estado="contenta" → data-estado="sana" (el más positivo del rig)', () => {
      const { container } = render(<GuacamayaCompai estado="contenta" />);
      expect(container.querySelector('svg')).toHaveAttribute('data-estado', 'sana');
    });

    test('estado="preocupada" → data-estado="amenaza" (alerta real)', () => {
      const { container } = render(<GuacamayaCompai estado="preocupada" />);
      expect(container.querySelector('svg')).toHaveAttribute('data-estado', 'amenaza');
    });

    test('estado="senala" → data-estado="senalar" (match directo)', () => {
      const { container } = render(<GuacamayaCompai estado="senala" />);
      expect(container.querySelector('svg')).toHaveAttribute('data-estado', 'senalar');
    });

    test('estado="respondiendo" → data-estado="hablar" (match directo)', () => {
      const { container } = render(<GuacamayaCompai estado="respondiendo" />);
      expect(container.querySelector('svg')).toHaveAttribute('data-estado', 'hablar');
    });

    test('estado="invita" → data-estado="pacto" (alas abiertas de bienvenida)', () => {
      const { container } = render(<GuacamayaCompai estado="invita" />);
      expect(container.querySelector('svg')).toHaveAttribute('data-estado', 'pacto');
    });

    test('estado="husmea" → data-estado="dispersar" (el más activo de los que quedan)', () => {
      const { container } = render(<GuacamayaCompai estado="husmea" />);
      expect(container.querySelector('svg')).toHaveAttribute('data-estado', 'dispersar');
    });

    test.each(['acompana', 'escuchando', 'pensando', 'no-se'])(
      'estado="%s" → data-estado="idle" (el rig no tiene pose propia)',
      (estado) => {
        const { container } = render(<GuacamayaCompai estado={estado} />);
        expect(container.querySelector('svg')).toHaveAttribute('data-estado', 'idle');
      },
    );

    test('un estado desconocido no rompe: cae a acompana→idle (estadoCanonico)', () => {
      const { container } = render(<GuacamayaCompai estado="algo-que-no-existe" />);
      expect(container.querySelector('svg')).toHaveAttribute('data-estado', 'idle');
    });

    test('estado + visema conviven: ambos se estampan', () => {
      const { container } = render(<GuacamayaCompai estado="respondiendo" visema="V3" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('data-estado', 'hablar');
      expect(svg).toHaveAttribute('data-visema', 'V3');
    });
  });

  // ═══ LUCES MÍSTICAS — capa de VFX ADITIVA (aura + estela) ═══════════════════
  // Contrato: se monta DETRÁS del rig (no toca el arte), tiene aura + N motas,
  // gradientes con id namespaceado por instancia, y se apaga con `luces='off'`
  // o `tier='bajo'`. La coreografía/gates de movimiento viven en el CSS.
  describe('luces místicas (capa aditiva, no toca el arte del ave)', () => {
    test('por defecto (luces="auto") monta la capa DETRÁS del rig, con aura y motas', () => {
      const { container } = render(<GuacamayaCompai state="idle" />);
      const svg = container.querySelector('svg[data-creature="guacamaya"]');
      const hijos = [...svg.children].filter((n) => n.tagName.toLowerCase() === 'g');
      // el primer <g> es la capa de luces; el rig queda por encima (después).
      expect(hijos[0]).toHaveClass('guaca-luces');
      expect(hijos[hijos.length - 1]).toHaveClass('guaca-rig');
      const luces = svg.querySelector('g.guaca-luces');
      expect(luces.querySelector('circle.guaca-aura')).toBeInTheDocument();
      expect(luces.querySelectorAll('circle.guaca-luz').length).toBeGreaterThanOrEqual(5);
      expect(svg).toHaveAttribute('data-guaca-luces', 'auto');
    });

    test('el rig (arte aprobado) queda INTACTO y por encima de las luces', () => {
      const { container } = render(<GuacamayaCompai state="idle" />);
      const rig = container.querySelector('svg > g.guaca-rig');
      expect(rig.innerHTML).toContain('guacaWrap'); // el rig del valle, sin tocar
    });

    test('luces="off" no monta la capa', () => {
      const { container } = render(<GuacamayaCompai luces="off" />);
      expect(container.querySelector('g.guaca-luces')).not.toBeInTheDocument();
      expect(container.querySelector('svg')).not.toHaveAttribute('data-guaca-luces');
    });

    test('tier="bajo" apaga la capa (gate de la casa: no se monta)', () => {
      const { container } = render(<GuacamayaCompai tier="bajo" />);
      expect(container.querySelector('g.guaca-luces')).not.toBeInTheDocument();
      expect(container.querySelector('svg')).not.toHaveAttribute('data-guaca-luces');
    });

    test('luces="realza" (entrada/salida) marca data-guaca-luces="realza"', () => {
      const { container } = render(<GuacamayaCompai luces="realza" />);
      expect(container.querySelector('svg')).toHaveAttribute('data-guaca-luces', 'realza');
      expect(container.querySelector('g.guaca-luces')).toBeInTheDocument();
    });

    test('dos instancias NO comparten los ids de los gradientes de luz', () => {
      const { container } = render(
        <div>
          <GuacamayaCompai />
          <GuacamayaCompai />
        </div>,
      );
      const grads = [...container.querySelectorAll('radialGradient[id^="guacaAura-"]')];
      expect(grads.length).toBe(2);
      expect(grads[0].id).not.toBe(grads[1].id);
    });
  });

});
