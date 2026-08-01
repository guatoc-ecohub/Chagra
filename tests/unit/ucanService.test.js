/**
 * ucanService.test.js — tests unitarios de la delegación de capabilities (UCAN mínimo).
 *
 * Sigue el patrón del setup existente en tests/unit/setup.js y usa Vitest.
 */
import { describe, it, expect } from 'vitest';
import { generateDidKey } from '../../src/services/crypto/didKeyService.js';
import {
  issueCapability,
  verifyCapability,
  ucanToPermisos,
} from '../../src/services/crypto/ucanService.js';

async function issuarCapDePrueba(overrides = {}) {
  const issuer = await generateDidKey();
  const audience = await generateDidKey();
  const token = await issueCapability({
    issuerSecret: issuer.secretKey,
    issuerDid: issuer.did,
    audienceDid: audience.did,
    can: 'log/create',
    with: 'chagra://finca/guatoc/logs',
    ttlSeconds: 3600,
    ...overrides,
  });
  return { issuer, audience, token };
}

describe('ucanService.issueCapability / verifyCapability — roundtrip', () => {
  it('emite un token de 3 segmentos y lo verifica exitosamente', async () => {
    const { issuer, audience, token } = await issuarCapDePrueba();

    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const claims = await verifyCapability(token);
    expect(claims.iss).toBe(issuer.did);
    expect(claims.aud).toBe(audience.did);
    expect(claims.att).toEqual([
      { with: 'chagra://finca/guatoc/logs', can: 'log/create', restrict: {} },
    ]);
  });

  it('propaga restrict (own_only, no_delete, redact_pii) en los claims', async () => {
    const restrict = { own_only: true, no_delete: true, redact_pii: true };
    const { token } = await issuarCapDePrueba({ can: 'asset/delete', restrict });
    const claims = await verifyCapability(token);
    expect(claims.att[0].restrict).toEqual(restrict);
  });

  it('valida campos requeridos al emitir', async () => {
    const issuer = await generateDidKey();
    await expect(
      issueCapability({
        issuerSecret: issuer.secretKey,
        issuerDid: issuer.did,
        audienceDid: 'no-es-un-did',
        can: 'log/create',
        with: 'chagra://finca/guatoc/logs',
        ttlSeconds: 60,
      })
    ).rejects.toThrow();

    await expect(
      issueCapability({
        issuerSecret: issuer.secretKey,
        issuerDid: issuer.did,
        audienceDid: (await generateDidKey()).did,
        can: 'log/create',
        with: 'chagra://finca/guatoc/logs',
        ttlSeconds: -5,
      })
    ).rejects.toThrow();
  });
});

describe('ucanService.verifyCapability — rechazos', () => {
  it('rechaza un token con firma inválida (payload alterado)', async () => {
    const { token } = await issuarCapDePrueba();
    const [headerB64, payloadB64, sigB64] = token.split('.');

    // Alterar el payload decodificando, mutando 'can' y re-encodeando, pero
    // dejando la firma original (que ya no corresponde al nuevo payload).
    const payloadJson = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    );
    payloadJson.att[0].can = 'user/manage'; // intento de escalar el permiso
    const payloadAlteradoB64 = Buffer.from(JSON.stringify(payloadJson))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const tokenAlterado = `${headerB64}.${payloadAlteradoB64}.${sigB64}`;
    await expect(verifyCapability(tokenAlterado)).rejects.toThrow(/firma inválida/);
  });

  it('rechaza un token expirado (ttlSeconds ya vencido)', async () => {
    const { token } = await issuarCapDePrueba({ ttlSeconds: 1 });

    // Forzar expiración real esperando > 1s no es ideal en CI; en vez de eso
    // emitimos directo con exp en el pasado reconstruyendo el flujo mínimo:
    // usamos un ttl de 1s y avanzamos el reloj del test con un pequeño sleep.
    await new Promise((resolve) => setTimeout(resolve, 1100));

    await expect(verifyCapability(token)).rejects.toThrow(/expirada/);
  });

  it('rechaza un token mal formado (no tiene 3 segmentos)', async () => {
    await expect(verifyCapability('no.es.un.token.valido')).rejects.toThrow(/mal formado/);
    await expect(verifyCapability('solo-un-segmento')).rejects.toThrow(/mal formado/);
  });

  it('rechaza un token cuya firma pertenece a otro issuer', async () => {
    const otro = await generateDidKey();
    const { token } = await issuarCapDePrueba();
    const [, payloadB64, sigB64] = token.split('.');

    // Reconstruir el token pero declarando como iss a un DID que no firmó.
    const payloadJson = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    );
    payloadJson.iss = otro.did;
    const payloadFalsoB64 = Buffer.from(JSON.stringify(payloadJson))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const headerB64Original = token.split('.')[0];
    const tokenFalso = `${headerB64Original}.${payloadFalsoB64}.${sigB64}`;
    await expect(verifyCapability(tokenFalso)).rejects.toThrow(/firma inválida/);
  });
});

describe('ucanService.ucanToPermisos', () => {
  it('mapea log/create sin restrict al permiso simple log:create', async () => {
    const { token } = await issuarCapDePrueba({ can: 'log/create' });
    const claims = await verifyCapability(token);
    const permisos = ucanToPermisos(claims);
    expect(permisos.has('log:create')).toBe(true);
  });

  it('own_only colapsa un permiso escopable a :own', async () => {
    const { token } = await issuarCapDePrueba({
      can: 'asset/update',
      restrict: { own_only: true },
    });
    const claims = await verifyCapability(token);
    const permisos = ucanToPermisos(claims);
    expect(permisos.has('asset:update:own')).toBe(true);
    expect(permisos.has('asset:update:any')).toBe(false);
  });

  it('sin own_only, un permiso escopable se otorga como :any', async () => {
    const { token } = await issuarCapDePrueba({ can: 'asset:update'.replace(':', '/') });
    const claims = await verifyCapability(token);
    const permisos = ucanToPermisos(claims);
    expect(permisos.has('asset:update:any')).toBe(true);
  });

  it('no_delete bloquea por completo un permiso de borrado (caso niña)', async () => {
    const { token } = await issuarCapDePrueba({
      can: 'asset/delete',
      restrict: { no_delete: true },
    });
    const claims = await verifyCapability(token);
    const permisos = ucanToPermisos(claims);
    expect(permisos.size).toBe(0);
  });

  it('ignora atenuaciones con can desconocido (no otorga nada)', () => {
    const permisos = ucanToPermisos({ att: [{ with: 'x', can: 'algo/inexistente', restrict: {} }] });
    expect(permisos.size).toBe(0);
  });

  it('devuelve Set vacío para claims sin att', () => {
    expect(ucanToPermisos({}).size).toBe(0);
    expect(ucanToPermisos(null).size).toBe(0);
  });
});
