import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Bean, Sprout, Leaf, Flower2, Apple, ShoppingBasket, Package, Recycle } from 'lucide-react';
import EtapaCicloIcon from './EtapaCicloIcon.jsx';
import { getEtapaIcon, ETAPA_CODE_ICONS } from './etapaCicloIcons.js';

// Set compartido de iconos por etapa de ciclo de vida (feedback operador
// 2026-07): un glifo DISTINTO por etapa, resuelto por código FarmOS o por
// label en español, con fallback que nunca deja un hueco.

describe('getEtapaIcon — por código', () => {
  it('cada código de fenología tiene su glifo propio', () => {
    expect(getEtapaIcon({ code: 'sowing' })).toBe(Bean);
    expect(getEtapaIcon({ code: 'emergence' })).toBe(Sprout);
    expect(getEtapaIcon({ code: 'vegetative' })).toBe(Leaf);
    expect(getEtapaIcon({ code: 'flowering' })).toBe(Flower2);
    expect(getEtapaIcon({ code: 'fruiting' })).toBe(Apple);
    expect(getEtapaIcon({ code: 'harvest_window' })).toBe(ShoppingBasket);
    expect(getEtapaIcon({ code: 'closed' })).toBe(Recycle);
  });

  it('los 7 códigos de cultivo son glifos únicos entre sí', () => {
    const codes = ['sowing', 'emergence', 'vegetative', 'flowering', 'fruiting', 'harvest_window', 'closed'];
    const icons = codes.map((c) => ETAPA_CODE_ICONS[c]);
    expect(new Set(icons).size).toBe(codes.length);
  });

  it('tolera el sufijo _confirmed de stageConfirmationService', () => {
    expect(getEtapaIcon({ code: 'flowering_confirmed' })).toBe(Flower2);
  });
});

describe('getEtapaIcon — por nombre en español', () => {
  it('matchea los labels de guias-demo (Germinación → Producto)', () => {
    expect(getEtapaIcon({ nombre: 'Germinación' })).toBe(Sprout);
    expect(getEtapaIcon({ nombre: 'Vegetativo' })).toBe(Leaf);
    expect(getEtapaIcon({ nombre: 'Floración' })).toBe(Flower2);
    expect(getEtapaIcon({ nombre: 'Fructificación' })).toBe(Apple);
    expect(getEtapaIcon({ nombre: 'Cosecha' })).toBe(ShoppingBasket);
    expect(getEtapaIcon({ nombre: 'Producto' })).toBe(Package);
  });

  it('Poscosecha NO cae en Cosecha (substring)', () => {
    expect(getEtapaIcon({ nombre: 'Poscosecha' })).toBe(Package);
  });

  it('fallback Sprout: nunca un hueco', () => {
    expect(getEtapaIcon({ nombre: 'etapa inventada' })).toBe(Sprout);
    expect(getEtapaIcon({})).toBe(Sprout);
    expect(getEtapaIcon()).toBe(Sprout);
  });
});

describe('<EtapaCicloIcon />', () => {
  it('renderiza un svg aria-hidden con el tamaño pedido', () => {
    const { container } = render(<EtapaCicloIcon code="flowering" size={13} className="text-emerald-400" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('width')).toBe('13');
    expect(svg.classList.contains('text-emerald-400')).toBe(true);
  });
});
