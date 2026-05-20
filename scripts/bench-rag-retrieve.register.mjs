// Registrador del loader hook para bench-rag-retrieve.mjs.
// Se invoca vía `node --import ./scripts/bench-rag-retrieve.register.mjs ...`.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./bench-rag-retrieve.loader.mjs', pathToFileURL('./scripts/'));
