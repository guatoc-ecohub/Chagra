import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Rotate3D, CircleHelp, Check, X, Eye, Sprout } from 'lucide-react';
import {
  ATLAS_STAGES,
  getAtlasRecord,
  getMarkers,
  getStageData,
} from '../../speciesViewer/atlasData.js';
import { useSpeciesAtlasStore } from '../../store/useSpeciesAtlasStore.js';
import './species-atlas.css';

/**
 * Atlas educativo embebido en la ficha de especie.
 *
 * La escena usa Three.js WebGL a través de R3F. Los modelos son geometría
 * procedural de bajo coste, suficiente para enseñar relaciones anatómicas sin
 * añadir GLB sin licencia ni cambiar el renderer del valle.
 */
export default function SpeciesAtlas({ speciesId, commonName }) {
  const record = getAtlasRecord(speciesId);
  const openSpecies = useSpeciesAtlasStore((state) => state.openSpecies);

  useEffect(() => {
    openSpecies(speciesId);
  }, [openSpecies, speciesId]);

  if (!record) {
    return (
      <section className="species-atlas species-atlas--text-only" aria-labelledby="atlas-title">
        <AtlasHeading commonName={commonName} />
        <p className="species-atlas__quiet">
          Esta especie todavía no tiene una lámina anatómica 3D curada. La ficha de catálogo sigue disponible con sus datos y fuentes.
        </p>
      </section>
    );
  }

  return <AtlasContent record={record} commonName={commonName} />;
}

function AtlasContent({ record, commonName }) {
  const stageId = useSpeciesAtlasStore((state) => state.stageId);
  const selectedMarker = useSpeciesAtlasStore((state) => state.selectedMarker);
  const mode = useSpeciesAtlasStore((state) => state.mode);
  const questionIndex = useSpeciesAtlasStore((state) => state.questionIndex);
  const selectedAnswer = useSpeciesAtlasStore((state) => state.selectedAnswer);
  const selectedIdentification = useSpeciesAtlasStore((state) => state.selectedIdentification);
  const score = useSpeciesAtlasStore((state) => state.score);
  const setStage = useSpeciesAtlasStore((state) => state.setStage);
  const selectMarker = useSpeciesAtlasStore((state) => state.selectMarker);
  const setMode = useSpeciesAtlasStore((state) => state.setMode);
  const answerWritten = useSpeciesAtlasStore((state) => state.answerWritten);
  const answerIdentification = useSpeciesAtlasStore((state) => state.answerIdentification);
  const setCorrectAnswer = useSpeciesAtlasStore((state) => state.setCorrectAnswer);
  const nextQuestion = useSpeciesAtlasStore((state) => state.nextQuestion);

  const stageData = getStageData(record, stageId);
  const markers = getMarkers(record, stageId);
  const question = record.quiz[questionIndex % record.quiz.length];
  const targetMarker = markers[questionIndex % Math.max(markers.length, 1)];
  const selected = markers.find((marker) => marker.id === selectedMarker);

  useEffect(() => {
    if (mode === 'written') setCorrectAnswer(question.answer);
  }, [mode, question.answer, setCorrectAnswer]);

  const beginQuiz = (nextMode) => {
    setMode(nextMode);
    if (nextMode === 'identify' && stageId !== 'planta') setStage('planta');
  };

  const handleMarker = (markerId) => {
    if (mode === 'identify') {
      answerIdentification(markerId, markerId === targetMarker?.id);
      return;
    }
    selectMarker(markerId);
  };

  const answered = mode === 'written' ? selectedAnswer !== null : selectedIdentification !== null;
  const correct = mode === 'written'
    ? selectedAnswer === question.answer
    : selectedIdentification === targetMarker?.id;

  return (
    <section className="species-atlas" aria-labelledby="atlas-title">
      <AtlasHeading commonName={commonName} />

      <div className="species-atlas__stage-shell">
        <div className="species-atlas__stage-head">
          <div>
            <p className="species-atlas__eyebrow">Lámina 3D de anatomía</p>
            <h3 id="atlas-title">{record.title}</h3>
          </div>
          <span className="species-atlas__gesture"><Rotate3D size={14} aria-hidden="true" /> Arrastre para girar</span>
        </div>

        <AtlasCanvas
          record={record}
          stageId={stageId}
          markers={markers}
          mode={mode}
          targetMarker={targetMarker}
          onMarker={handleMarker}
        />

        <div className="species-atlas__marker-list" aria-label="Estructuras de la lámina">
          {markers.map((marker, index) => (
            <button
              type="button"
              key={marker.id}
              className={selectedMarker === marker.id ? 'is-selected' : ''}
              onClick={() => handleMarker(marker.id)}
              aria-pressed={selectedMarker === marker.id}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              {mode === 'identify' ? 'Estructura del modelo' : marker.label}
            </button>
          ))}
        </div>
      </div>

      <div className="species-atlas__stage-tabs" role="tablist" aria-label="Estados del espécimen">
        {ATLAS_STAGES.map((stage) => (
          <button
            type="button"
            role="tab"
            key={stage.id}
            aria-selected={stage.id === stageId}
            className={stage.id === stageId ? 'is-active' : ''}
            onClick={() => { setMode('explore'); setStage(stage.id); }}
          >
            <span>{stage.label}</span>
            <small>{stage.short}</small>
          </button>
        ))}
      </div>

      <article className="species-atlas__lesson" aria-live="polite">
        <div className="species-atlas__lesson-mark"><Eye size={18} aria-hidden="true" /></div>
        <div>
          <p className="species-atlas__eyebrow">{stageData.eyebrow}</p>
          <h4>{stageData.title}</h4>
          <p>{stageData.text}</p>
          <p className="species-atlas__observe"><strong>Qué observar:</strong> {stageData.observe}</p>
        </div>
      </article>

      {selected && mode === 'explore' && (
        <article className="species-atlas__detail">
          <p className="species-atlas__eyebrow">Marcador {selected.label}</p>
          <p>{selected.note}</p>
        </article>
      )}

      <div className="species-atlas__quiz-head">
        <div>
          <p className="species-atlas__eyebrow">Comprobación rápida</p>
          <h4>Aprender mirando</h4>
        </div>
        {mode !== 'explore' && <span className="species-atlas__score">Puntaje: {score}</span>}
      </div>

      {mode === 'explore' ? (
        <div className="species-atlas__quiz-actions">
          <button type="button" onClick={() => beginQuiz('written')}><CircleHelp size={17} aria-hidden="true" /> Quiz escrito</button>
          <button type="button" onClick={() => beginQuiz('identify')}><Rotate3D size={17} aria-hidden="true" /> Identificar en el modelo</button>
        </div>
      ) : (
        <div className="species-atlas__quiz-card">
          {mode === 'identify' ? (
            <>
              <p className="species-atlas__quiz-prompt">¿Dónde está <strong>{targetMarker?.label}</strong>? Gire la lámina y elija su marcador numerado.</p>
              <p className="species-atlas__quiz-help">Los nombres se ocultan durante la ronda para que la pista espacial sea real.</p>
            </>
          ) : (
            <>
              <p className="species-atlas__quiz-prompt">{question.prompt}</p>
              <div className="species-atlas__options">
                {question.options.map((option, index) => {
                  const isPicked = selectedAnswer === index;
                  const isRight = question.answer === index;
                  const stateClass = answered && isRight ? 'is-correct' : answered && isPicked ? 'is-wrong' : '';
                  return (
                    <button
                      type="button"
                      key={option}
                      className={stateClass}
                      disabled={answered}
                      onClick={() => answerWritten(index)}
                    >
                      <span>{String.fromCharCode(65 + index)}</span>{option}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {answered && (
            <div className={`species-atlas__feedback ${correct ? 'is-correct' : 'is-wrong'}`} role="status">
              {correct ? <Check size={17} aria-hidden="true" /> : <X size={17} aria-hidden="true" />}
              <span>{mode === 'written' ? question.explanation : (correct ? 'Buen ojo. Ese marcador señala la estructura pedida.' : `La respuesta está en el marcador de ${targetMarker?.label}. ${targetMarker?.note}`)}</span>
            </div>
          )}
          <div className="species-atlas__quiz-footer">
            <button type="button" className="species-atlas__back" onClick={() => setMode('explore')}>Volver a explorar</button>
            {answered && <button type="button" className="species-atlas__next" onClick={nextQuestion}>Siguiente pregunta</button>}
          </div>
        </div>
      )}
    </section>
  );
}

function AtlasHeading({ commonName }) {
  return (
    <div className="species-atlas__heading">
      <span className="species-atlas__heading-icon"><Sprout size={18} aria-hidden="true" /></span>
      <div>
        <p className="species-atlas__eyebrow">Dimensión educativa</p>
        <h2>Atlas de {commonName || 'la especie'}</h2>
      </div>
    </div>
  );
}

function AtlasCanvas({ record, stageId, markers, mode, targetMarker, onMarker }) {
  const specimenRef = useRef();
  const isIdentify = mode === 'identify';

  return (
    <div className="species-atlas__canvas-wrap">
      <Canvas
        className="species-atlas__canvas"
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ position: [0, 0.12, 3.6], fov: 36 }}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        fallback={<div className="species-atlas__canvas-fallback" role="status">WebGL no está disponible. Use la lista de estructuras y la tarjeta de aprendizaje.</div>}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <color attach="background" args={['#17362d']} />
        <ambientLight intensity={1.9} color="#dce9c4" />
        <directionalLight position={[-3, 4, 4]} intensity={3.4} color="#fff1c5" />
        <directionalLight position={[3, 1, -2]} intensity={1.1} color="#8fc8b7" />
        <Specimen record={record} stageId={stageId} specimenRef={specimenRef} />
        {markers.map((marker, index) => (
          <AtlasMarker
            key={marker.id}
            marker={marker}
            index={index}
            hiddenLabel={isIdentify}
            active={targetMarker?.id === marker.id && isIdentify}
            specimenRef={specimenRef}
            onClick={() => onMarker(marker.id)}
          />
        ))}
        <OrbitControls enablePan={false} enableZoom autoRotate={false} minDistance={2.2} maxDistance={5.2} makeDefault />
      </Canvas>
      <span className="species-atlas__canvas-note">WebGL · modelo didáctico · sin datos de finca</span>
    </div>
  );
}

function Specimen({ record, stageId, specimenRef }) {
  const common = { castShadow: true, receiveShadow: true };
  return (
    <group ref={specimenRef} position={[0, 0, 0]}>
      {stageId === 'semilla' && <SeedShape kind={record.kind} {...common} />}
      {stageId === 'brote' && <SproutShape kind={record.kind} {...common} />}
      {stageId === 'planta' && <PlantShape kind={record.kind} {...common} />}
    </group>
  );
}

function SeedShape({ kind }) {
  const scale = kind === 'maize' ? [0.4, 0.7, 0.25] : kind === 'avocado' ? [0.58, 0.72, 0.42] : [0.5, 0.34, 0.28];
  const color = kind === 'maize' ? '#d7ac4c' : kind === 'avocado' ? '#b97b3b' : '#c98a49';
  return <mesh scale={scale} rotation={[0.1, 0.25, -0.1]}><sphereGeometry args={[0.72, 24, 16]} /><meshStandardMaterial color={color} roughness={0.62} /></mesh>;
}

function SproutShape({ kind }) {
  const leafColor = kind === 'maize' ? '#8ead57' : '#79aa70';
  return (
    <group>
      <mesh position={[0, -0.26, 0]} rotation={[0, 0, Math.PI]}>
        <cylinderGeometry args={[0.045, 0.075, 1.1, 12]} />
        <meshStandardMaterial color="#d7b77b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.28, 0]}><cylinderGeometry args={[0.055, 0.07, 0.8, 12]} /><meshStandardMaterial color="#5c8d55" roughness={0.78} /></mesh>
      <Leaf position={[-0.24, 0.48, 0.03]} scale={[0.42, 0.08, 0.2]} color={leafColor} rotation={[0.05, 0.3, -0.35]} />
      <Leaf position={[0.24, 0.56, 0.03]} scale={[0.4, 0.08, 0.2]} color={leafColor} rotation={[-0.05, -0.3, 0.35]} />
    </group>
  );
}

function PlantShape({ kind }) {
  if (kind === 'maize') return <MaizePlant />;
  if (kind === 'avocado') return <AvocadoPlant />;
  return <TomatoPlant />;
}

function TomatoPlant() {
  return (
    <group>
      <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.07, 0.12, 1.72, 14]} /><meshStandardMaterial color="#668755" roughness={0.82} /></mesh>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = index * 1.2;
        return <Leaf key={index} position={[Math.cos(angle) * 0.28, -0.4 + index * 0.23, Math.sin(angle) * 0.12]} scale={[0.55, 0.08, 0.22]} color="#91b970" rotation={[0.15, angle, -0.08]} />;
      })}
      <Fruit position={[0.28, 0.1, 0.18]} color="#d96b4f" scale={[0.22, 0.25, 0.22]} />
      <Fruit position={[-0.25, -0.16, 0.16]} color="#de8060" scale={[0.19, 0.22, 0.19]} />
    </group>
  );
}

function MaizePlant() {
  return (
    <group>
      <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.1, 0.15, 2.55, 14]} /><meshStandardMaterial color="#a2a65a" roughness={0.84} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((index) => <Leaf key={index} position={[index % 2 ? -0.28 : 0.28, -0.55 + index * 0.2, 0]} scale={[0.7, 0.07, 0.13]} color="#9dbd67" rotation={[index % 2 ? -0.5 : 0.5, index * 0.3, 0]} />)}
      <Fruit position={[0.18, 0.05, 0.16]} color="#dfb863" scale={[0.14, 0.4, 0.14]} />
    </group>
  );
}

function AvocadoPlant() {
  return (
    <group>
      <mesh position={[0, -0.02, 0]}><cylinderGeometry args={[0.14, 0.22, 1.65, 14]} /><meshStandardMaterial color="#6f5e42" roughness={0.88} /></mesh>
      {[0, 1, 2, 3, 4, 5, 6].map((index) => {
        const angle = index * 0.9;
        return <Leaf key={index} position={[Math.cos(angle) * 0.4, 0.4 + (index % 3) * 0.18, Math.sin(angle) * 0.23]} scale={[0.62, 0.18, 0.35]} color="#5f8f62" rotation={[0.15, angle, 0.1]} />;
      })}
      <Fruit position={[0.28, 0.25, 0.18]} color="#8ba25a" scale={[0.2, 0.3, 0.2]} />
    </group>
  );
}

function Leaf({ position, scale, color, rotation }) {
  return <mesh position={position} scale={scale} rotation={rotation}><sphereGeometry args={[0.46, 14, 8]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>;
}

function Fruit({ position, color, scale }) {
  return <mesh position={position} scale={scale}><sphereGeometry args={[0.5, 18, 12]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>;
}

function AtlasMarker({ marker, index, hiddenLabel, active, specimenRef, onClick }) {
  const tint = active ? '#f2c86b' : '#f4e3a5';
  return (
    <group position={marker.position}>
      <mesh onClick={(event) => { event.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[0.055, 12, 8]} />
        <meshBasicMaterial color={tint} transparent opacity={0.95} depthTest={false} />
      </mesh>
      <Html center distanceFactor={6} occlude={[specimenRef]} zIndexRange={[20, 0]}>
        <button
          type="button"
          className={`species-atlas__marker ${active ? 'is-target' : ''}`}
          aria-label={hiddenLabel ? `Marcador ${index + 1}` : `Abrir ficha: ${marker.label}`}
          onClick={(event) => { event.stopPropagation(); onClick(); }}
        >
          <span>{hiddenLabel ? String(index + 1).padStart(2, '0') : marker.label}</span>
        </button>
      </Html>
    </group>
  );
}
