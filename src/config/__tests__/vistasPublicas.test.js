import { describe, it, expect } from 'vitest';
import {
  VISTAS_DE_ENTRADA,
  construirVistasPublicas,
  decidirNavegacion,
} from '../vistasPublicas';

// Las vitrinas reales son los valores de MOCKUP_HASH_ROUTES; acá basta una
// muestra representativa, incluida `mundo_casa_adentro`, que NO lleva el
// prefijo `mockup_` (por eso el set se construye desde la tabla y no con un
// `startsWith` — un prefijo la habría dejado afuera).
const VITRINAS = ['mockup_entrada_3d', 'mockup_mercado', 'mundo_casa_adentro'];
const PUBLICAS = construirVistasPublicas(VITRINAS);

describe('construirVistasPublicas', () => {
  it('deja pasar las tres vistas de la entrada', () => {
    for (const v of VISTAS_DE_ENTRADA) {
      expect(PUBLICAS.has(v)).toBe(true);
    }
  });

  it('deja pasar las vitrinas, incluida la que no lleva prefijo mockup_', () => {
    expect(PUBLICAS.has('mockup_entrada_3d')).toBe(true);
    expect(PUBLICAS.has('mundo_casa_adentro')).toBe(true);
  });

  it('NO deja pasar las pantallas con datos de finca', () => {
    for (const v of ['dashboard', 'activos', 'agente', 'perfil', 'informes', 'valle3d']) {
      expect(PUBLICAS.has(v)).toBe(false);
    }
  });

  it('el valle de la app es privado — el público es otro bundle', () => {
    expect(PUBLICAS.has('valle3d')).toBe(false);
    // pero su vitrina, la que se comparte por enlace, sigue abierta
    expect(PUBLICAS.has('mockup_entrada_3d')).toBe(true);
  });
});

describe('decidirNavegacion — sin sesión', () => {
  const sesion = false;

  it('manda a login cualquier pantalla real', () => {
    for (const v of ['dashboard', 'activos', 'agente', 'valle3d']) {
      expect(decidirNavegacion({ vista: v, vistasPublicas: PUBLICAS, sesion }))
        .toEqual({ vista: 'login', gateada: true, verificar: false });
    }
  });

  it('NO cierra las vitrinas públicas', () => {
    expect(decidirNavegacion({ vista: 'mockup_entrada_3d', vistasPublicas: PUBLICAS, sesion }))
      .toEqual({ vista: 'mockup_entrada_3d', gateada: false, verificar: false });
  });

  it('NO cierra el login ni el callback de OAuth', () => {
    // gatear oauth-callback mataría el login que está por completarse: cuando
    // vuelve del proveedor todavía no hay token.
    expect(decidirNavegacion({ vista: 'oauth-callback', vistasPublicas: PUBLICAS, sesion }).gateada)
      .toBe(false);
    expect(decidirNavegacion({ vista: 'login', vistasPublicas: PUBLICAS, sesion }).gateada)
      .toBe(false);
  });
});

describe('decidirNavegacion — con sesión', () => {
  const sesion = true;

  it('el campesino entra a TODO: ninguna vista se le gatea', () => {
    const todas = [...PUBLICAS, 'dashboard', 'activos', 'agente', 'perfil', 'informes', 'valle3d'];
    for (const v of todas) {
      const d = decidirNavegacion({ vista: v, vistasPublicas: PUBLICAS, sesion });
      expect(d).toEqual({ vista: v, gateada: false, verificar: false });
    }
  });

  it('no pide verificación de más: con sesión conocida el paso es síncrono', () => {
    expect(decidirNavegacion({ vista: 'dashboard', vistasPublicas: PUBLICAS, sesion }).verificar)
      .toBe(false);
  });
});

describe('decidirNavegacion — sesión todavía desconocida (null)', () => {
  const sesion = null;

  it('no adivina: pide verificar antes de montar una pantalla real', () => {
    expect(decidirNavegacion({ vista: 'dashboard', vistasPublicas: PUBLICAS, sesion }))
      .toEqual({ vista: 'dashboard', gateada: false, verificar: true });
  });

  it('las vitrinas no esperan a nadie: se montan igual', () => {
    expect(decidirNavegacion({ vista: 'mockup_mercado', vistasPublicas: PUBLICAS, sesion }).verificar)
      .toBe(false);
  });

  it('el login se monta sin verificar (si no, el arranque en frío parpadea)', () => {
    expect(decidirNavegacion({ vista: 'login', vistasPublicas: PUBLICAS, sesion }).verificar)
      .toBe(false);
    expect(decidirNavegacion({ vista: 'loading', vistasPublicas: PUBLICAS, sesion }).verificar)
      .toBe(false);
  });
});

describe('decidirNavegacion — bordes', () => {
  it('una vista vacía cae en login, no en undefined', () => {
    for (const v of ['', null, undefined]) {
      expect(decidirNavegacion({ vista: v, vistasPublicas: PUBLICAS, sesion: true }))
        .toEqual({ vista: 'login', gateada: true, verificar: false });
    }
  });

  it('una vista inventada no se cuela por no estar en ninguna tabla', () => {
    expect(decidirNavegacion({ vista: 'vista_que_no_existe', vistasPublicas: PUBLICAS, sesion: false }).vista)
      .toBe('login');
  });
});
