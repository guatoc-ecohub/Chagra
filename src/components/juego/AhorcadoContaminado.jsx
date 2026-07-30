import { useCallback, useMemo, useState } from 'react';
import { Sparkles, ShieldAlert, RotateCcw } from 'lucide-react';
import {
  CATEGORIAS,
  FUENTES,
  PALABRAS,
  PALABRAS_POR_CATEGORIA,
} from '../../data/juegos/ahorcadoContaminado';
import './ahorcado-contaminado.css';

const MAX_ERRORES = 6;
const TECLADO = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

// Los 6 pasos de la metáfora de "contaminación" en vez de horca: la finca se
// va apagando paso a paso. Cada paso suma una etapa visible (planta, suelo,
// agua) para que la penalización sea legible sin dibujar una soga.
const ETAPAS_CONTAMINACION = [
  { emoji: '🌱', clase: 'sana', texto: 'La finca está sana.' },
  { emoji: '🥀', clase: 'paso-1', texto: 'La plantica se empieza a marchitar.' },
  { emoji: '🍂', clase: 'paso-2', texto: 'Las hojas se caen antes de tiempo.' },
  { emoji: '🟤', clase: 'paso-3', texto: 'El suelo se empieza a oscurecer.' },
  { emoji: '💧', clase: 'paso-4', texto: 'El agua de riego se contamina.' },
  { emoji: '🐝', clase: 'paso-5', texto: 'Las abejas y los polinizadores se alejan.' },
  { emoji: '☠️', clase: 'paso-6', texto: 'La finca quedó contaminada del todo.' },
];

function normalizar(letra) {
  return letra.toUpperCase();
}

function elegirPalabra(categoriaId) {
  const banco = categoriaId === 'mezcla' || !categoriaId
    ? PALABRAS
    : (PALABRAS_POR_CATEGORIA[categoriaId] || PALABRAS);
  const idx = Math.floor(Math.random() * banco.length);
  return banco[idx];
}

/**
 * Ahorcado Contaminado — ahorcado clásico con la metáfora de contaminación
 * (Tarea #93). Consume el dataset fundamentado de la Tarea #38
 * (src/data/juegos/ahorcadoContaminado.js): NO inventa palabras ni fuentes.
 *
 * Cada letra errada avanza un paso de contaminación (6 pasos, sin horca).
 * Ganar o perder revela la pista educativa + la fuente (anti-gamificación
 * tóxica: educativo también al perder, no solo al ganar).
 */
export default function AhorcadoContaminado() {
  const [categoriaId, setCategoriaId] = useState('mezcla');
  const [entrada, setEntrada] = useState(() => elegirPalabra('mezcla'));
  const [letrasUsadas, setLetrasUsadas] = useState([]);
  const [errores, setErrores] = useState(0);
  const [advertenciaAbierta, setAdvertenciaAbierta] = useState(false);

  const palabra = entrada.palabra;
  const letrasUnicas = useMemo(
    () => new Set(palabra.replace(/[^A-ZÑ]/gi, '').split('').map(normalizar)),
    [palabra],
  );

  const ganado = useMemo(
    () => [...letrasUnicas].every((l) => letrasUsadas.includes(l)),
    [letrasUnicas, letrasUsadas],
  );
  const perdido = errores >= MAX_ERRORES;
  const terminado = ganado || perdido;

  const etapa = ETAPAS_CONTAMINACION[Math.min(errores, MAX_ERRORES)];
  const fuente = FUENTES[entrada.fuenteId];

  const jugarLetra = useCallback((letraCruda) => {
    if (terminado) return;
    const letra = normalizar(letraCruda);
    if (letrasUsadas.includes(letra)) return;

    setLetrasUsadas((prev) => [...prev, letra]);
    if (!letrasUnicas.has(letra)) {
      setErrores((prev) => Math.min(prev + 1, MAX_ERRORES));
    }
  }, [letrasUsadas, letrasUnicas, terminado]);

  const nuevaPalabra = useCallback((nuevaCategoria) => {
    const cat = nuevaCategoria ?? categoriaId;
    setCategoriaId(cat);
    setEntrada(elegirPalabra(cat));
    setLetrasUsadas([]);
    setErrores(0);
  }, [categoriaId]);

  return (
    <div className="jp-ahorcado" data-testid="ahorcado-contaminado">
      {/* Selector de categoría */}
      <div className="jp-ah-categorias" role="group" aria-label="Elegir categoría de palabras">
        <button
          type="button"
          data-testid="categoria-mezcla"
          className={`jp-ah-chip ${categoriaId === 'mezcla' ? 'activo' : ''}`}
          onClick={() => nuevaPalabra('mezcla')}
        >
          🎲 Mezcla
        </button>
        {Object.values(CATEGORIAS).map((cat) => (
          <button
            key={cat.id}
            type="button"
            data-testid={`categoria-${cat.id}`}
            className={`jp-ah-chip ${categoriaId === cat.id ? 'activo' : ''}`}
            onClick={() => nuevaPalabra(cat.id)}
            title={cat.descripcion}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Escena de contaminación (metáfora en vez de horca) */}
      <div
        className={`jp-ah-escena ${etapa.clase}`}
        data-testid="escena-contaminacion"
        aria-live="polite"
      >
        <span className="jp-ah-escena-emoji" aria-hidden="true">{etapa.emoji}</span>
        <p className="jp-ah-escena-texto">{etapa.texto}</p>
        <p className="jp-ah-intentos" data-testid="contador-intentos">
          Intentos: {errores} / {MAX_ERRORES}
        </p>
      </div>

      {/* Palabra oculta */}
      <div className="jp-ah-palabra" data-testid="palabra-oculta" aria-label={`Palabra con ${letrasUnicas.size} letras distintas`}>
        {palabra.split('').map((caracter, i) => {
          if (caracter === ' ') {
            return <span key={i} className="jp-ah-espacio" aria-hidden="true" />;
          }
          const visible = terminado || letrasUsadas.includes(normalizar(caracter));
          return (
            <span key={i} className="jp-ah-letra-casillero">
              {visible ? normalizar(caracter) : ''}
            </span>
          );
        })}
      </div>

      {/* Resultado educativo (gana o pierde: siempre se revela el dato) */}
      {terminado && (
        <div
          className={`jp-ah-resultado ${ganado ? 'gano' : 'perdio'}`}
          data-testid="resultado-juego"
          role="status"
        >
          <p className="jp-ah-resultado-titulo">
            {ganado ? '¡La finca se salvó! Adivinaste la palabra.' : 'Esta vez la finca se contaminó.'}
          </p>
          <p className="jp-ah-resultado-palabra">La palabra era: <strong>{palabra}</strong></p>
          <p className="jp-ah-resultado-pista" data-testid="pista-educativa">{entrada.pista}</p>
          {fuente && (
            <p className="jp-ah-resultado-fuente" data-testid="fuente-dato">
              Fuente: {fuente.label}
            </p>
          )}
          <button
            type="button"
            data-testid="jugar-otra-vez"
            className="jp-ah-btn-otra"
            onClick={() => nuevaPalabra()}
          >
            <RotateCcw size={18} aria-hidden="true" /> Jugar otra palabra
          </button>
        </div>
      )}

      {/* Teclado en pantalla (táctil) */}
      {!terminado && (
        <div className="jp-ah-teclado" role="group" aria-label="Teclado para adivinar letras">
          {TECLADO.map((letra) => {
            const usada = letrasUsadas.includes(letra);
            const acierto = usada && letrasUnicas.has(letra);
            const fallo = usada && !letrasUnicas.has(letra);
            return (
              <button
                key={letra}
                type="button"
                data-testid={`tecla-${letra}`}
                onClick={() => jugarLetra(letra)}
                disabled={usada}
                aria-pressed={usada}
                aria-label={`Letra ${letra}${fallo ? ', ya intentada, no está en la palabra' : ''}${acierto ? ', ya intentada, acertaste' : ''}`}
                className={`jp-ah-tecla ${acierto ? 'acierto' : ''} ${fallo ? 'fallo' : ''}`}
              >
                {letra}
              </button>
            );
          })}
        </div>
      )}

      {/* Pie con advertencia toxicológica obligatoria */}
      <div className="jp-ah-pie">
        <button
          type="button"
          data-testid="abrir-advertencia"
          className="jp-ah-btn-advertencia"
          onClick={() => setAdvertenciaAbierta(true)}
        >
          <ShieldAlert size={16} aria-hidden="true" /> Advertencia toxicológica
        </button>
      </div>

      {advertenciaAbierta && (
        <div
          className="jp-ah-modal-fondo"
          data-testid="modal-advertencia"
          role="dialog"
          aria-modal="true"
          aria-labelledby="jp-ah-modal-titulo"
        >
          <div className="jp-ah-modal">
            <h3 id="jp-ah-modal-titulo">
              <ShieldAlert size={20} aria-hidden="true" /> Datos educativos, no diagnóstico
            </h3>
            <p>
              Los datos de este juego son <strong>educativos</strong>, no son diagnóstico
              médico ni protocolo de primeros auxilios. Ante una sospecha de intoxicación
              por agroquímicos: retire a la persona de la exposición, quítele la ropa
              contaminada y llame ya a la línea de toxicología.
            </p>
            <p>
              En Colombia: <strong>Centro de Información y Asesoría Toxicológica (CIATOX)</strong>
              {' '}y línea de urgencias <strong>123</strong>.
            </p>
            <button
              type="button"
              data-testid="cerrar-advertencia"
              className="jp-ah-btn-otra"
              onClick={() => setAdvertenciaAbierta(false)}
            >
              <Sparkles size={16} aria-hidden="true" /> Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
