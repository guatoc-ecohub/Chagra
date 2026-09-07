// Envoltorio LOCAL del worktree (NO se commitea): el node_modules es symlink al
// checkout principal y vite responde 403 al servir el wasm de SQLite por /@fs.
import { mergeConfig } from 'vite';
import base from './vite.config.js';
export default mergeConfig(base, { server: { fs: { allow: ['/home/kortux/Workspace/chagra', '/home/kortux/Workspace/chagra/.worktrees/sierra-fable-20260905'] } } });
