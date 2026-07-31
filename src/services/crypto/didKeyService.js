/**
 * didKeyService.js — Identidad criptográfica did:key Ed25519 por sub-usuario.
 *
 * PROPÓSITO (Fase 2, ADR-036 sub-i):
 *   Cada SubUser (dueño/esposa/trabajador/niña/asesor) tiene un par de llaves
 *   Ed25519. El `did:key` derivado de la llave pública es su identidad
 *   pseudónima y firmable (capa 2, ADR-020) — NO lleva PII. El `nombre` real
 *   sigue viviendo cifrado con DEK (capa 1, `operatorIdentityService`).
 *
 * DECISIÓN DE IMPLEMENTACIÓN — Web Crypto, CERO dependencias npm:
 *   Se usa `crypto.subtle` (Web Crypto API, disponible en Node ≥20 y en todo
 *   navegador moderno) con el algoritmo nombrado `'Ed25519'` en vez de
 *   `@noble/curves` (que sí menciona el diseño en Chagra-strategy/ops/
 *   DISENO-FEDERACION-USUARIOS.md §5.1/§6.5). Motivo: cero superficie de
 *   supply-chain nueva para la pieza más sensible del sistema (firma de
 *   capabilities). Si algún runtime objetivo no soporta Ed25519 en
 *   `crypto.subtle` (navegadores muy viejos), migrar a `@noble/curves` es un
 *   cambio contenido a este archivo — el contrato público no cambia.
 *
 * FORMATO `secretKey` (Uint8Array, 64 bytes):
 *   Web Crypto exige, para reimportar una llave privada Ed25519 vía JWK, el
 *   par completo `d` (seed, 32 bytes) + `x` (pública, 32 bytes) — Node NO
 *   deriva `x` a partir de `d` solo (verificado empíricamente). Por eso
 *   `secretKey` es la concatenación `d || x` (64 bytes), NO el seed puro de
 *   32 bytes de otras implementaciones Ed25519 (ej. @noble). Es un detalle
 *   interno de este módulo — quien lo consuma solo debe tratar `secretKey`
 *   como un blob opaco y pasarlo de vuelta a `sign()`.
 *
 * FORMATO `did:key`:
 *   `did:key:z` + base58btc( 0xed 0x01 (multicodec ed25519-pub) || pubkeyRaw(32B) )
 *   Ver https://w3c-ccg.github.io/did-method-key/ (Ed25519 multicodec 0xed).
 *
 * STUBS DOCUMENTADOS (no implementados aquí):
 *   `mnemonicToSeed` / `deriveSubUserKey` requieren BIP-39 (wordlist español)
 *   y derivación HD tipo BIP-32 sobre Ed25519 (ej. SLIP-0010), que si se hace
 *   bien necesita `@scure/bip39` + `@scure/base` (no hay primitiva nativa en
 *   Web Crypto para esto). Se dejan como stubs que lanzan explícitamente para
 *   no dar una falsa sensación de seguridad con un HD derivation casero. La
 *   Fase 2 mínima (generar/firmar/verificar) NO los necesita: cada SubUser
 *   puede generar su propia llave independiente con `generateDidKey()`.
 *
 * Español colombiano (usted). NUNCA voseo argentino.
 *
 * @module didKeyService
 */

const ED25519 = Object.freeze({ name: 'Ed25519' });

// Multicodec ed25519-pub = 0xed01 (varint de 0xed, 0x01), prefijo fijo de 2 bytes.
const MULTICODEC_ED25519_PUB = Uint8Array.of(0xed, 0x01);

// Alfabeto base58btc (Bitcoin), el mismo que usa el método did:key.
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Codifica bytes a base58btc (sin el prefijo multibase 'z' — eso lo agrega
 * el llamador). Implementación de precisión arbitraria vía BigInt, sin deps.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function base58btcEncode(bytes) {
  if (bytes.length === 0) return '';

  // Contar ceros iniciales (se codifican como '1' repetidos al inicio).
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;

  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  const base = 58n;
  const digits = [];
  while (value > 0n) {
    const rem = value % base;
    digits.push(BASE58_ALPHABET[Number(rem)]);
    value /= base;
  }

  const leading = '1'.repeat(zeros);
  return leading + digits.reverse().join('');
}

/**
 * Decodifica base58btc a bytes. Inverso exacto de `base58btcEncode`.
 * @param {string} str
 * @returns {Uint8Array}
 */
function base58btcDecode(str) {
  if (str.length === 0) return new Uint8Array();

  let zeros = 0;
  while (zeros < str.length && str[zeros] === '1') zeros += 1;

  const base = 58n;
  let value = 0n;
  for (const char of str) {
    const digit = BASE58_ALPHABET.indexOf(char);
    if (digit === -1) {
      throw new Error(`didKeyService: carácter base58btc inválido: "${char}"`);
    }
    value = value * base + BigInt(digit);
  }

  const bytes = [];
  while (value > 0n) {
    bytes.push(Number(value & 0xffn));
    value >>= 8n;
  }
  bytes.reverse();

  return new Uint8Array([...new Array(zeros).fill(0), ...bytes]);
}

function concatBytes(...arrays) {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

function base64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64url(bytes) {
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Deriva el `did:key` a partir de la llave pública Ed25519 cruda (32 bytes).
 * @param {Uint8Array} pub — llave pública Ed25519 raw, 32 bytes.
 * @returns {string} `did:key:z6Mk...`
 */
export function didFromPublicKey(pub) {
  if (!(pub instanceof Uint8Array) || pub.length !== 32) {
    throw new Error('didKeyService.didFromPublicKey: se espera Uint8Array de 32 bytes (llave pública Ed25519 raw)');
  }
  const prefixed = concatBytes(MULTICODEC_ED25519_PUB, pub);
  return `did:key:z${base58btcEncode(prefixed)}`;
}

/**
 * Extrae la llave pública Ed25519 raw (32 bytes) de un `did:key`.
 * @param {string} did
 * @returns {Uint8Array}
 */
export function publicKeyFromDid(did) {
  if (typeof did !== 'string' || !did.startsWith('did:key:z')) {
    throw new Error('didKeyService.publicKeyFromDid: did:key mal formado');
  }
  const multibase = did.slice('did:key:'.length); // incluye el prefijo 'z'
  if (multibase[0] !== 'z') {
    throw new Error('didKeyService.publicKeyFromDid: solo se soporta multibase base58btc (prefijo "z")');
  }
  const decoded = base58btcDecode(multibase.slice(1));
  if (decoded.length !== 34 || decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error('didKeyService.publicKeyFromDid: multicodec inesperado (se esperaba ed25519-pub 0xed01)');
  }
  return decoded.slice(2);
}

/**
 * Genera un nuevo par de llaves Ed25519 y su `did:key` asociado.
 * @returns {Promise<{ did: string, secretKey: Uint8Array }>}
 */
export async function generateDidKey() {
  const keyPair = await crypto.subtle.generateKey(ED25519, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const d = base64urlToBytes(jwk.d);
  const x = base64urlToBytes(jwk.x);
  const secretKey = concatBytes(d, x); // 64 bytes: seed(32) || pubkey(32)
  const did = didFromPublicKey(x);
  return { did, secretKey };
}

/**
 * Reconstruye el `CryptoKey` privado importable a partir de `secretKey`
 * (formato interno de este módulo: `d(32) || x(32)`).
 * @param {Uint8Array} secretKey
 * @returns {Promise<CryptoKey>}
 */
async function importPrivateKey(secretKey) {
  if (!(secretKey instanceof Uint8Array) || secretKey.length !== 64) {
    throw new Error('didKeyService: secretKey debe ser Uint8Array de 64 bytes (formato d||x de este módulo)');
  }
  const d = secretKey.slice(0, 32);
  const x = secretKey.slice(32, 64);
  const jwk = { kty: 'OKP', crv: 'Ed25519', d: bytesToBase64url(d), x: bytesToBase64url(x) };
  return crypto.subtle.importKey('jwk', jwk, ED25519, false, ['sign']);
}

/**
 * Reconstruye el `CryptoKey` público importable a partir de la llave pública raw.
 * @param {Uint8Array} pub
 * @returns {Promise<CryptoKey>}
 */
async function importPublicKey(pub) {
  const jwk = { kty: 'OKP', crv: 'Ed25519', x: bytesToBase64url(pub) };
  return crypto.subtle.importKey('jwk', jwk, ED25519, false, ['verify']);
}

/**
 * Firma `bytes` con la llave privada representada por `secretKey`.
 * @param {Uint8Array} secretKey
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array>} firma Ed25519, 64 bytes.
 */
export async function sign(secretKey, bytes) {
  const privateKey = await importPrivateKey(secretKey);
  const sig = await crypto.subtle.sign(ED25519, privateKey, /** @type {BufferSource} */ (bytes));
  return new Uint8Array(sig);
}

/**
 * Verifica que `sig` sea una firma Ed25519 válida de `bytes` para el `did` dado.
 * @param {string} did
 * @param {Uint8Array} bytes
 * @param {Uint8Array} sig
 * @returns {Promise<boolean>}
 */
export async function verify(did, bytes, sig) {
  try {
    const pub = publicKeyFromDid(did);
    const publicKey = await importPublicKey(pub);
    return await crypto.subtle.verify(ED25519, publicKey, /** @type {BufferSource} */ (sig), /** @type {BufferSource} */ (bytes));
  } catch {
    // Cualquier error de formato/decodificación es una firma inválida, no una excepción.
    return false;
  }
}

/**
 * STUB documentado — requiere BIP-39 (wordlist español, `@scure/bip39` u
 * homólogo). NO implementado en esta pieza para no introducir una dependencia
 * npm en el módulo cripto sin que el operador la apruebe explícitamente.
 * @param {string} _words
 * @returns {Promise<Uint8Array>}
 */
// eslint-disable-next-line no-unused-vars
export async function mnemonicToSeed(_words) {
  throw new Error(
    'didKeyService.mnemonicToSeed: NO implementado — requiere BIP-39 (@scure/bip39 wordlist ES). ' +
      'Pendiente de decisión explícita del operador sobre la dependencia (ver DISENO-FEDERACION-USUARIOS.md §5.1). ' +
      'La Fase 2 mínima no lo necesita: use generateDidKey() para cada SubUser.'
  );
}

/**
 * STUB documentado — requiere derivación HD (tipo SLIP-0010) sobre Ed25519,
 * que depende de `mnemonicToSeed`. Ver nota de `mnemonicToSeed` arriba.
 * @param {Uint8Array} _ownerSeed
 * @param {number} _index
 * @returns {Promise<{ did: string, secretKey: Uint8Array }>}
 */
// eslint-disable-next-line no-unused-vars
export async function deriveSubUserKey(_ownerSeed, _index) {
  throw new Error(
    'didKeyService.deriveSubUserKey: NO implementado — requiere HD derivation (SLIP-0010) sobre Ed25519. ' +
      'Pendiente de decisión explícita del operador (ver DISENO-FEDERACION-USUARIOS.md §5.1). ' +
      'Alternativa ya disponible: cada SubUser genera su propia llave independiente con generateDidKey().'
  );
}
