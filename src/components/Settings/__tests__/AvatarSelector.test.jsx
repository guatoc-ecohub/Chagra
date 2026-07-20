import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import AvatarSelector from '../AvatarSelector';
import usePrefsStore, { AVATAR_CREATURE_DEFAULT } from '../../../store/usePrefsStore';
import { CREATURES } from '../../../visual/creatures/index.js';
import useAvatarCreature, { resolveAvatarCreature } from '../../../hooks/useAvatarCreature';

/**
 * AvatarSelector ("Elija su animal") + useAvatarCreature.
 * La grilla es DATA-DRIVEN del registro CREATURES: se asercionan las opciones
 * contra el registro (no contra una lista a mano), así el test sigue verde
 * cuando aterrice el borugo.
 */

const STORAGE_KEY = 'chagra:prefs:avatar-creature';

beforeEach(() => {
    localStorage.clear();
    usePrefsStore.setState({ avatarCreatureId: AVATAR_CREATURE_DEFAULT });
});

describe('AvatarSelector — grilla data-driven', () => {
    it('renderiza UNA opción por cada creature del registro', () => {
        render(<AvatarSelector />);
        const radios = screen.getAllByRole('radio');
        expect(radios).toHaveLength(Object.keys(CREATURES).length);
        for (const id of Object.keys(CREATURES)) {
            expect(screen.getByTestId(`avatar-opcion-${id}`)).toBeInTheDocument();
        }
    });

    it('la abeja Angelita viene elegida por defecto', () => {
        render(<AvatarSelector />);
        expect(screen.getByTestId('avatar-opcion-abeja-angelita')).toHaveAttribute('aria-checked', 'true');
    });

    it('grupo accesible: radiogroup con label en usted', () => {
        render(<AvatarSelector />);
        expect(screen.getByRole('radiogroup', { name: 'Elija su animal' })).toBeInTheDocument();
    });

    it('tocar un animal lo elige, desmarca el anterior y persiste', () => {
        render(<AvatarSelector />);
        fireEvent.click(screen.getByTestId('avatar-opcion-jaguar'));
        expect(screen.getByTestId('avatar-opcion-jaguar')).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByTestId('avatar-opcion-abeja-angelita')).toHaveAttribute('aria-checked', 'false');
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toBe('jaguar');
        expect(usePrefsStore.getState().avatarCreatureId).toBe('jaguar');
    });

    it('modo compact renderiza el mismo registro completo', () => {
        render(<AvatarSelector compact />);
        expect(screen.getAllByRole('radio')).toHaveLength(Object.keys(CREATURES).length);
    });
});

describe('useAvatarCreature — resolución slug→personaje', () => {
    it('devuelve el default (abeja) sin elección previa', () => {
        const { result } = renderHook(() => useAvatarCreature());
        expect(result.current.id).toBe(AVATAR_CREATURE_DEFAULT);
        expect(result.current.Component).toBe(CREATURES[AVATAR_CREATURE_DEFAULT].Component);
        expect(result.current.nombre).toBe(CREATURES[AVATAR_CREATURE_DEFAULT].nombre);
    });

    it('sigue la elección del store en vivo', () => {
        const { result } = renderHook(() => useAvatarCreature());
        act(() => {
            usePrefsStore.getState().setAvatarCreatureId('oso-guardian');
        });
        expect(result.current.id).toBe('oso-guardian');
        expect(result.current.Component).toBe(CREATURES['oso-guardian'].Component);
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toBe('oso-guardian');
    });

    it('slug desconocido (bicho retirado / typo) cae al default', () => {
        expect(resolveAvatarCreature('borugo-que-no-existe').id).toBe(AVATAR_CREATURE_DEFAULT);
        expect(resolveAvatarCreature(null).id).toBe(AVATAR_CREATURE_DEFAULT);
    });

    it('todo slug del registro resuelve a su propio personaje', () => {
        for (const [id, meta] of Object.entries(CREATURES)) {
            const r = resolveAvatarCreature(id);
            expect(r.id).toBe(id);
            expect(r.Component).toBe(meta.Component);
        }
    });
});
