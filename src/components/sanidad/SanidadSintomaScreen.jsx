/* i18n (ADR-050): copy campesino en español Colombia, pendiente de migrar a
 * src/config/messages.js — mismo criterio que MundoScreen.jsx / SoilDiagnostic. */
import { useMemo, useState } from 'react';
import { Stethoscope, Search, ArrowLeft, MessageCircle, Leaf, ShieldCheck, Bug } from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import SanidadSintomaVineta from './SanidadSintomaVinetas';
import {
    SINTOMAS, CULTIVOS, getCausa, buscarSintoma, nodoInicial,
    CONFIANZA_META, TIPO_META,
} from './sanidadData';
import './sanidad-sintoma.css';

/**
 * SanidadSintomaScreen — la mini-app insignia de "Sanidad de la mata".
 *
 * La necesidad #1 del campesino: "mi mata está enferma". El campesino describe
 * el SÍNTOMA en SU lenguaje ("gota", "candelilla", "polvillo", "se seca de la
 * punta") → la app DESAMBIGUA de forma determinista (pregunta el cultivo cuando
 * el nombre es polisémico; fuerza el desglose cuando es amarillamiento) → y
 * muestra la CAUSA (binomio), el MANEJO agroecológico por 3 pilares
 * (biopreparado / control biológico / cultural), el UMBRAL si existe, la
 * confianza y la fuente.
 *
 * Identidad: cuaderno de campo (papel crema, tinta oscura, Baloo 2), cálida
 * campesina. Legible al sol, respeta reduced-motion, coherente sobre los 4
 * temas (las láminas son papel, no dependen del tema).
 *
 * Grounded en los DR verificados (AGROSAVIA, Cenicafé, SciELO, FAO/IPM). Las
 * DOSIS exactas de biopreparados quedan como GROUNDED-PENDIENTE (aviso visible).
 *
 * @param {Object} props
 * @param {Function} [props.onBack]
 * @param {Function} [props.onHome]
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */
export default function SanidadSintomaScreen({ onBack, onHome, onNavigate }) {
    // Estados del flujo: 'buscar' (elegir/escribir síntoma) → 'preguntar'
    // (desambiguar) → 'resultado' (causa + manejo).
    const [texto, setTexto] = useState('');
    const [sintoma, setSintoma] = useState(/** @type {any} */(null));
    // Pila de nodos: el nodo actual es el último. Empezar con el nodo inicial.
    const [nodo, setNodo] = useState(/** @type {any} */(null));
    // Camino de respuestas elegidas (para el "hilo" del cuaderno).
    const [camino, setCamino] = useState(/** @type {string[]} */([]));
    const [noEncontrado, setNoEncontrado] = useState(false);

    // Sugerencias mientras escribe (determinista, por término).
    const sugeridos = useMemo(() => {
        const q = texto.trim();
        if (!q || q.length < 2) return [];
        const hit = buscarSintoma(q);
        if (!hit) return [];
        // Sugerimos hasta 4 síntomas cuyos términos empiecen o contengan el texto.
        return SINTOMAS.filter((s) => s.terminos.some((t) => t.toLowerCase().includes(q.toLowerCase()))).slice(0, 4);
    }, [texto]);

    function abrir(s) {
        setSintoma(s);
        setNodo(nodoInicial(s));
        setCamino([]);
        setNoEncontrado(false);
        setTexto('');
    }

    function buscar() {
        const hit = buscarSintoma(texto);
        if (hit) abrir(hit.sintoma);
        else setNoEncontrado(true);
    }

    function elegirOpcion(op) {
        setCamino((c) => [...c, op.cultivo ? CULTIVOS[op.cultivo]?.label || op.cultivo : op.label]);
        if (op.pregunta) setNodo({ pregunta: op.pregunta });
        else setNodo({ causa: op.causa });
    }

    function reiniciar() {
        setSintoma(null);
        setNodo(null);
        setCamino([]);
        setNoEncontrado(false);
        setTexto('');
    }

    const causa = nodo?.causa ? getCausa(nodo.causa) : null;

    return (
        <ScreenShell title="Sanidad de la mata" icon={Stethoscope} onBack={onBack} onHome={onHome}>
            <div className="san-wrap" data-testid="sanidad-sintoma">
                {/* ── Portada / intro del cuaderno ─────────────────────────── */}
                {!sintoma && (
                    <SanidadInicio
                        texto={texto}
                        setTexto={setTexto}
                        onBuscar={buscar}
                        sugeridos={sugeridos}
                        noEncontrado={noEncontrado}
                        onElegir={abrir}
                        onAgente={() => onNavigate?.('agente')}
                    />
                )}

                {/* ── Desambiguación (pregunta cultivo / detalle) ──────────── */}
                {sintoma && nodo?.pregunta && (
                    <SanidadPregunta
                        sintoma={sintoma}
                        pregunta={nodo.pregunta}
                        camino={camino}
                        onElegir={elegirOpcion}
                        onReiniciar={reiniciar}
                    />
                )}

                {/* ── Resultado: causa + manejo agroecológico ──────────────── */}
                {sintoma && causa && (
                    <SanidadResultado
                        sintoma={sintoma}
                        causa={causa}
                        camino={camino}
                        onReiniciar={reiniciar}
                        onAgente={() => onNavigate?.('agente')}
                        onBiopreparados={() => onNavigate?.('biopreparados', { back: 'dashboard' })}
                        onDefensores={() => onNavigate?.('defensores')}
                    />
                )}
            </div>
        </ScreenShell>
    );
}

/* ── Pantalla 1: elegir / escribir el síntoma ──────────────────────────────── */
function SanidadInicio({ texto, setTexto, onBuscar, sugeridos, noEncontrado, onElegir, onAgente }) {
    return (
        <div className="san-inicio">
            {/* La lámina de esperanza: hoja enferma → camino del manejo → hoja
                sana. La tesis de la mini-app dibujada antes de leer nada. */}
            <div className="san-portada" aria-hidden="true">
                <SanidadSintomaVineta nombre="portadaEsperanza" />
            </div>
            <h2 className="san-h2">¿Qué le pasa a su mata?</h2>
            <p className="san-lead">
                Cuénteme con sus palabras lo que ve — "se me está gotiando la papa",
                "le salió polvillo", "se seca de la punta". Yo le ayudo a saber qué es
                y cómo manejarlo sin veneno.
            </p>

            {/* Los 3 pasos reales del flujo — para que sepa qué viene. */}
            <ol className="san-pasos" aria-label="Cómo funciona, en tres pasos">
                <li className="san-paso">
                    <span className="san-paso-n" aria-hidden="true">1</span>
                    <span><b>Mire</b> la mata con calma</span>
                </li>
                <li className="san-paso">
                    <span className="san-paso-n" aria-hidden="true">2</span>
                    <span><b>Cuénteme</b> lo que le ve</span>
                </li>
                <li className="san-paso">
                    <span className="san-paso-n" aria-hidden="true">3</span>
                    <span><b>Remedio</b> sin veneno, con fuente</span>
                </li>
            </ol>

            <form
                className="san-buscar"
                onSubmit={(e) => { e.preventDefault(); onBuscar(); }}
            >
                <Search size={18} className="san-buscar-ico" aria-hidden="true" />
                <input
                    type="text"
                    className="san-input"
                    placeholder="Escriba el síntoma…"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    aria-label="Escriba lo que le ve a su mata"
                    autoComplete="off"
                />
                <button type="submit" className="san-buscar-btn">Buscar</button>
            </form>

            {sugeridos.length > 0 && (
                <div className="san-sugeridos" data-testid="san-sugeridos">
                    {sugeridos.map((s) => (
                        <button key={s.id} type="button" className="san-sug" onClick={() => onElegir(s)}>
                            <span aria-hidden="true">{s.emoji}</span> {s.label}
                        </button>
                    ))}
                </div>
            )}

            {noEncontrado && (
                <div className="san-nohay" role="status">
                    <p>No reconozco ese síntoma todavía. Elija uno de la lista o
                        pregúntele a Chagra con más detalle.</p>
                    <button type="button" className="san-agente-mini" onClick={onAgente}>
                        <MessageCircle size={16} aria-hidden="true" /> Pregúntele a Chagra
                    </button>
                </div>
            )}

            <h3 className="san-h3">O toque el que se parezca a lo suyo</h3>
            <div className="san-grid" role="list">
                {SINTOMAS.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        className="san-card"
                        role="listitem"
                        data-testid={`san-sintoma-${s.id}`}
                        onClick={() => onElegir(s)}
                        aria-label={`${s.label}: ${s.pista}`}
                    >
                        <span className="san-card-vineta" aria-hidden="true">
                            <SanidadSintomaVineta nombre={s.vineta} />
                            {(s.polisemica || s.ambigua) && (
                                <span className="san-card-flag" title="Nombre que cambia según el cultivo">?</span>
                            )}
                        </span>
                        <span className="san-card-txt">{s.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ── Pantalla 2: desambiguación ────────────────────────────────────────────── */
function SanidadPregunta({ sintoma, pregunta, camino, onElegir, onReiniciar }) {
    const esCultivo = pregunta.tipo === 'cultivo';
    return (
        <div className="san-pregunta" data-testid="san-pregunta">
            <button type="button" className="san-volver" onClick={onReiniciar}>
                <ArrowLeft size={16} aria-hidden="true" /> Otro síntoma
            </button>

            <div className="san-sintoma-head">
                <span className="san-sintoma-vineta" aria-hidden="true">
                    <SanidadSintomaVineta nombre={sintoma.vineta} />
                </span>
                <div>
                    <b>{sintoma.label}</b>
                    <p>{sintoma.pista}</p>
                </div>
            </div>

            {sintoma.ambigua && (
                <div className="san-aviso san-aviso--forzado" role="note">
                    <b>Ojo:</b> el amarillo puede ser hambre de la mata, virus, un
                    gusanito de la raíz o exceso de agua. NO le puedo dar un solo
                    culpable sin mirar más. Vamos por partes.
                </div>
            )}
            {sintoma.polisemica && (
                <div className="san-aviso" role="note">
                    <b>"{sintoma.label}"</b> es un nombre que cambia según el cultivo.
                    Dígame en cuál lo vio para no equivocarme.
                </div>
            )}

            {camino.length > 0 && (
                <p className="san-hilo">Ya me dijo: {camino.join(' · ')}</p>
            )}

            <p className="san-pregunta-txt">{pregunta.texto}</p>
            <div className={`san-opciones ${esCultivo ? 'san-opciones--cultivo' : ''}`}>
                {pregunta.opciones.map((op, i) => {
                    const cult = op.cultivo ? CULTIVOS[op.cultivo] : null;
                    return (
                        <button
                            key={op.cultivo || op.label || i}
                            type="button"
                            className="san-opcion"
                            data-testid={`san-opcion-${op.cultivo || i}`}
                            onClick={() => onElegir(op)}
                        >
                            <span className="san-opcion-ico" aria-hidden="true">
                                {cult ? cult.emoji : (op.emoji || '•')}
                            </span>
                            <span>{cult ? cult.label : op.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Pantalla 3: resultado (causa + 3 pilares de manejo) ───────────────────── */
function SanidadResultado({ sintoma, causa, camino, onReiniciar, onAgente, onBiopreparados, onDefensores }) {
    const conf = CONFIANZA_META[causa.confianza] || CONFIANZA_META.media;
    const tipo = TIPO_META[causa.tipo] || { label: causa.tipo, emoji: '•' };
    const hayBio = !!causa.manejo.biologico;
    return (
        <div className="san-resultado" data-testid="san-resultado">
            <button type="button" className="san-volver" onClick={onReiniciar}>
                <ArrowLeft size={16} aria-hidden="true" /> Otro síntoma
            </button>

            <div className="san-sintoma-head">
                <span className="san-sintoma-vineta" aria-hidden="true">
                    <SanidadSintomaVineta nombre={sintoma.vineta} />
                </span>
                <div>
                    <small className="san-de">Lo que usted vio</small>
                    <b>{sintoma.label}{camino.length > 0 ? ` · ${camino.join(' · ')}` : ''}</b>
                </div>
            </div>

            {/* Causa (binomio) */}
            <div className="san-causa" data-testid="san-causa">
                <div className="san-causa-top">
                    <span className="san-tipo">{tipo.emoji} {tipo.label}</span>
                    <span className={`san-conf san-conf--${causa.confianza}`} title={conf.label}>
                        {'●'.repeat(conf.dots)}{'○'.repeat(3 - conf.dots)} {conf.label}
                    </span>
                </div>
                <p className="san-causa-nombre">Es <b>{causa.nombreComun}</b></p>
                <p className="san-binomio"><i>{causa.binomio}</i></p>
            </div>

            {sintoma.nota && <div className="san-aviso" role="note"><b>Ojo:</b> {sintoma.nota}</div>}
            {causa.notaSuave && (
                <div className="san-aviso san-aviso--suave" role="note">{causa.notaSuave}</div>
            )}

            {/* Umbral (solo cuando existe uno citable) */}
            {causa.umbral && (
                <div className="san-umbral" data-testid="san-umbral">
                    <b>¿Cuándo actuar?</b>
                    <p>{causa.umbral}</p>
                </div>
            )}

            {/* Los 3 pilares del manejo agroecológico */}
            <h3 className="san-h3">Manejo agroecológico</h3>
            <div className="san-pilares">
                {causa.manejo.biopreparado && (
                    <Pilar icon={Leaf} titulo="Remedio casero (biopreparado)" texto={causa.manejo.biopreparado} clase="bio" />
                )}
                {hayBio && (
                    <Pilar icon={Bug} titulo="Los bichos que lo ayudan" texto={causa.manejo.biologico} clase="ctrl" />
                )}
                {causa.manejo.cultural && (
                    <Pilar icon={ShieldCheck} titulo="Manejo de la mata (cultural)" texto={causa.manejo.cultural} clase="cult" />
                )}
            </div>

            {/* Prevención (pilar 3 del brief) */}
            {causa.prevencion && (
                <div className="san-prevencion" data-testid="san-prevencion">
                    <b>Para que no vuelva</b>
                    <p>{causa.prevencion}</p>
                </div>
            )}

            {/* El cierre esperanzador: esto tiene manejo, la mata puede volver */}
            <div className="san-esperanza" data-testid="san-esperanza">
                <span className="san-esperanza-vineta" aria-hidden="true">
                    <SanidadSintomaVineta nombre="mataSana" />
                </span>
                <div>
                    <b>Esto tiene manejo</b>
                    <p>
                        Con estos cuidados su mata puede recuperarse. Revísela cada dos
                        o tres días y fíjese si le salen hojas nuevas: esa es la señal
                        de que va ganando.
                    </p>
                </div>
            </div>

            {/* Grounded-pendiente honesto para dosis exactas */}
            {causa.dosisPendiente && (
                <p className="san-pendiente">
                    Las DOSIS exactas del biopreparado están pendientes de verificar con
                    AGROSAVIA / Cenicafé — no se las invento. Antes de aplicar, revise la
                    seguridad del insumo.
                </p>
            )}

            {/* Fuente */}
            <p className="san-fuente">Fuente: <b>{causa.fuente}</b></p>

            {/* Puentes a las herramientas hermanas del mundo */}
            <div className="san-acciones">
                {causa.manejo.biopreparado && (
                    <button type="button" className="san-accion" onClick={onBiopreparados}>
                        🧪 Ver el biopreparado paso a paso
                    </button>
                )}
                {hayBio && (
                    <button type="button" className="san-accion" onClick={onDefensores}>
                        🐞 Conocer los defensores de la finca
                    </button>
                )}
            </div>

            <button type="button" className="san-agente" onClick={onAgente} data-testid="san-agente">
                <MessageCircle size={20} aria-hidden="true" />
                <span>
                    <b>Pregúntele a Chagra</b>
                    <small>Cuéntele su caso con detalle y le da el manejo con su fuente.</small>
                </span>
            </button>
        </div>
    );
}

function Pilar({ icon: Icon, titulo, texto, clase }) {
    return (
        <div className={`san-pilar san-pilar--${clase}`}>
            <span className="san-pilar-ico" aria-hidden="true">{Icon && <Icon size={18} />}</span>
            <div>
                <b>{titulo}</b>
                <p>{texto}</p>
            </div>
        </div>
    );
}
