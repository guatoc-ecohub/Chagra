// Config del gate: idéntica a la del repo pero con cacheDir PROPIO —
// N vites compartiendo node_modules/.vite se invalidan mutuamente
// (504 Outdated Optimize Dep → captura negra).
import base from '/home/kortux/Workspace/chagra/.worktrees/fable-jaguar-arte-patas/vite.config.js';
export default { ...base, cacheDir: '/tmp/vite-cache-jaguar-fable' };
