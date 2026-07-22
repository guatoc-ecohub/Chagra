/**
 * T49 — Modo lectura para adultos mayores (letra grande).
 *
 * Toggle que escala font-size de 14px a 18px en toda la app.
 * Persiste en localStorage. No es un tema nuevo — es un modificador.
 */
import { useState, useEffect, useCallback } from 'react';

const KEY = 'chagra:modo-lectura';

/** @returns {{ activo: boolean, toggle: () => void }} */
export function useModoLectura() {
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY) === '1';
    setActivo(saved);
    if (saved) document.documentElement.classList.add('chagra-lectura-grande');
  }, []);

  const toggle = useCallback(() => {
    const next = !activo;
    setActivo(next);
    try { localStorage.setItem(KEY, next ? '1' : '0'); } catch {}
    if (next) document.documentElement.classList.add('chagra-lectura-grande');
    else document.documentElement.classList.remove('chagra-lectura-grande');
  }, [activo]);

  return { activo, toggle };
}

/** CSS para inyectar en el tema: .chagra-lectura-grande { font-size: 18px; } */
export const CSS_LECTURA_GRANDE = `
.chagra-lectura-grande { font-size: 18px !important; line-height: 1.6 !important; }
.chagra-lectura-grande .text-xs { font-size: 14px !important; }
.chagra-lectura-grande .text-sm { font-size: 16px !important; }
.chagra-lectura-grande button { min-height: 44px; min-width: 44px; }
`;
