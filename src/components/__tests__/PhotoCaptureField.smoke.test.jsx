import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../db/dbCore', () => ({ openDB: vi.fn(() => Promise.resolve({})), STORES: { MEDIA_CACHE: 'media_cache' } }));
vi.mock('../../services/photoService', () => ({
  captureAndCompress: vi.fn(() => Promise.resolve({ blob: new Blob(), width: 100, height: 100, originalSize: 1000, compressedSize: 500, mime: 'image/jpeg', quality: 0.82 })),
  savePhoto: vi.fn(() => Promise.resolve(1)),
}));

import PhotoCaptureField from '../PhotoCaptureField.jsx';

describe('PhotoCaptureField — smoke', () => {
  it('monta sin crashear', () => {
    const { container } = render(
      <PhotoCaptureField onPhoto={() => {}} />
    );
    expect(container).toBeTruthy();
  });

  it('muestra boton de camara', () => {
    render(<PhotoCaptureField onPhoto={() => {}} />);
    const cam = screen.getByLabelText('Tomar foto con camara');
    expect(cam).toBeTruthy();
  });
});
