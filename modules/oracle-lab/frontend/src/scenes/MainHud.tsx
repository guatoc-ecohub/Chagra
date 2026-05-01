/**
 * MainHud — vista principal Jarvis-style.
 *
 * Layout:
 *   [Background Three.js fullscreen — Globe + Stars + SolarSystem (Sol+Luna)]
 *   [Top bar — branding HYTA · GUATOC + estado conexión]
 *   [Hint pre-reveal o cards post-reveal]
 *   [Insignia GUATOC con foto real (centro pantalla post-dolly) — clickeable]
 *   [Decoraciones bióticas — oso andino + frailejón]
 *   [Bottom bar — timestamp + footer HYTA]
 *   [Modal FincaDetail full-screen al hacer click en insignia]
 */
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

import { useOracleStream } from '../hooks/useOracleStream';
import { ParticleField } from '../three/ParticleField';
import { Globe } from '../three/Globe';
import { FincaDetail } from './FincaDetail';
import { OsoAndino, Frailejon } from '../components/ParamoFauna';
import {
  WeatherCard, FarmOSCard, HACard, OllamaCard, WhisperCard,
  LunarCard, GitActivityCard, SystemHealthCard, CloudflareCard,
} from '../components/ProviderCards';

// Cámara dolly cinemático: lerp desde z=12 (vista global con galaxia visible)
// a z=5.5 (close-up Guatoc post-click).
function CameraDolly({ revealed }: { revealed: boolean }) {
  const { camera } = useThree();
  useFrame(() => {
    const targetZ = revealed ? 5.5 : 12;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.025);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// Sistema solar mínimo — Sol distante + Luna orbitando la Tierra.
// Pre-reveal: Stars + Sol + Luna visibles. Post-reveal: fade out (zoom in).
function SolarSystem({ revealed }: { revealed: boolean }) {
  const moonRef = useRef<THREE.Group>(null);
  const sunRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (moonRef.current) {
      moonRef.current.rotation.y = state.clock.elapsedTime * 0.15;
      // Fade out cuando revealed (zoom in narrative)
      const targetOpacityFactor = revealed ? 0.15 : 1;
      moonRef.current.children.forEach((child: any) => {
        if (child.material) {
          const t = child.userData.baseOpacity ?? (child.material.opacity || 1);
          child.userData.baseOpacity = t;
          child.material.opacity = THREE.MathUtils.lerp(child.material.opacity, t * targetOpacityFactor, 0.04);
        }
        // Children of nested groups
        child.traverse?.((sub: any) => {
          if (sub.material && sub !== child) {
            const t2 = sub.userData.baseOpacity ?? (sub.material.opacity || 1);
            sub.userData.baseOpacity = t2;
            sub.material.opacity = THREE.MathUtils.lerp(sub.material.opacity, t2 * targetOpacityFactor, 0.04);
          }
        });
      });
    }
    if (sunRef.current) {
      const targetOpacityFactor = revealed ? 0.2 : 1;
      sunRef.current.traverse((child: any) => {
        if (child.material && child.material.transparent) {
          const t = child.userData.baseOpacity ?? child.material.opacity;
          child.userData.baseOpacity = t;
          child.material.opacity = THREE.MathUtils.lerp(child.material.opacity, t * targetOpacityFactor, 0.04);
        }
      });
    }
  });

  return (
    <>
      {/* Sol distante — esquina cálida del campo visual */}
      <group ref={sunRef} position={[18, 8, -22]}>
        <mesh>
          <sphereGeometry args={[1.4, 24, 18]} />
          <meshBasicMaterial color="#FFE8A0" />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.2, 24, 18]} />
          <meshBasicMaterial color="#FFD27A" transparent opacity={0.18} />
        </mesh>
        <mesh>
          <sphereGeometry args={[3.5, 24, 18]} />
          <meshBasicMaterial color="#FFB050" transparent opacity={0.06} />
        </mesh>
      </group>

      {/* Luna orbitando la Tierra */}
      <group ref={moonRef}>
        <mesh rotation={[Math.PI / 2.2, 0, 0]}>
          <torusGeometry args={[5.0, 0.005, 8, 96]} />
          <meshBasicMaterial color="#aab6c8" transparent opacity={0.18} />
        </mesh>
        <group position={[5.0, 0.8, 0]}>
          <mesh>
            <sphereGeometry args={[0.18, 16, 12]} />
            <meshBasicMaterial color="#dce4ed" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.24, 16, 12]} />
            <meshBasicMaterial color="#aab6c8" transparent opacity={0.25} />
          </mesh>
        </group>
      </group>
    </>
  );
}

const RENDERERS: Record<string, any> = {
  openmeteo: WeatherCard,
  farmos: FarmOSCard,
  home_assistant: HACard,
  ollama: OllamaCard,
  whisper: WhisperCard,
  lunar: LunarCard,
  cloudflare_tunnels: CloudflareCard,
  git_activity: GitActivityCard,
  system_health: SystemHealthCard,
};

const CONNECTION_STATUS_COLOR: Record<string, string> = {
  connecting: 'var(--status-warn)',
  connected: 'var(--status-ok)',
  disconnected: 'var(--fg-dim)',
  error: 'var(--status-err)',
};

const CONNECTION_STATUS_LABEL: Record<string, string> = {
  connecting: 'Conectando',
  connected: 'En vivo',
  disconnected: 'Desconectado',
  error: 'Error',
};

export function MainHud() {
  const { snapshot, connectionState, forceRefresh } = useOracleStream();
  const [cinematic, setCinematic] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [fincaOpen, setFincaOpen] = useState(false);

  useEffect(() => {
    if (revealed) {
      const t = setTimeout(() => setCardsVisible(true), 2800);
      return () => clearTimeout(t);
    }
  }, [revealed]);

  // Click anywhere fallback — cualquier click pre-reveal revela.
  const handleOuterClick = () => {
    if (!revealed) setRevealed(true);
  };

  return (
    <div
      className="scanlines"
      onClick={handleOuterClick}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        cursor: revealed ? 'default' : 'pointer',
      }}
    >
      {/* Three.js background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Canvas
          camera={{ position: [0, 0, 12], fov: 60 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            <fog attach="fog" args={['#0a0e14', 18, 80]} />
            <Stars
              radius={120}
              depth={60}
              count={4500}
              factor={4}
              saturation={0.6}
              fade
              speed={0.4}
            />
            <SolarSystem revealed={revealed} />
            <ParticleField count={80} spread={14} />
            <Globe
              radius={3.2}
              revealed={revealed}
              onReveal={() => setRevealed(true)}
            />
            <CameraDolly revealed={revealed} />
          </Suspense>
        </Canvas>
      </div>

      {/* Insignia GUATOC viva — overlay fijo post-reveal con FOTO REAL.
          Wrapper div hace centrado estático, motion.button hace solo
          scale+opacity. zIndex 50 garantiza estar arriba del HUD overlay. */}
      {revealed && !fincaOpen && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 50,
            pointerEvents: 'auto',
          }}
        >
          <motion.button
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 2.4, ease: [0.34, 1.56, 0.64, 1] }}
            onClick={(e) => { e.stopPropagation(); setFincaOpen(true); }}
            aria-label="Abrir vista detallada de Guatoc"
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              border: '2.5px solid rgba(255, 210, 122, 0.85)',
              backgroundImage: 'url(/static/guatoc-hero.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: `
                0 0 32px rgba(255, 210, 122, 0.7),
                0 0 80px rgba(255, 168, 60, 0.4),
                inset 0 0 30px rgba(0, 0, 0, 0.35)
              `,
              cursor: 'pointer',
              padding: 0,
              outline: 'none',
              animation: 'guatoc-breathe 4.5s ease-in-out infinite',
              fontFamily: 'var(--font-mono)',
              color: '#fff',
              textShadow: '0 1px 8px rgba(0,0,0,0.9), 0 0 16px rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
              paddingBottom: '14px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Vignette + cyan tint subtle */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: `
                  radial-gradient(circle at 30% 25%, rgba(255, 245, 200, 0.25) 0%, transparent 35%),
                  radial-gradient(circle at 50% 100%, rgba(0, 0, 0, 0.55), transparent 60%)
                `,
                pointerEvents: 'none',
              }}
            />
            <div style={{
              position: 'relative',
              zIndex: 2,
              fontSize: '0.65rem',
              letterSpacing: '0.25em',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}>
              GUATOC
            </div>
            <div style={{
              position: 'relative',
              zIndex: 2,
              fontSize: '0.5rem',
              opacity: 0.95,
              letterSpacing: '0.12em',
              marginTop: '2px',
              color: '#FFD27A',
            }}>
              ● en vivo ⌖
            </div>
          </motion.button>
        </div>
      )}

      {/* Hint pre-reveal */}
      {!revealed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85, 0.85, 0.6, 0.85] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            bottom: '15%',
            left: 0,
            right: 0,
            zIndex: 5,
            textAlign: 'center',
            color: 'var(--accent-glow, #4ED4E5)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            textShadow: '0 0 12px rgba(78, 212, 229, 0.5)',
          }}
        >
          ⌖ Click en el globo para descender a Guatoc
        </motion.div>
      )}

      {/* HUD overlay */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top bar */}
        <header
          style={{
            padding: '1.25rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-soft)',
            background: 'linear-gradient(180deg, rgba(10,14,20,0.6), transparent)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem', color: 'var(--accent)' }}>⬢</span>
            <h1
              style={{
                margin: 0,
                fontSize: '1.0rem',
                fontWeight: 600,
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
                color: 'var(--accent-glow, #4ED4E5)',
                textShadow: '0 0 8px rgba(78, 212, 229, 0.4)',
              }}
            >
              HYTA
            </h1>
            <span style={{ color: 'var(--fg-mute)', fontSize: '0.7rem', letterSpacing: '0.15em' }}>
              · GUATOC
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--fg-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <PulseDot color={CONNECTION_STATUS_COLOR[connectionState]} />
              {CONNECTION_STATUS_LABEL[connectionState]}
            </span>
            <button onClick={(e) => { e.stopPropagation(); forceRefresh(); }}>Refresh</button>
            <button onClick={(e) => { e.stopPropagation(); setCinematic((c) => !c); }}>
              {cinematic ? 'HUD' : 'Cinema'}
            </button>
          </div>
        </header>

        {/* Cards grid — solo aparecen post-reveal Y solo si finca no está abierta */}
        <main
          style={{
            flex: 1,
            padding: cinematic ? '4rem' : '2rem',
            overflowY: 'auto',
            transition: 'padding 600ms var(--ease-out)',
          }}
        >
          <AnimatePresence mode="wait">
            {!cardsVisible || fincaOpen ? null : !snapshot ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  textAlign: 'center',
                  color: 'var(--fg-dim)',
                  padding: '4rem',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontSize: '0.85rem',
                }}
              >
                ⬢ Conectando al Oracle…
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: cinematic
                    ? 'repeat(auto-fit, minmax(420px, 1fr))'
                    : 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '1.25rem',
                  maxWidth: cinematic ? 1800 : 1400,
                  margin: '0 auto',
                }}
              >
                {Object.entries(RENDERERS).map(([name, Renderer], i) => {
                  const provider = snapshot.providers[name];
                  if (!provider) return null;
                  return <Renderer key={name} provider={provider} delay={i * 0.08} />;
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom bar */}
        <footer
          style={{
            padding: '0.75rem 2rem',
            borderTop: '1px solid var(--border-soft)',
            background: 'linear-gradient(0deg, rgba(10,14,20,0.6), transparent)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--fg-dim)',
            letterSpacing: '0.1em',
          }}
        >
          <span>HYTA · Sistema de inteligencia Guatoc · Tailscale-only</span>
          <span>
            {snapshot?.timestamp
              ? new Date(snapshot.timestamp).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '—'}
          </span>
        </footer>
      </div>

      {/* Fauna decorations — solo visibles post-reveal Y sin finca abierta */}
      {cardsVisible && !fincaOpen && (
        <>
          <OsoAndino position="bottom-left" size={110} opacity={0.95} />
          <Frailejon position="bottom-right" size={75} opacity={0.85} />
        </>
      )}

      {/* Finca detail full-screen */}
      <AnimatePresence>
        {fincaOpen && (
          <FincaDetail
            snapshot={snapshot}
            onBack={() => setFincaOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Keyframes globales para guatoc-breathe */}
      <style>{`
        @keyframes guatoc-breathe {
          0%, 100% {
            box-shadow:
              0 0 32px rgba(255, 210, 122, 0.7),
              0 0 80px rgba(255, 168, 60, 0.4),
              inset 0 0 30px rgba(0, 0, 0, 0.35);
          }
          50% {
            box-shadow:
              0 0 44px rgba(255, 210, 122, 0.9),
              0 0 110px rgba(255, 168, 60, 0.6),
              inset 0 0 36px rgba(0, 0, 0, 0.45);
          }
        }
      `}</style>
    </div>
  );
}

function PulseDot({ color }: { color: string }) {
  return (
    <motion.span
      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
      }}
    />
  );
}
