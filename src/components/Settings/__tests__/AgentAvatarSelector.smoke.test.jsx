import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AgentAvatarSelector from '../AgentAvatarSelector';

describe('AgentAvatarSelector smoke', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('renderiza las 7 opciones del elenco unificado (colibrí jubilado, maíz retirado)', () => {
        render(<AgentAvatarSelector />);
        expect(screen.getByText('Angelita, la abeja', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByText('Zarigüeya', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByText('Jaguar', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByText('Oso de anteojos', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByText('Luciérnaga', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByText('Chivito de páramo', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByText('Guacamaya', { selector: 'p' })).toBeInTheDocument();
        expect(screen.queryByText(/colibrí/i)).toBeNull();
        expect(screen.queryByText(/maíz/i)).toBeNull();
    });

    it('click en zarigüeya cambia la preferencia y persiste en localStorage', () => {
        render(<AgentAvatarSelector />);
        const zariguyaBtn = screen.getByText('Zarigüeya', { selector: 'p' }).closest('button');
        fireEvent.click(zariguyaBtn);
        expect(zariguyaBtn).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('chagra:agent-avatar-type')).toBe('zariguya');
        const angelitaBtn = screen.getByText('Angelita, la abeja', { selector: 'p' }).closest('button');
        expect(angelitaBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('localStorage zariguya preselecciona zarigüeya al montar', () => {
        localStorage.setItem('chagra:agent-avatar-type', 'zariguya');
        render(<AgentAvatarSelector />);
        const zariguyaBtn = screen.getByText('Zarigüeya', { selector: 'p' }).closest('button');
        expect(zariguyaBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('angelita seleccionada por default', () => {
        render(<AgentAvatarSelector />);
        const angelitaBtn = screen.getByText('Angelita, la abeja', { selector: 'p' }).closest('button');
        expect(angelitaBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('maiz ya NO es una opción del selector (retirado 2026-08-14)', () => {
        render(<AgentAvatarSelector />);
        expect(screen.queryByText('Planta de maíz')).toBeNull();
    });

    it('localStorage maiz (usuario viejo) NO rompe el selector: cae a angelita', () => {
        localStorage.setItem('chagra:agent-avatar-type', 'maiz');
        render(<AgentAvatarSelector />);
        const angelitaBtn = screen.getByText('Angelita, la abeja', { selector: 'p' }).closest('button');
        expect(angelitaBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('slug legacy colibri_svg en localStorage migra a angelita seleccionada', () => {
        localStorage.setItem('chagra:agent-avatar-type', 'colibri_svg');
        render(<AgentAvatarSelector />);
        const angelitaBtn = screen.getByText('Angelita, la abeja', { selector: 'p' }).closest('button');
        expect(angelitaBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('slug legacy colibri en localStorage migra a angelita seleccionada', () => {
        localStorage.setItem('chagra:agent-avatar-type', 'colibri');
        render(<AgentAvatarSelector />);
        const angelitaBtn = screen.getByText('Angelita, la abeja', { selector: 'p' }).closest('button');
        expect(angelitaBtn).toHaveAttribute('aria-pressed', 'true');
    });

    // Ítem #8 del GAP compAI (2026-08-13, ampliado 2026-08-14 con el roster-7
    // completo): jaguar, oso de anteojos, luciérnaga, chivito y guacamaya ya
    // tienen cuerpo 2.5D y `enPWA:true` en el núcleo (#96).
    it.each([
        ['jaguar', 'Jaguar'],
        ['oso-baston', 'Oso de anteojos'],
        ['luciernaga', 'Luciérnaga'],
        ['chivito-punk', 'Chivito de páramo'],
        ['guacamaya', 'Guacamaya'],
    ])('click en %s cambia la preferencia y persiste en localStorage', (slug, label) => {
        render(<AgentAvatarSelector />);
        const btn = screen.getByText(label, { selector: 'p' }).closest('button');
        fireEvent.click(btn);
        expect(btn).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('chagra:agent-avatar-type')).toBe(slug);
        const angelitaBtn = screen.getByText('Angelita, la abeja', { selector: 'p' }).closest('button');
        expect(angelitaBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it.each([
        ['jaguar', 'Jaguar'],
        ['oso-baston', 'Oso de anteojos'],
        ['luciernaga', 'Luciérnaga'],
        ['chivito-punk', 'Chivito de páramo'],
        ['guacamaya', 'Guacamaya'],
    ])('localStorage %s preselecciona esa opción al montar', (slug, label) => {
        localStorage.setItem('chagra:agent-avatar-type', slug);
        render(<AgentAvatarSelector />);
        const btn = screen.getByText(label, { selector: 'p' }).closest('button');
        expect(btn).toHaveAttribute('aria-pressed', 'true');
    });
});
