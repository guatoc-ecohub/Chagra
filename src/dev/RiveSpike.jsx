/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Rive, RuntimeLoader, StateMachineInputType } from '@rive-app/canvas';
import './RiveSpike.css';

const RIVE_WASM_URL = '/vendor/rive/rive.wasm';
const RIVE_ASSET_URL = '/vendor/rive/spike-vehicles.riv';

// Keep both URLs local. The null fallback is important because the runtime's
// default fallback points at a CDN when the primary WASM request fails.
RuntimeLoader.setWasmUrl(RIVE_WASM_URL);
RuntimeLoader.setWasmFallbackUrl(null);

const INPUT_TYPE_LABELS = {
  [StateMachineInputType.Number]: 'number',
  [StateMachineInputType.Boolean]: 'boolean',
  [StateMachineInputType.Trigger]: 'trigger',
};

function describeInput(input) {
  return {
    name: input.name,
    type: INPUT_TYPE_LABELS[input.type] || String(input.type),
    value: input.value,
  };
}

function makeLog(message, detail = '') {
  return `${new Date().toISOString().slice(11, 19)} ${message}${detail ? `: ${detail}` : ''}`;
}

export default function RiveSpike() {
  const riveCanvasRef = useRef(null);
  const threeCanvasRef = useRef(null);
  const riveRef = useRef(null);
  const textureRef = useRef(null);
  const [runtimeStatus, setRuntimeStatus] = useState('Preparando runtime local');
  const [textureStatus, setTextureStatus] = useState('Preparando CanvasTexture');
  const [stateMachine, setStateMachine] = useState(null);
  const [inputs, setInputs] = useState([]);
  const [logs, setLogs] = useState([
    makeLog('config', `WASM ${RIVE_WASM_URL}`),
    makeLog('config', 'fallback CDN desactivado'),
  ]);
  const [controlValue, setControlValue] = useState('Sin input number/boolean');

  const appendLog = (message, detail) => {
    setLogs((previous) => [...previous.slice(-7), makeLog(message, detail)]);
  };

  useEffect(() => {
    const riveCanvas = riveCanvasRef.current;
    const threeCanvas = threeCanvasRef.current;
    if (!riveCanvas || !threeCanvas) return undefined;

    let rive;
    let renderer;
    let animationFrame;
    let statusTimer;
    let disposed = false;

    const resize = () => {
      if (!renderer || !riveCanvas || !threeCanvas) return;
      const width = Math.max(1, threeCanvas.clientWidth);
      const height = Math.max(1, threeCanvas.clientHeight);
      renderer.setSize(width, height, false);
      rive?.resizeDrawingSurfaceToCanvas();
    };

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: threeCanvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 2;
      const geometry = new THREE.PlaneGeometry(2, 2);
      const texture = new THREE.CanvasTexture(riveCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      textureRef.current = texture;
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      scene.add(new THREE.Mesh(geometry, material));
      statusTimer = window.setTimeout(() => {
        if (!disposed) {
          setTextureStatus('CanvasTexture conectada al plano');
          appendLog('three', 'CanvasTexture creada desde el canvas de Rive');
          appendLog('network', `${RIVE_ASSET_URL} + ${RIVE_WASM_URL}`);
        }
      }, 0);

      const render = () => {
        if (disposed) return;
        texture.needsUpdate = true;
        renderer.render(scene, camera);
        animationFrame = requestAnimationFrame(render);
      };
      render();
      window.addEventListener('resize', resize);
      resize();

      rive = new Rive({
        canvas: riveCanvas,
        src: RIVE_ASSET_URL,
        autoplay: true,
        enableRiveAssetCDN: false,
        onLoad: () => {
          if (disposed) return;
          rive.resizeDrawingSurfaceToCanvas();
          const contents = rive.contents || {};
          const artboards = contents.artboards || [];
          const artboard = artboards.find((item) => item.name === rive.activeArtboard) || artboards[0];
          const machineName = rive.stateMachineNames[0] || artboard?.stateMachines?.[0]?.name;

          if (machineName) {
            rive.reset({ stateMachines: machineName, autoplay: true });
          }

          const machineInputs = machineName ? rive.stateMachineInputs(machineName) : [];

          const describedInputs = machineInputs.map(describeInput);
          setStateMachine({ name: machineName || 'No encontrado', artboard: rive.activeArtboard });
          setInputs(describedInputs);
          setRuntimeStatus('Rive WASM cargado desde self');
          appendLog('rive', `artboard ${rive.activeArtboard}`);
          appendLog('state machine', machineName || 'no encontrada');
          appendLog('inputs', describedInputs.map((input) => `${input.name} (${input.type})`).join(', ') || 'ninguno');
          const firstWritable = machineInputs.find(
            (input) => input.type === StateMachineInputType.Number || input.type === StateMachineInputType.Boolean,
          );
          if (firstWritable) {
            setControlValue(`${firstWritable.name} = ${String(firstWritable.value)}`);
          }
          window.__RIVE_SPIKE__ = {
            rive,
            machineName,
            inputs: machineInputs,
            wasmUrl: RIVE_WASM_URL,
            assetUrl: RIVE_ASSET_URL,
          };
        },
        onLoadError: (error) => {
          setRuntimeStatus('Error al cargar Rive');
          appendLog('error', error?.message || 'onLoadError');
        },
      });
      riveRef.current = rive;
    } catch (error) {
      statusTimer = window.setTimeout(() => {
        if (!disposed) {
          setTextureStatus('WebGL no disponible en este navegador');
          setRuntimeStatus('No se pudo iniciar Rive');
          appendLog('error', error?.message || String(error));
        }
      }, 0);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(statusTimer);
      window.removeEventListener('resize', resize);
      rive?.cleanup();
      renderer?.dispose();
      textureRef.current?.dispose();
      textureRef.current = null;
      delete window.__RIVE_SPIKE__;
    };
  }, []);

  const setFirstWritableInput = () => {
    const rive = riveRef.current;
    const machine = stateMachine?.name;
    if (!rive || !machine) return;
    const input = rive.stateMachineInputs(machine).find(
      (candidate) => candidate.type === StateMachineInputType.Number || candidate.type === StateMachineInputType.Boolean,
    );
    if (!input) {
      setControlValue('El sample no expone number/boolean');
      appendLog('input', 'no hay input seteable de tipo number/boolean');
      return;
    }
    const nextValue = input.type === StateMachineInputType.Boolean
      ? !input.value
      : Number(input.value) === 0 ? 1 : 0;
    input.value = nextValue;
    setControlValue(`${input.name} = ${String(input.value)}`);
    setInputs(rive.stateMachineInputs(machine).map(describeInput));
    appendLog('input seteado', `${input.name} = ${String(input.value)}`);
  };

  return (
    <main className="rive-spike" data-testid="rive-spike">
      <header className="rive-spike__header">
        <div>
          <p className="rive-spike__eyebrow">SPIKE 00 / RIVE + VALLE 3D</p>
          <h1>Un jaguar para todas las superficies</h1>
          <p className="rive-spike__lede">Runtime local, rig 2.5D y control de estado en una sola prueba.</p>
        </div>
        <a className="rive-spike__back" href="#/dashboard">Salir del spike</a>
      </header>

      <section className="rive-spike__grid" aria-label="Pruebas del spike Rive">
        <article className="rive-card rive-card--wide">
          <div className="rive-card__heading">
            <div>
              <p className="rive-card__kicker">P2 / CANVAS TEXTURE</p>
              <h2>El mismo canvas entra al plano 3D</h2>
            </div>
            <span className="rive-status rive-status--ok">{textureStatus}</span>
          </div>
          <div className="rive-stage">
            <canvas ref={riveCanvasRef} className="rive-stage__source" width="640" height="360" aria-label="Animación Rive fuente" />
            <div className="rive-stage__plane">
              <canvas ref={threeCanvasRef} aria-label="CanvasTexture Rive en Three.js" />
              <span>THREE / PLANE</span>
            </div>
          </div>
          <p className="rive-card__note">La textura se marca <code>needsUpdate = true</code> en cada frame del render loop.</p>
        </article>

        <article className="rive-card">
          <div className="rive-card__heading">
            <div>
              <p className="rive-card__kicker">P1 / WASM SELF-HOST</p>
              <h2>{runtimeStatus}</h2>
            </div>
            <span className="rive-status rive-status--ok">SELF</span>
          </div>
          <dl className="rive-facts">
            <div><dt>WASM</dt><dd>{RIVE_WASM_URL}</dd></div>
            <div><dt>RIV</dt><dd>{RIVE_ASSET_URL}</dd></div>
            <div><dt>CDN fallback</dt><dd>desactivado</dd></div>
          </dl>
        </article>

        <article className="rive-card">
          <div className="rive-card__heading">
            <div>
              <p className="rive-card__kicker">P3 / STATE MACHINE API</p>
              <h2>{stateMachine?.name || 'Leyendo el sample'}</h2>
            </div>
            <span className="rive-status rive-status--accent">{stateMachine?.artboard || 'artboard'}</span>
          </div>
          <ul className="rive-inputs">
            {inputs.length ? inputs.map((input) => (
              <li key={input.name}><span>{input.name}</span><code>{input.type}: {String(input.value)}</code></li>
            )) : <li className="rive-inputs__empty">Esperando inputs del .riv</li>}
          </ul>
          <button type="button" className="rive-button" onClick={setFirstWritableInput}>
            Setear primer number/boolean
          </button>
          <p className="rive-card__note">{controlValue}</p>
        </article>

        <article className="rive-card rive-card--wide rive-card--mapping">
          <div>
            <p className="rive-card__kicker">PEGAMENTO FUTURO</p>
            <h2>Mapa conceptual, todavía sin hooks reales</h2>
          </div>
          <div className="rive-map">
            <div><strong>estado</strong><span>boolean / trigger del modo del rig</span></div>
            <div><strong>visema</strong><span>number para forma de boca</span></div>
            <div><strong>mira_x</strong><span>number horizontal</span></div>
            <div><strong>mira_y</strong><span>number vertical</span></div>
          </div>
        </article>

        <article className="rive-card rive-card--logs">
          <div className="rive-card__heading"><h2>Telemetría local</h2><span className="rive-status">sin red externa</span></div>
          <pre>{logs.join('\n')}</pre>
        </article>
      </section>
    </main>
  );
}
