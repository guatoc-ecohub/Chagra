import { describe, it, expect } from 'vitest';

import { getDbCmd } from '../lib/db-cmd.mjs';

describe('getDbCmd', () => {
  it('arma el comando podman exec desde variables de entorno', () => {
    const env = {
      CHAGRA_DB_CONTAINER: 'db-container',
      CHAGRA_DB_USER: 'db-user',
      CHAGRA_DB_NAME: 'db-name',
    };
    const cmd = getDbCmd(env);

    expect(cmd).toEqual({
      file: 'sudo',
      args: ['podman', 'exec', '-i', 'db-container', 'psql', '-U', 'db-user', '-d', 'db-name'],
    });
  });

  it('falla con un error claro si falta alguna variable requerida', () => {
    expect(() => getDbCmd({ CHAGRA_DB_CONTAINER: 'db-container' })).toThrow(
      /Configura el perfil privado de ops de Chagra/,
    );
  });
});
