/*
 * i18n (ADR-050): copy campesino en español Colombia, pendiente de migrar a
 * src/config/messages.js — mismo criterio que DashboardLive.jsx.
 */
import { useMemo, useState } from 'react';
import {
    CULTIVOS_GDD,
    CULTIVO_GDD_BY_ID,
    PISOS_TERMICOS,
    gddDia,
    gddAcumulado,
    diasTranscurridos,
    estimarEtapa,
    compararRitmo,
} from '../../services/gradosDiaCalculator';

/**
 * CalculadoraGradosDia — el "reloj térmico" del cultivo, determinista.
 *
 * Deja al campesino ver POR QUÉ la misma mata tarda más en tierra fría: cuenta
 * el calor (grados-día) que acumula por encima de su temperatura base, no los
 * días del calendario. Todo el cálculo vive en gradosDiaCalculator.js (funciones
 * puras, groundeadas). Esta pantalla solo arma los controles y muestra números.
 *
 * Honestidad: los umbrales de etapa por GDD están grounded-pendiente; la etapa
 * se estima por la fenología en DÍAS que sí está groundeada (AGROSAVIA/ICA). Los
 * presets de piso térmico son referencia editable.
 *
 * @param {Object} props
 * @param {string} [props.className]
 */
export default function CalculadoraGradosDia({ className = '' }) {
    const [cultivoId, setCultivoId] = useState('maiz');
    const [pisoId, setPisoId] = useState('frio');
    const [tmin, setTmin] = useState(7);
    const [tmax, setTmax] = useState(19);
    const [tbManual, setTbManual] = useState(10);
    const [fecha, setFecha] = useState('');

    const cultivo = CULTIVO_GDD_BY_ID[cultivoId] || CULTIVOS_GDD[0];
    const tb = cultivoId === 'manual' ? Number(tbManual) : cultivo.tb;
    const to = cultivoId === 'manual' ? null : cultivo.to;

    // Aplica un preset de piso térmico (referencia editable).
    const aplicarPiso = (id) => {
        const p = PISOS_TERMICOS.find((x) => x.id === id);
        if (!p) return;
        setPisoId(id);
        setTmin(p.tmin);
        setTmax(p.tmax);
    };

    const nTmin = Number(tmin);
    const nTmax = Number(tmax);

    const porDia = useMemo(
        () => Math.round(gddDia(nTmin, nTmax, tb, to) * 10) / 10,
        [nTmin, nTmax, tb, to],
    );

    // Días desde la siembra (si dieron fecha) y GDD acumulados a hoy.
    const dds = useMemo(() => (fecha ? diasTranscurridos(fecha) : null), [fecha]);
    const acumulado = useMemo(
        () => (dds != null ? gddAcumulado(nTmin, nTmax, tb, to, dds) : null),
        [dds, nTmin, nTmax, tb, to],
    );
    const etapa = useMemo(
        () => (dds != null ? estimarEtapa(cultivoId, dds) : null),
        [cultivoId, dds],
    );

    // Comparación tierra fría vs templada (evidencia del "tarda más").
    const ritmo = useMemo(() => compararRitmo(cultivoId, 'templado', 'frio'), [cultivoId]);

    const tempsInvalidas = !(Number.isFinite(nTmin) && Number.isFinite(nTmax)) || nTmax < nTmin;

    return (
        <div className={`mch-calc ${className}`} data-testid="calc-grados-dia">
            <p className="mch-calc-intro">
                Los <b>grados-día</b> cuentan el calor que junta la mata, no los días del
                almanaque. En tierra fría junta menos calor por día — por eso tarda más.
            </p>

            {/* 1 · Cultivo */}
            <fieldset className="mch-calc-grupo">
                <legend>1 · ¿Qué sembró?</legend>
                <div className="mch-calc-chips" role="radiogroup" aria-label="Cultivo">
                    {CULTIVOS_GDD.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            role="radio"
                            aria-checked={cultivoId === c.id}
                            className={`mch-chip ${cultivoId === c.id ? 'is-on' : ''}`}
                            onClick={() => setCultivoId(c.id)}
                            data-testid={`calc-cultivo-${c.id}`}
                        >
                            <span aria-hidden="true">{c.emoji}</span> {c.nombre}
                        </button>
                    ))}
                </div>
                {cultivoId === 'manual' ? (
                    <label className="mch-calc-campo">
                        Temperatura base (°C)
                        <input
                            type="number"
                            inputMode="decimal"
                            value={tbManual}
                            min={0}
                            max={20}
                            step={0.5}
                            onChange={(e) => setTbManual(e.target.value)}
                            data-testid="calc-tb-manual"
                        />
                    </label>
                ) : (
                    <p className="mch-calc-nota">
                        Base <b>{tb} °C</b>{to != null ? `, tope ${to} °C` : ''}. {cultivo.tbNota}{' '}
                        <span className="mch-fuente">({cultivo.fuente})</span>
                    </p>
                )}
            </fieldset>

            {/* 2 · Clima del lugar */}
            <fieldset className="mch-calc-grupo">
                <legend>2 · ¿Cómo es el clima de su finca?</legend>
                <div className="mch-calc-chips" role="radiogroup" aria-label="Piso térmico">
                    {PISOS_TERMICOS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            role="radio"
                            aria-checked={pisoId === p.id}
                            className={`mch-chip ${pisoId === p.id ? 'is-on' : ''}`}
                            onClick={() => aplicarPiso(p.id)}
                            data-testid={`calc-piso-${p.id}`}
                        >
                            {p.nombre}
                            <small>{p.rango}</small>
                        </button>
                    ))}
                </div>
                <div className="mch-calc-temps">
                    <label className="mch-calc-campo">
                        Mínima de la noche (°C)
                        <input
                            type="number"
                            inputMode="decimal"
                            value={tmin}
                            step={0.5}
                            onChange={(e) => { setTmin(e.target.value); setPisoId(''); }}
                            data-testid="calc-tmin"
                        />
                    </label>
                    <label className="mch-calc-campo">
                        Máxima del día (°C)
                        <input
                            type="number"
                            inputMode="decimal"
                            value={tmax}
                            step={0.5}
                            onChange={(e) => { setTmax(e.target.value); setPisoId(''); }}
                            data-testid="calc-tmax"
                        />
                    </label>
                </div>
                <p className="mch-calc-nota">
                    Valores de referencia por piso térmico — <b>ajústelos a su finca</b>.
                </p>
            </fieldset>

            {/* Resultado por día */}
            {tempsInvalidas ? (
                <p className="mch-calc-aviso" role="status">
                    Revise las temperaturas: la máxima del día no puede ser menor que la
                    mínima de la noche.
                </p>
            ) : (
                <div className="mch-calc-resultado" role="status" aria-live="polite">
                    <div className="mch-calc-big">
                        <b data-testid="calc-por-dia">{porDia}</b>
                        <span>grados-día por día</span>
                    </div>
                    {ritmo && Number.isFinite(ritmo.factor) && ritmo.factor > 1 && (
                        <p className="mch-calc-porque">
                            En tierra templada esta mata juntaría <b>{ritmo.calido}</b> °D/día
                            y en tierra fría <b>{ritmo.frio}</b> °D/día: por eso en lo frío va{' '}
                            <b>~{ritmo.factor}×</b> más despacio.
                        </p>
                    )}
                </div>
            )}

            {/* 3 · Fecha de siembra → etapa y acumulado */}
            <fieldset className="mch-calc-grupo">
                <legend>3 · ¿Cuándo sembró? <small>(opcional)</small></legend>
                <label className="mch-calc-campo">
                    Fecha de siembra
                    <input
                        type="date"
                        value={fecha}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setFecha(e.target.value)}
                        data-testid="calc-fecha"
                    />
                </label>
                {dds != null && !tempsInvalidas && (
                    <div className="mch-calc-etapa" data-testid="calc-etapa">
                        <p>
                            Van <b>{dds}</b> días desde la siembra ·{' '}
                            <b>{acumulado}</b> grados-día acumulados.
                        </p>
                        {etapa ? (
                            <>
                                <p className="mch-calc-etapa-actual">
                                    <span aria-hidden="true">📍</span> Según la fenología, va en{' '}
                                    <b>{etapa.actual.label}</b> — {etapa.actual.desc}.
                                </p>
                                {etapa.proxima && (
                                    <p className="mch-calc-etapa-prox">
                                        Sigue <b>{etapa.proxima.label}</b> en ~{etapa.diasParaProxima}{' '}
                                        días.
                                    </p>
                                )}
                                <p className="mch-calc-nota">
                                    Etapa por días de fenología{' '}
                                    <span className="mch-fuente">({cultivo.fenologiaFuente})</span>. Los
                                    umbrales de etapa por grados-día están en camino.
                                </p>
                            </>
                        ) : (
                            <p className="mch-calc-nota">
                                Para este cultivo aún no cargamos la fenología en días — el dato
                                está en camino. El acumulado de grados-día sí es exacto.
                            </p>
                        )}
                    </div>
                )}
            </fieldset>

            <p className="mch-calc-pie">
                Los rangos son envolventes de adaptación, no reglas duras: varían por
                variedad, microclima y manejo. Cálculo determinista; sin conexión.
            </p>
        </div>
    );
}
