/*
 * i18n (ADR-050): copy de navegación en español Colombia, pendiente de migrar a
 * src/config/messages.js — mismo criterio que DashboardLive.jsx.
 */
import { Globe2 } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import { MUNDOS_FINCA, getMundo } from './dashboard/mundosFinca';
import MundoVineta from './dashboard/MundoVinetas';
import './dashboard/mundos-finca.css';

/**
 * MundoScreen — un MUNDO de la finca por dentro (ruta 'mundo', data { mundo }).
 *
 * La pantalla que agrupa las funciones de un mundo (reestructuración 2.0 del
 * home): cabecera con la viñeta ilustrada del lugar + su lema, y debajo las
 * entradas como filas generosas (una por función real de App.jsx). NO
 * reimplementa ninguna pantalla: cada fila RE-RUTEA a la vista existente.
 *
 * El agente queda siempre a la mano: el pie ofrece "Pregúntele a Chagra"
 * con el contexto del mundo.
 *
 * Fallback honesto: si llega un id desconocido (deep-link viejo, recarga sin
 * data), muestra el índice de TODOS los mundos en vez de un error.
 *
 * @param {Object} props
 * @param {string} [props.mundoId]  id del mundo (mundosFinca.js).
 * @param {Function} props.onBack   volver al home.
 * @param {(view: string, data?: any) => void} props.onNavigate
 */
export default function MundoScreen({ mundoId, onBack, onNavigate }) {
    const mundo = getMundo(mundoId);

    if (!mundo) {
        // Índice de mundos: recarga o enlace sin data → se ofrece el mapa
        // completo, nunca una pantalla rota.
        return (
            <ScreenShell title="Los mundos de su finca" icon={Globe2} onBack={onBack}>
                <div className="max-w-2xl mx-auto p-4" data-testid="mundo-indice">
                    <p className="mf-indice-intro">
                        Elija un mundo para ver sus herramientas.
                    </p>
                    <div className="mf-indice">
                        {MUNDOS_FINCA.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                className="mf-indice-item"
                                style={{ '--mf-a': m.tinte[0], '--mf-b': m.tinte[1] }}
                                onClick={() => (m.directo
                                    ? onNavigate?.(m.directo.view, m.directo.data)
                                    : onNavigate?.('mundo', { mundo: m.id }))}
                                aria-label={`${m.titulo}: ${m.lema}`}
                            >
                                <span aria-hidden="true" className="mf-indice-emoji">{m.emoji}</span>
                                <span className="mf-indice-txt">
                                    <b>{m.titulo}</b>
                                    <small>{m.lema}</small>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </ScreenShell>
        );
    }

    const entradas = mundo.entradas || [];

    return (
        <ScreenShell title={mundo.titulo} onBack={onBack}>
            <div
                className="max-w-2xl mx-auto p-4 mf-mundo"
                style={{ '--mf-a': mundo.tinte[0], '--mf-b': mundo.tinte[1] }}
                data-testid={`mundo-screen-${mundo.id}`}
            >
                {/* Portada del mundo: la misma viñeta de la tarjeta, en grande. */}
                <div className="mf-mundo-hero" aria-hidden="true">
                    <MundoVineta mundoId={mundo.id} />
                    <span className="mf-mundo-emoji">{mundo.emoji}</span>
                </div>
                <p className="mf-mundo-lema">{mundo.lema}</p>

                {/* Las funciones del mundo — cada una re-rutea a su pantalla real. */}
                <nav className="mf-entradas" aria-label={`Herramientas de ${mundo.titulo}`}>
                    {entradas.map((e) => (
                        <button
                            key={e.view}
                            type="button"
                            className="mf-entrada"
                            data-testid={`entrada-${e.view}`}
                            onClick={() => onNavigate?.(e.view, e.data)}
                            aria-label={`${e.label}: ${e.desc}`}
                        >
                            <span className="mf-entrada-icono" aria-hidden="true">{e.emoji}</span>
                            <span className="mf-entrada-txt">
                                <b>{e.label}</b>
                                <small>{e.desc}</small>
                            </span>
                            <span className="mf-entrada-ir" aria-hidden="true">→</span>
                        </button>
                    ))}
                </nav>

                {/* El agente siempre presente, con el contexto del mundo. */}
                <button
                    type="button"
                    className="mf-agente"
                    data-testid="mundo-agente"
                    onClick={() => onNavigate?.('agente')}
                    aria-label={`Pregúntele a Chagra sobre ${mundo.titulo.toLowerCase()}`}
                >
                    <span aria-hidden="true">💬</span>
                    <span>
                        <b>Pregúntele a Chagra</b>
                        <small>Cualquier duda sobre {mundo.titulo.toLowerCase()}, con su fuente.</small>
                    </span>
                </button>
            </div>
        </ScreenShell>
    );
}
