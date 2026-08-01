import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelpVoiceRegionalDemo from '../HelpVoiceRegionalDemo';
import usePrefsStore from '../../store/usePrefsStore';
import { describe, test, expect, beforeEach, vi } from 'vitest';

vi.mock('../../store/usePrefsStore');
vi.mock('../HelpVoiceQuestion', () => ({
    __esModule: true,
    default: () => <div data-testid="help-voice-question-mock" />
}));

describe('HelpVoiceRegionalDemo Smoke Test', () => {
    let storeState;

    beforeEach(() => {
        storeState = {
            voiceRegion: 'auto',
            voiceRegionIntensity: 1,
            setVoiceRegion: vi.fn((val) => { storeState.voiceRegion = val; }),
            setVoiceRegionIntensity: vi.fn((val) => { storeState.voiceRegionIntensity = val; })
        };
        vi.mocked(usePrefsStore).mockImplementation((selector) => selector(storeState));
    });

    test('Render with default prefs (auto + sutil)', () => {
        render(<HelpVoiceRegionalDemo onBackToHome={() => { }} />);
        expect(screen.getAllByText(/Automático/i).length).toBeGreaterThan(0);
        expect(screen.getByTestId('help-voice-question-mock')).toBeInTheDocument();
    });

    test('Cambiar región a paisa inline', () => {
        render(<HelpVoiceRegionalDemo onBackToHome={() => { }} />);
        const selects = screen.getAllByRole('combobox');
        const regionSelect = selects.find(s => s.querySelector('option[value="paisa"]'));
        fireEvent.change(regionSelect, { target: { value: 'paisa' } });
        expect(storeState.setVoiceRegion).toHaveBeenCalledWith('paisa');
    });

    test('Click "volver al Manual" invoca callback', () => {
        const onBackToHomeMock = vi.fn();
        render(<HelpVoiceRegionalDemo onBackToHome={onBackToHomeMock} />);

        const backBtn = screen.getByRole('button', { name: /Volver al Manual/i });
        fireEvent.click(backBtn);
        expect(onBackToHomeMock).toHaveBeenCalled();
    });
});
