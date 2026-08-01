/**
 * didKeyService.test.js — tests unitarios de la identidad cripto did:key Ed25519.
 *
 * Sigue el patrón del setup existente en tests/unit/setup.js y usa Vitest.
 */
import { describe, it, expect } from 'vitest';
import {
  generateDidKey,
  didFromPublicKey,
  publicKeyFromDid,
  sign,
  verify,
} from '../../src/services/crypto/didKeyService.js';

describe('didKeyService.generateDidKey', () => {
  it('genera un did:key con formato correcto (did:key:z...)', async () => {
    const { did, secretKey } = await generateDidKey();
    expect(did).toMatch(/^did:key:z[1-9A-HJ-NP-Za-km-z]+$/);
    expect(secretKey).toBeInstanceOf(Uint8Array);
    expect(secretKey.length).toBe(64);
  });

  it('genera dids distintos en llamadas sucesivas', async () => {
    const a = await generateDidKey();
    const b = await generateDidKey();
    expect(a.did).not.toBe(b.did);
  });
});

describe('didKeyService.didFromPublicKey / publicKeyFromDid', () => {
  it('roundtrip: publicKeyFromDid(didFromPublicKey(pub)) === pub', async () => {
    const { did } = await generateDidKey();
    const pub = publicKeyFromDid(did);
    expect(pub).toBeInstanceOf(Uint8Array);
    expect(pub.length).toBe(32);
    expect(didFromPublicKey(pub)).toBe(did);
  });

  it('rechaza llave pública que no sea Uint8Array de 32 bytes', () => {
    expect(() => didFromPublicKey(new Uint8Array(16))).toThrow();
    expect(() => didFromPublicKey('no-bytes')).toThrow();
  });

  it('rechaza un did:key mal formado', () => {
    expect(() => publicKeyFromDid('did:web:ejemplo.com')).toThrow();
    expect(() => publicKeyFromDid('did:key:znoesbase58btcvalido!!!')).toThrow();
  });
});

describe('didKeyService.sign / verify — roundtrip', () => {
  it('firma y verifica correctamente un mensaje', async () => {
    const { did, secretKey } = await generateDidKey();
    const msg = new TextEncoder().encode('bitácora: sembré fríjol en el lote 3');
    const sig = await sign(secretKey, msg);

    expect(sig).toBeInstanceOf(Uint8Array);
    expect(sig.length).toBe(64);

    const ok = await verify(did, msg, sig);
    expect(ok).toBe(true);
  });

  it('rechaza la firma si el mensaje fue alterado', async () => {
    const { did, secretKey } = await generateDidKey();
    const msg = new TextEncoder().encode('mensaje original');
    const sig = await sign(secretKey, msg);

    const mensajeAlterado = new TextEncoder().encode('mensaje alterado');
    const ok = await verify(did, mensajeAlterado, sig);
    expect(ok).toBe(false);
  });

  it('rechaza la firma si se verifica contra un did distinto', async () => {
    const a = await generateDidKey();
    const b = await generateDidKey();
    const msg = new TextEncoder().encode('mensaje de a');
    const sig = await sign(a.secretKey, msg);

    const ok = await verify(b.did, msg, sig);
    expect(ok).toBe(false);
  });

  it('verify devuelve false (no lanza) ante un did mal formado', async () => {
    const msg = new TextEncoder().encode('x');
    const sig = new Uint8Array(64);
    await expect(verify('did:key:zNOVALIDO!!!', msg, sig)).resolves.toBe(false);
  });
});

describe('didKeyService — stubs documentados', () => {
  it('mnemonicToSeed lanza explícitamente (no implementado)', async () => {
    const { mnemonicToSeed } = await import('../../src/services/crypto/didKeyService.js');
    await expect(mnemonicToSeed('palabra1 palabra2')).rejects.toThrow(/NO implementado/);
  });

  it('deriveSubUserKey lanza explícitamente (no implementado)', async () => {
    const { deriveSubUserKey } = await import('../../src/services/crypto/didKeyService.js');
    await expect(deriveSubUserKey(new Uint8Array(32), 0)).rejects.toThrow(/NO implementado/);
  });
});
