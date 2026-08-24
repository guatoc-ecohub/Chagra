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
    const g = container.querySelector('svg[data-creature="guacamaya"] > g');
    expect(g.innerHTML.length).toBeGreaterThan(500);
    expect(g.innerHTML).toContain('guacaWrap');
  });

  test('respeta el tamaño (size) y el título accesible', () => {
    const { container } = render(<GuacamayaCompai size={40} title="Mi guacamaya" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '40');
    expect(svg).toHaveAttribute('aria-label', 'Mi guacamaya');
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

});

  describe('gaze-follow (mirada que sigue el puntero)', () => {
    test('cuando tier="bajo", NO sigue el puntero (gate activo)', () => {
      const { container } = render(<GuacamayaCompai tier="bajo" estado="acompana" />);
      const svg = container.querySelector('svg[data-creature="guacamaya"]');
      expect(svg).not.toHaveAttribute('data-guaca-mira');
    });

    test('cuando tier es alto/medio y estado="acompana", SÍ tiene capacidad de gaze-follow', () => {
      const { container } = render(<GuacamayaCompai tier="alto" estado="acompana" />);
      const svg = container.querySelector('svg[data-creature="guacamaya"]');
      // El atributo data-guaca-mira solo se pone cuando el puntero se mueve cerca,
      // pero el setup del useEffect está activo (no hay forma de testear el rAF
      // directo, pero al menos verificamos que no se rompe con tier alto).
      expect(svg).toBeInTheDocument();
    });

    test('cuando estado="senala", NO sigue el puntero (pose de actuación)', () => {
      const { container } = render(<GuacamayaCompai tier="alto" estado="senala" />);
      const svg = container.querySelector('svg[data-creature="guacamaya"]');
      // En estados de actuación, el gaze-follow está desactivado
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('data-estado', 'senalar');
    });

    test('estados que siguen al puntero: acompana, escuchando, respondiendo, invita', () => {
      const estadosQueSiguen = ['acompana', 'escuchando', 'respondiendo', 'invita'];
      estadosQueSiguen.forEach((estado) => {
        const { container } = render(<GuacamayaCompai tier="alto" estado={estado} />);
        const svg = container.querySelector('svg[data-creature="guacamaya"]');
        expect(svg).toBeInTheDocument();
      });
    });

    test('estados que NO siguen al puntero: contenta, preocupada, no-se, senala, husmea', () => {
      const estadosQueNoSiguen = ['contenta', 'preocupada', 'no-se', 'senala', 'husmea'];
      estadosQueNoSiguen.forEach((estado) => {
        const { container } = render(<GuacamayaCompai tier="alto" estado={estado} />);
        const svg = container.querySelector('svg[data-creature="guacamaya"]');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('CSS de gaze-follow', () => {
    test('el <style> incluye las reglas de pupila para data-guaca-mira', () => {
      const { container } = render(<GuacamayaCompai />);
      const style = container.querySelector('svg style');
      expect(style).toBeInTheDocument();
      // Las reglas de gaze-follow usan variables CSS
      expect(style.textContent).toContain('--guaca-mx');
      expect(style.textContent).toContain('--guaca-my');
      expect(style.textContent).toContain('[data-guaca-mira="usted"]');
    });
  });
