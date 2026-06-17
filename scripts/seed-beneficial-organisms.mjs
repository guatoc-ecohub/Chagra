#!/usr/bin/env node
/**
 * scripts/seed-beneficial-organisms.mjs
 *
 * Runner idempotente del seed ADITIVO de organismos benéficos / agentes de
 * control biológico en el grafo Apache AGE `chagra_kg`.
 *
 * CONTEXTO (bench 2026-06-03):
 *   El agente nombraba BIEN agentes de control biológico válidos (Chrysoperla
 *   carnea, Trichoderma harzianum, Orius insidiosus, Beauveria bassiana,
 *   Bacillus thuringiensis, Diaeretiella rapae, …) pero la capa anti-alucinación
 *   (post-validate de taxonomía) los marcaba como ALUCINACIÓN porque el grafo
 *   solo tenía esos binomios como nodos `Biopreparado` (sin nombre científico) o
 *   no los tenía, y el validador solo consultaba los labels `Species` y `Pest`.
 *   Eso hundía la dimensión "plagas" del bench con falsos positivos.
 *
 *   El fix agrega un label `BeneficialOrganism` (con el binomio Linneano +
 *   tipo + modo de acción + fuente institucional) conectado por aristas
 *   `CONTROLS` a los `Pest` que regula. El sidecar (resolve-entities,
 *   post-validate-taxonomy, get_pest_controllers) se extiende para consultarlo.
 *
 * QUÉ HACE ESTE SCRIPT:
 *   Ejecuta un archivo SQL de seed (MERGE/SET — NUNCA DROP/DELETE/DETACH) contra
 *   el cluster postgres-farm vía TCP. El SQL es transaccional (BEGIN/COMMIT),
 *   idempotente y verifica las invariantes (Species intacto) en pre/post-check.
 *
 * DÓNDE VIVE EL DATASET:
 *   La lista curada de organismos (fuente institucional ICA / AGROSAVIA /
 *   CENICAFÉ) es DATA y vive en el repo privado `chagra-pro`:
 *     data/age/seed-beneficial-organisms-2026-06-03.sql
 *   Este runner público NO embebe esa data; se le pasa la ruta al .sql.
 *
 * SEGURIDAD (repo público):
 *   - Cero hosts/credenciales internos hardcodeados. Todo por env, con defaults
 *     de loopback documentados en INFRA_FACTS.md (postgres-farm escucha TCP en
 *     127.0.0.1:5432; `podman exec` está roto — usar TCP).
 *       CHAGRA_AGE_HOST     (default "127.0.0.1")
 *       CHAGRA_AGE_PORT     (default 5432)
 *       CHAGRA_AGE_DB       (default "chagra_kg")
 *       CHAGRA_AGE_USER     (default "farmos")
 *       PGPASSWORD          (requerido por psql en el entorno)
 *   - En NixOS el host no trae `psql` en PATH → invocar bajo
 *     `nix-shell -p postgresql --run "..."`.
 *
 * USO:
 *   PGPASSWORD=*** node scripts/seed-beneficial-organisms.mjs \
 *     --sql ../chagra-pro/data/age/seed-beneficial-organisms-2026-06-03.sql
 *   # NixOS:
 *   nix-shell -p postgresql nodejs --run \
 *     "PGPASSWORD=*** node scripts/seed-beneficial-organisms.mjs --sql <ruta>"
 *
 * SALIDA:
 *   Re-emite stdout/stderr de psql (incluye los \echo de pre/post-check). El
 *   exit code propaga el de psql; con ON_ERROR_STOP el seed aborta y revierte la
 *   transacción ante cualquier error.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  const args = { sql: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sql") args.sql = argv[++i];
    else if (a.startsWith("--sql=")) args.sql = a.slice("--sql=".length);
    else if (a === "-h" || a === "--help") args.help = true;
  }
  return args;
}

function usage() {
  process.stdout.write(
    [
      "Uso: node scripts/seed-beneficial-organisms.mjs --sql <ruta-al-seed.sql>",
      "",
      "Env (con defaults de loopback, ver INFRA_FACTS.md):",
      "  CHAGRA_AGE_HOST (127.0.0.1)  CHAGRA_AGE_PORT (5432)",
      "  CHAGRA_AGE_DB   (chagra_kg)  CHAGRA_AGE_USER (farmos)",
      "  PGPASSWORD      (requerido por psql)",
      "",
    ].join("\n"),
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }
  if (!args.sql) {
    process.stderr.write("ERROR: falta --sql <ruta-al-seed.sql>\n");
    usage();
    process.exit(2);
  }
  const sqlPath = resolve(process.cwd(), args.sql);
  if (!existsSync(sqlPath)) {
    process.stderr.write(`ERROR: no existe el archivo SQL: ${sqlPath}\n`);
    process.exit(2);
  }

  const host = process.env.CHAGRA_AGE_HOST ?? "127.0.0.1";
  const port = process.env.CHAGRA_AGE_PORT ?? "5432";
  const db = process.env.CHAGRA_AGE_DB ?? "chagra_kg";
  const user = process.env.CHAGRA_AGE_USER ?? "farmos";

  if (!process.env.PGPASSWORD) {
    process.stderr.write(
      "AVISO: PGPASSWORD no está seteado; psql lo pedirá interactivamente o fallará.\n",
    );
  }

  process.stdout.write(
    `[seed-beneficial-organisms] psql -h ${host} -p ${port} -U ${user} -d ${db} -f ${sqlPath}\n`,
  );

  // -v ON_ERROR_STOP=1 también desde el CLI (el .sql ya lo setea, defensa extra).
  const r = spawnSync(
    "psql",
    [
      "-h", host,
      "-p", String(port),
      "-U", user,
      "-d", db,
      "-v", "ON_ERROR_STOP=1",
      "-f", sqlPath,
    ],
    { stdio: "inherit", env: process.env },
  );

  if (r.error) {
    if (r.error.code === "ENOENT") {
      process.stderr.write(
        "ERROR: `psql` no está en PATH. En NixOS: nix-shell -p postgresql --run \"...\".\n",
      );
    } else {
      process.stderr.write(`ERROR ejecutando psql: ${r.error.message}\n`);
    }
    process.exit(1);
  }
  process.exit(r.status ?? 0);
}

main();
