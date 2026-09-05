import base from '../vite.config.js';

export default {
  ...base,
  cacheDir: '.gate-local/vite-cache',
  server: {
    ...base.server,
    fs: { allow: ['/home/kortux/Workspace/chagra'] },
  },
};
