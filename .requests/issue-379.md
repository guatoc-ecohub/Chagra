# Request #379

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/379
- Title: [feat][multi-finca] MF-2 did:key Ed25519 + BIP-39 onboarding UX
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

ADR-036 sub-i Fase 1 (~USD 3.5k). Identidad descentralizada operador.

Dependencias npm: @noble/curves, @scure/bip39 1.3+ (wordlist español).

Tarea:

1. src/services/operatorDidService.js:
   - generateOperatorDid(): par Ed25519 + 24 palabras BIP-39 español.
   - importFromSeed(seed_words), signChallenge, exportPublicDid → 'did:key:z6Mk...'.

2. UI src/components/OperatorOnboarding.jsx 3-step:
   - generar DID + mostrar 24 palabras (operador anota).
   - confirmar 3 palabras random.
   - registro local activación.

3. Almacenar did_key + seed CIFRADO SQLite-WASM (AES-GCM key derivada de PIN operador).

4. Tests round-trip.

No implementar UCAN delegations en este issue. AGPL puro.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
