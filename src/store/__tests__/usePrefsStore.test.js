import { describe, it, expect, beforeEach } from 'vitest';
import usePrefsStore, { AVATAR_CREATURE_DEFAULT } from '../usePrefsStore.js';

/**
 * Tests de usePrefsStore: preferencias persistidas en localStorage (voz, TTS,
 * badges de fuente). Se asercionan los setters (actualizan estado + persisten)
 * y la coerción booleana de los toggles.
 */

beforeEach(() => {
  localStorage.clear();
  // restaura los defaults conocidos en el store singleton
  usePrefsStore.setState({
    voiceRegion: 'auto',
    voiceRegionIntensity: 1,
    ttsEnabled: true,
    showSourceBadges: true,
    avatarCreatureId: AVATAR_CREATURE_DEFAULT,
  });
});

describe('usePrefsStore — defaults', () => {
  it('arranca con los valores por defecto esperados', () => {
    const s = usePrefsStore.getState();
    expect(s.voiceRegion).toBe('auto');
    expect(s.voiceRegionIntensity).toBe(1);
    expect(s.ttsEnabled).toBe(true);
    expect(s.showSourceBadges).toBe(true);
    expect(s.avatarCreatureId).toBe(AVATAR_CREATURE_DEFAULT);
  });
});

describe('setters actualizan estado y persisten', () => {
  it('setVoiceRegion', () => {
    usePrefsStore.getState().setVoiceRegion('cauca');
    expect(usePrefsStore.getState().voiceRegion).toBe('cauca');
    expect(JSON.parse(localStorage.getItem('chagra:prefs:voice-region'))).toBe('cauca');
  });

  it('setVoiceRegionIntensity', () => {
    usePrefsStore.getState().setVoiceRegionIntensity(0.5);
    expect(usePrefsStore.getState().voiceRegionIntensity).toBe(0.5);
    expect(JSON.parse(localStorage.getItem('chagra:prefs:voice-intensity'))).toBe(0.5);
  });

  it('setTtsEnabled persiste y coacciona a booleano', () => {
    usePrefsStore.getState().setTtsEnabled(0);
    expect(usePrefsStore.getState().ttsEnabled).toBe(false);
    expect(JSON.parse(localStorage.getItem('chagra:prefs:tts-enabled'))).toBe(false);
    usePrefsStore.getState().setTtsEnabled('on');
    expect(usePrefsStore.getState().ttsEnabled).toBe(true);
  });

  it('setShowSourceBadges persiste y coacciona a booleano', () => {
    usePrefsStore.getState().setShowSourceBadges(null);
    expect(usePrefsStore.getState().showSourceBadges).toBe(false);
    expect(JSON.parse(localStorage.getItem('chagra:prefs:show-source-badges'))).toBe(false);
  });

  it('setAvatarCreatureId persiste el slug elegido', () => {
    usePrefsStore.getState().setAvatarCreatureId('jaguar');
    expect(usePrefsStore.getState().avatarCreatureId).toBe('jaguar');
    expect(JSON.parse(localStorage.getItem('chagra:prefs:avatar-creature'))).toBe('jaguar');
  });

  it('setAvatarCreatureId con valor vacío/no-string cae al default (abeja)', () => {
    usePrefsStore.getState().setAvatarCreatureId('');
    expect(usePrefsStore.getState().avatarCreatureId).toBe(AVATAR_CREATURE_DEFAULT);
    usePrefsStore.getState().setAvatarCreatureId(null);
    expect(usePrefsStore.getState().avatarCreatureId).toBe(AVATAR_CREATURE_DEFAULT);
  });
});
