/**
 * ext-resolver.mjs — registra el hook de resolución sin-extensión (ESM).
 * Cargar con: node --import ./scripts/lib/ext-resolver.mjs scripts/<bench>.mjs
 * Ver scripts/lib/ext-resolver-hooks.mjs para el detalle del hook.
 */
import { register } from 'node:module';
register('./ext-resolver-hooks.mjs', import.meta.url);
