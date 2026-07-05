/* src/components/common/themePreviewPalettes.js
 * Paleta de PRESENTACIÓN por tema para los mini-previews de la galería
 * (ThemeSelector) y la tira del hub del perfil. Derivada 1:1 de las paletas
 * canónicas de src/index.css (--c-* por tema) y themes.css (--t-accent-rgb).
 * La piel real de la app sale SOLO de la indirección CSS-var
 * (feedback-themes-cssvar-indirection); esto es el afiche de la película.
 * Vive en archivo propio por la regla react-refresh/only-export-components.
 */

export const PREVIEWS = {
  biopunk2: {
    bg: '#0a0e14', card: '#0f172a', border: '#334155', ink: '#f1f5f9',
    accent: '#19c79a', accent2: '#a78bfa',
    skyTop: '#101b33', skyBot: '#123b2e', night: true,
  },
  biopunk: {
    bg: '#0a0e14', card: '#0f172a', border: '#334155', ink: '#f1f5f9',
    accent: '#19c79a', accent2: '#3be8a6',
    skyTop: '#0d2137', skyBot: '#134034', night: true,
  },
  nature: {
    bg: '#f6efe0', card: '#ffffff', border: '#ddc8a6', ink: '#4a3a26',
    accent: '#d98a4f', accent2: '#7a8f4a',
    skyTop: '#ead7b0', skyBot: '#f6efe0', night: false,
  },
  minimalista: {
    bg: '#f6f3ec', card: '#ffffff', border: '#e3ddd0', ink: '#1f2421',
    accent: '#2f6e5a', accent2: '#878d86',
    skyTop: '#d8e2da', skyBot: '#f6f3ec', night: false,
  },
  'verde-vivo': {
    bg: '#eef3e2', card: '#fbfdf4', border: '#c8d6a8', ink: '#1c2a16',
    accent: '#2e8b3d', accent2: '#e0922e',
    skyTop: '#8fd1c2', skyBot: '#e2f0cf', night: false,
  },
};
