/*
 * atmosferaMadre — la ATMÓSFERA compartida valle ↔ mundos (coherencia de universo).
 *
 * Problema: el valle vive con niebla + sol direccional + la paleta `CLIMAS`,
 * pero los dioramas heredaban solo hemisferio+ambiente planos → al pasar del
 * valle a un mundo el look se "aplanaba": otra temperatura de luz, sin
 * profundidad aérea, sin sol que modele las caras.
 *
 * Solución: UNA fuente del tono. Este módulo importa la paleta `CLIMAS` del
 * valle (fuente única — si la paleta del valle cambia, los mundos la siguen
 * solos) y deriva para cada diorama:
 *   · el cielo ARMONIZADO: el mundo conserva su identidad (su fondo/suelo
 *     propios) pero adopta la temperatura de la madre, con un peso por clima
 *     (de día la identidad manda; de noche manda la madre — un diorama no
 *     puede quedar diurno cuando el valle está oscuro);
 *   · la luz: los mismos ratios hemisferio/ambiente/sol del valle y la MISMA
 *     dirección del sol, sin sombras (los dioramas siguen frugales, DR §6);
 *   · la niebla: profundidad aérea a escala del diorama, con densidad
 *     proporcional a la del valle (`nieblaLejos`);
 *   · el bloom (SOLO tier 'alto'): parámetros sutiles por clima — presente en
 *     hora dorada y noche, casi imperceptible de día. Tier medio/bajo jamás
 *     llegan aquí: el gate vive en EscenaBase3D.
 */
import * as THREE from 'three';
import { CLIMAS } from '../../mockups/valle/valleData.js';

/* Cielo cálido "acuarela" por defecto (la estética heredada del valle). Antes
   vivía en EscenaBase3D; ahora aquí — es atmósfera, no andamiaje. */
export const CIELO_DEFAULT = { fondo: '#ece0c7', cielo: '#f5e9d2', suelo: '#b49873', intensidad: 1 };

/* La dirección del sol del valle (Valle3D). Compartirla es lo que hace que el
   modelado (caras iluminadas vs. sombreadas) se sienta del mismo universo. */
export const SOL_POSICION = [6, 9, 4];

/* Cuánto "tira" la madre del cielo propio de cada mundo (0 = identidad pura,
   1 = clima puro). La noche y el mal tiempo pesan más: son estados del
   universo entero, no decoración del diorama. */
const PESO_MADRE = { dorada: 0.4, soleado: 0.3, niebla: 0.55, lluvia: 0.6, noche: 0.8 };

/* Bloom sutil por clima (solo tier alto). `threshold` alto = solo brillan
   emisivos y altas luces (el sol de la hora dorada, faroles de noche), nunca
   la acuarela entera; `strength` contenida para no romper el tono. */
const BLOOM = {
  dorada: { strength: 0.5, radius: 0.5, threshold: 0.8 },
  soleado: { strength: 0.25, radius: 0.35, threshold: 0.9 },
  niebla: { strength: 0.2, radius: 0.4, threshold: 0.92 },
  lluvia: { strength: 0.2, radius: 0.4, threshold: 0.92 },
  noche: { strength: 0.6, radius: 0.55, threshold: 0.72 },
};

const mezclar = (a, b, t) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;

/** El clima-madre resuelto (paleta CLIMAS del valle, con fallback seguro). */
export function climaMadre(climaId) {
  return CLIMAS[climaId] || CLIMAS.soleado;
}

/**
 * armonizarCielo — funde el `cielo` propio del arquetipo con la madre.
 * Devuelve todo lo que EscenaBase3D necesita: fondo, colores de luz,
 * intensidad efectiva y el color/densidad de la niebla.
 */
export function armonizarCielo(cielo, climaId = 'soleado') {
  const base = { ...CIELO_DEFAULT, ...(cielo || {}) };
  const madre = climaMadre(climaId);
  const peso = PESO_MADRE[climaId] ?? 0.4;
  const fondo = mezclar(base.fondo, madre.cielo[1], peso);
  return {
    fondo,
    cieloLuz: mezclar(base.cielo, madre.cielo[0], peso),
    suelo: mezclar(base.suelo, madre.ambiente, peso),
    luz: madre.luz, // el color del sol NO se negocia: es la hora del universo
    intensidad: (base.intensidad ?? 1) * madre.intensidad,
    niebla: mezclar(fondo, madre.niebla, 0.5),
    densidadNiebla: madre.nieblaLejos, // escala-valle; nieblaDiorama la traduce
  };
}

/**
 * nieblaDiorama — profundidad aérea a escala del diorama: near/far
 * proporcionales al zoom de entrada y a la claridad del clima (`nieblaLejos`
 * del valle, donde 38 = día despejado y 15 = páramo cerrado).
 */
export function nieblaDiorama(zoom, atm) {
  const claridad = Math.min(1, (atm.densidadNiebla ?? 38) / 38);
  return { color: atm.niebla, near: zoom, far: zoom * (2.6 + 3.0 * claridad) };
}

/** Parámetros de bloom por clima (el gate de tier vive en EscenaBase3D). */
export function bloomMadre(climaId) {
  return BLOOM[climaId] || BLOOM.soleado;
}
