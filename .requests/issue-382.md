# Request #382

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/382
- Title: [feat][multi-finca] MF-5 encrypted backup Backblaze B2 cliente-side age + HKDF
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

ADR-036 sub-vii Fase 1 (~USD 3k). Solo B2 backup en este issue (peer + papel son Fase 2-3).

Dependencias: age-encryption o rage-wasm, @stablelib/hkdf.

Tarea:

1. src/services/backupService.js:
   - deriveBackupKey(operatorSeed) via HKDF.
   - exportBackup(fincaDid): tar.gz OPFS → cifrar age → bytes.
   - importBackup(bytes, key): descifra → restore OPFS.
   - uploadToB2(bucket, key_id, bytes): S3-compatible API.

2. UI src/components/BackupSettings.jsx: botón export/upload/restore + fecha último backup. B2 keys NO hardcoded — operador provee y vive en localStorage cifrado.

3. Schedule automatico: snapshot diario idle.

4. Tests round-trip export → cifrar → upload simulado → download → descifrar → import.

Backblaze NUNCA ve plaintext. AGPL puro. No commits con credenciales reales.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
