/* Harness EFÍMERO de captura (no se commitea): SierraMonte3D con el oso nuevo. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import SierraMonte3D from './src/visual/mundo3d/sierra/SierraMonte3D.jsx';

createRoot(document.getElementById('root')).render(
  <SierraMonte3D tier="alto" reducedMotion={false} />,
);
