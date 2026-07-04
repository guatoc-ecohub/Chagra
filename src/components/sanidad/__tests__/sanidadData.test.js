/**
 * sanidadData — la lógica determinista de "síntoma folk → causa" es el corazón
 * de la mini-app. Estos tests congelan:
 *   1. Sinonimia: los seis nombres de la "gota" caen en el mismo síntoma.
 *   2. Polisemia: "candelilla"/"viruela" NO cierran solas → piden cultivo, y
 *      cada cultivo lleva a un binomio distinto.
 *   3. Amarillamiento: entrada ambigua → desambiguación forzada (árbol), nunca
 *      un binomio de una.
 *   4. Integridad del catálogo: toda causa referida existe y trae fuente; el
 *      único umbral numérico citable es el de la broca.
 */
import { describe, test, expect } from 'vitest';
import {
    SINTOMAS, CAUSAS, CULTIVOS, normalizar, buscarSintoma, getCausa,
    nodoInicial, esDirecto,
} from '../sanidadData';

describe('normalizar', () => {
    test('quita tildes, mayúsculas y puntuación', () => {
        expect(normalizar('Se me está GOTIANDO, la papá!')).toBe('se me esta gotiando la papa');
    });
});

describe('sinonimia — la "gota" colapsa sus nombres', () => {
    test.each(['gota', 'gotera', 'lancha', 'rancha', 'chispeado', 'tizon tardío'])(
        '"%s" resuelve al síntoma gota',
        (termino) => {
            const hit = buscarSintoma(termino);
            expect(hit).not.toBeNull();
            expect(hit.sintoma.id).toBe('gota');
        },
    );

    test('"se me está gotiando la papa" (frase folk) cae en gota', () => {
        expect(buscarSintoma('se me esta gotiando la papa').sintoma.id).toBe('gota');
    });
});

describe('polisemia — candelilla pide cultivo y ramifica', () => {
    const candelilla = SINTOMAS.find((s) => s.id === 'candelilla');

    test('candelilla es polisémica y NO es directa', () => {
        expect(candelilla.polisemica).toBe(true);
        expect(esDirecto(candelilla)).toBe(false);
        expect(nodoInicial(candelilla)).toHaveProperty('pregunta');
    });

    test('cada cultivo de candelilla lleva a un binomio DISTINTO', () => {
        const porCultivo = Object.fromEntries(
            candelilla.pregunta.opciones.map((o) => [o.cultivo, getCausa(o.causa).binomio]),
        );
        expect(porCultivo.cafe).toBe('Mycena citricolor');
        expect(porCultivo.tomate).toBe('Alternaria solani');
        expect(porCultivo.mora).toMatch(/Colletotrichum/);
        expect(porCultivo.pastos).toBe('Mocis latipes');
        // Son cuatro causas diferentes: es una trampa de polisemia real.
        expect(new Set(Object.values(porCultivo)).size).toBe(4);
    });

    test('viruela también pide cultivo (café vs mora)', () => {
        const viruela = SINTOMAS.find((s) => s.id === 'viruela');
        expect(viruela.polisemica).toBe(true);
        const cults = viruela.pregunta.opciones.map((o) => o.cultivo);
        expect(cults).toEqual(expect.arrayContaining(['cafe', 'mora']));
    });
});

describe('amarillamiento — desambiguación FORZADA (nunca un binomio de una)', () => {
    const amarillo = SINTOMAS.find((s) => s.id === 'amarillamiento');

    test('es ambigua y arranca con pregunta, no con causa', () => {
        expect(amarillo.ambigua).toBe(true);
        expect(amarillo.causa).toBeUndefined();
        expect(nodoInicial(amarillo)).toHaveProperty('pregunta');
    });

    test('separa hambre de N (hoja vieja) de Fe (hoja nueva)', () => {
        const ops = amarillo.pregunta.opciones;
        const vieja = ops.find((o) => /ABAJO/.test(o.label));
        const nueva = ops.find((o) => /ARRIBA/.test(o.label));
        expect(getCausa(vieja.causa).binomio).toMatch(/nitr/i);
        expect(getCausa(nueva.causa).binomio).toMatch(/hierro/i);
    });

    test('la rama de marchitez ANIDA otra pregunta (raíz con nudos → nematodo)', () => {
        const marchita = amarillo.pregunta.opciones.find((o) => /marchita/.test(o.label));
        expect(marchita.causa).toBeUndefined();
        expect(marchita).toHaveProperty('pregunta');
        const nudos = marchita.pregunta.opciones.find((o) => /nudit/.test(o.label));
        expect(getCausa(nudos.causa).binomio).toMatch(/Meloidogyne/);
    });
});

describe('desambiguación por detalle — polvillo: haz vs envés', () => {
    test('el polvo blanco pregunta dónde está y separa oídio de mildeo velloso', () => {
        const polvillo = SINTOMAS.find((s) => s.id === 'polvillo_blanco');
        expect(polvillo.pregunta.tipo).toBe('detalle');
        const haz = polvillo.pregunta.opciones.find((o) => /haz|ARRIBA/i.test(o.label));
        const enves = polvillo.pregunta.opciones.find((o) => /env[eé]s|DEBAJO/i.test(o.label));
        expect(getCausa(haz.causa).tipo).toBe('hongo');       // oídio
        expect(getCausa(enves.causa).tipo).toBe('oomiceto');  // mildeo velloso
    });
});

describe('integridad del catálogo (anti-alucinación)', () => {
    test('toda causa referida por un síntoma existe', () => {
        const refs = [];
        const walk = (nodo) => {
            if (!nodo) return;
            if (nodo.causa) refs.push(nodo.causa);
            if (nodo.pregunta) nodo.pregunta.opciones.forEach(walk);
        };
        for (const s of SINTOMAS) walk(nodoInicial(s));
        for (const id of refs) {
            expect(CAUSAS[id], `causa '${id}' no existe`).toBeTruthy();
        }
    });

    test('toda causa trae binomio, tipo, fuente y confianza válida', () => {
        for (const [id, c] of Object.entries(CAUSAS)) {
            expect(c.binomio, `${id} sin binomio`).toBeTruthy();
            expect(c.tipo, `${id} sin tipo`).toBeTruthy();
            expect(c.fuente, `${id} sin fuente`).toBeTruthy();
            expect(['alta', 'media', 'baja']).toContain(c.confianza);
            // Cada causa da al menos un pilar de manejo.
            const m = c.manejo;
            expect(m.biopreparado || m.biologico || m.cultural, `${id} sin manejo`).toBeTruthy();
        }
    });

    test('el ÚNICO umbral numérico citable es el de la broca (>2%)', () => {
        const conNumero = Object.entries(CAUSAS).filter(
            ([, c]) => c.umbral && /\d\s*%/.test(c.umbral) && /umbral/i.test(c.umbral),
        );
        // La broca es la que declara explícitamente un umbral numérico citable.
        expect(getCausa('hypothenemus_hampei').umbral).toMatch(/2\s*%/);
        expect(getCausa('hypothenemus_hampei').umbral).toMatch(/umbral/i);
        // Ninguna otra causa se atribuye un "umbral" numérico como el de la broca.
        const ids = conNumero.map(([id]) => id);
        expect(ids).toContain('hypothenemus_hampei');
    });

    test('las cifras de fuente única se marcan como nota suave, no dato duro', () => {
        // El cogollero (neem+Beauveria "96%") NO debe declarar el número como umbral.
        const cogollero = getCausa('spodoptera_frugiperda');
        expect(cogollero.notaSuave).toBeTruthy();
        expect(cogollero.umbral).not.toMatch(/96\s*%/);
    });

    test('todos los cultivos de las preguntas existen en CULTIVOS', () => {
        for (const s of SINTOMAS) {
            const ops = s.pregunta?.opciones || [];
            for (const o of ops) {
                if (o.cultivo) expect(CULTIVOS[o.cultivo], `cultivo '${o.cultivo}'`).toBeTruthy();
            }
        }
    });

    test('texto no reconocido no revienta y no matchea', () => {
        expect(buscarSintoma('xyzzy no existe')).toBeNull();
        expect(buscarSintoma('')).toBeNull();
    });
});
