/**
 * IosInstallBanner.test.jsx — component-mounting test (issue #100).
 *
 * Reemplaza tests E2E mal scoped (skipados en geolocation-ios.spec.js,
 * photo-capture-field.spec.js, date-field.spec.js, pwa-ios.spec.js) que
 * intentaban encontrar el componente desde page.goto('/') sin navegación
 * adecuada. Aquí el componente se monta directamente en jsdom — sin
 * server, sin Playwright, sin scaffold de DB.
 *
 * Patrón a replicar para los demás componentes UI puros.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import IosInstallBanner from '../../src/components/IosInstallBanner';

const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const DESKTOP_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function setUserAgent(ua) {
  Object.defineProperty(navigator, 'userAgent', {
    get: () => ua,
    configurable: true,
  });
}

function setStandalone(value) {
  Object.defineProperty(navigator, 'standalone', {
    get: () => value,
    configurable: true,
  });
}

describe('IosInstallBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    setStandalone(false);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('muestra el banner en iOS Safari (no standalone, no dismissed)', () => {
    setUserAgent(IOS_UA);
    render(<IosInstallBanner />);
    expect(screen.getByText(/Instalá Chagra/i)).toBeInTheDocument();
    expect(screen.getByText(/tocá/i)).toBeInTheDocument();
  });

  it('NO muestra el banner en Desktop Chrome', () => {
    setUserAgent(DESKTOP_UA);
    render(<IosInstallBanner />);
    expect(screen.queryByText(/Instalá Chagra/i)).not.toBeInTheDocument();
  });

  it('NO muestra el banner en iOS standalone (PWA ya instalada)', () => {
    setUserAgent(IOS_UA);
    setStandalone(true);
    render(<IosInstallBanner />);
    expect(screen.queryByText(/Instalá Chagra/i)).not.toBeInTheDocument();
  });

  it('respeta dismissal previa en localStorage', () => {
    setUserAgent(IOS_UA);
    localStorage.setItem('chagra-ios-install-dismissed', 'true');
    render(<IosInstallBanner />);
    expect(screen.queryByText(/Instalá Chagra/i)).not.toBeInTheDocument();
  });

  it('al dismiss, persiste en localStorage y oculta el banner', () => {
    setUserAgent(IOS_UA);
    render(<IosInstallBanner />);
    expect(screen.getByText(/Instalá Chagra/i)).toBeInTheDocument();

    const closeBtn = screen.getByLabelText(/Cerrar/i);
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Instalá Chagra/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('chagra-ios-install-dismissed')).toBe('true');
  });
});
