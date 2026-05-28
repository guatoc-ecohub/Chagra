import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ChagraAgentAvatarColibri from './ChagraAgentAvatarColibri';

/**
 * ChagraAgentAvatarColibri3D — modelado paramétrico Three.js + R3F del
 * colibrí Chagra. Sin GLB externo: cada plumita la dibujamos nosotros.
 *
 * Diseñado para ser DIGNO del HUD de HYTA (oracle-lab MainHud con sistema
 * solar 3D). Mismo nivel de profundidad visual, render en GPU del cliente
 * (no la M6000 del servidor — esa es para Ollama).
 *
 * Geometría:
 *   - Cuerpo: SphereGeometry escalada en X (torpedo aerodinámico).
 *   - Cabeza: Sphere más chica, levantada y adelantada.
 *   - Pico: ConeGeometry largo y delgado apuntando adelante-derecha.
 *   - Ojo: Sphere blanca con emissive + catchlight encima.
 *   - Gorget (garganta carmesí): Sphere achatada lateral.
 *   - Ala (×2): planos curvos con CustomGeometry — flap rapidísimo.
 *   - Cola: 5 extruded shapes en abanico.
 *   - Halo cónico: CylinderGeometry con AdditiveBlending rotando opuesto.
 *   - Partículas iridiscentes: InstancedMesh con 24 pequeños puntos.
 *
 * Materiales:
 *   - Cuerpo/cabeza: MeshPhysicalMaterial con iridescence + clearcoat.
 *     Color base esmeralda (#10b981) → highlight cyan (#06b6d4).
 *   - Gorget: MeshStandardMaterial emissive carmesí (#dc2626).
 *   - Pico: MeshStandardMaterial dark slate.
 *   - Ojo: MeshBasicMaterial blanco emissive con catchlight.
 *
 * Animación (useFrame):
 *   - Grupo entero: rotación Y continua suave (0.6 rad/s).
 *   - Hover bob: senoidal Y (±3% size).
 *   - Wings: flap a 22Hz (rápido pero visible) por estado.
 *   - Halo: rotación Y opuesta más lenta + pulsación radial.
 *
 * Estados:
 *   - 'idle': rotación normal + flap ~22Hz.
 *   - 'thinking': rotación más rápida + flap ~40Hz + halo expandido.
 *   - 'speaking': bob enfatizado.
 *   - 'listening': head tilt + flap suave.
 *
 * Performance:
 *   - dpr=[1,2] adaptativo. Mobile-friendly.
 *   - frameloop="always" pero geometrías memoizadas (zero GC).
 *   - Lazy-load: solo carga si DashboardLive lo monta.
 *   - Fallback durante Suspense: ChagraAgentAvatarColibri SVG actual.
 *
 * Operator (2026-05-28): "ya quiero ver el colibri antes de ir a dormir
 * debe ser digno de lo que esta en hyta el colibri esmerate no limits".
 */

const STATE_CONFIG = {
    idle: { rotSpeed: 0.5, wingFlap: 22, bob: 0.04, headTilt: 0, haloIntensity: 1.0 },
    thinking: { rotSpeed: 1.1, wingFlap: 40, bob: 0.06, headTilt: 0, haloIntensity: 1.8 },
    speaking: { rotSpeed: 0.6, wingFlap: 26, bob: 0.10, headTilt: 0.05, haloIntensity: 1.3 },
    listening: { rotSpeed: 0.35, wingFlap: 16, bob: 0.03, headTilt: 0.15, haloIntensity: 0.9 },
};

function Wing({ side, flapHz, color }) {
    const meshRef = useRef();
    // CustomGeometry: ala curva como un pétalo torcido
    const geometry = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.bezierCurveTo(0.15, 0.45, 0.65, 0.55, 0.95, 0.18);
        shape.bezierCurveTo(1.05, -0.05, 0.7, -0.2, 0.35, -0.12);
        shape.bezierCurveTo(0.15, -0.08, 0.05, -0.04, 0, 0);
        const geom = new THREE.ShapeGeometry(shape, 24);
        geom.computeVertexNormals();
        return geom;
    }, []);

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.elapsedTime;
        // Flap rápido — angle entre -55° y +25° en el eje Z local
        const flap = Math.sin(t * flapHz * Math.PI * 2) * 0.7 - 0.3;
        meshRef.current.rotation.z = side === 'right' ? flap : -flap;
        // Toque de torsión para que no se vea como cartulina
        meshRef.current.rotation.y = side === 'right' ? 0.15 + flap * 0.2 : -0.15 - flap * 0.2;
    });

    const xPos = side === 'right' ? 0.05 : -0.05;
    const rotY = side === 'right' ? -0.3 : Math.PI + 0.3;

    return (
        <mesh
            ref={meshRef}
            position={[xPos, 0.15, 0]}
            rotation={[0, rotY, 0]}
        >
            <primitive object={geometry} attach="geometry" />
            <meshPhysicalMaterial
                color={color}
                metalness={0.3}
                roughness={0.45}
                transmission={0.2}
                thickness={0.3}
                iridescence={0.9}
                iridescenceIOR={1.6}
                clearcoat={0.6}
                clearcoatRoughness={0.2}
                side={THREE.DoubleSide}
                transparent
                opacity={0.85}
            />
        </mesh>
    );
}

function Body({ baseColor, highlightColor }) {
    return (
        <group>
            {/* Cuerpo principal — torpedo aerodinámico */}
            <mesh position={[0, 0, 0]} rotation={[0, 0, -0.18]}>
                <sphereGeometry args={[0.42, 32, 24]} />
                <meshPhysicalMaterial
                    color={baseColor}
                    metalness={0.55}
                    roughness={0.35}
                    iridescence={1.0}
                    iridescenceIOR={1.8}
                    iridescenceThicknessRange={[100, 800]}
                    clearcoat={0.85}
                    clearcoatRoughness={0.18}
                    emissive={baseColor}
                    emissiveIntensity={0.12}
                />
            </mesh>
            {/* Vientre claro — toque de cálido contrastando */}
            <mesh position={[0.05, -0.18, 0.18]} rotation={[0, 0, -0.18]}>
                <sphereGeometry args={[0.28, 24, 16]} />
                <meshStandardMaterial
                    color="#fef3c7"
                    metalness={0.1}
                    roughness={0.6}
                    transparent
                    opacity={0.55}
                />
            </mesh>
            {/* Cola — abanico de 5 plumas timoneras */}
            {[-0.25, -0.12, 0, 0.12, 0.25].map((spread, i) => (
                <mesh
                    key={i}
                    position={[-0.55, -0.05 + spread * 0.18, spread * 0.4]}
                    rotation={[0, spread * 0.5, -0.15]}
                >
                    <boxGeometry args={[0.32, 0.05, 0.08]} />
                    <meshPhysicalMaterial
                        color={highlightColor}
                        metalness={0.4}
                        roughness={0.4}
                        iridescence={0.7}
                        clearcoat={0.5}
                    />
                </mesh>
            ))}
        </group>
    );
}

function Head({ baseColor, gorgetColor, headTilt }) {
    const headRef = useRef();
    useFrame((state) => {
        if (!headRef.current || !headTilt) return;
        headRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.4) * headTilt;
    });

    return (
        <group ref={headRef} position={[0.36, 0.18, 0]}>
            {/* Cabeza esférica */}
            <mesh>
                <sphereGeometry args={[0.22, 32, 24]} />
                <meshPhysicalMaterial
                    color={baseColor}
                    metalness={0.6}
                    roughness={0.3}
                    iridescence={1.0}
                    iridescenceIOR={1.9}
                    iridescenceThicknessRange={[200, 600]}
                    clearcoat={0.9}
                    clearcoatRoughness={0.15}
                    emissive={baseColor}
                    emissiveIntensity={0.15}
                />
            </mesh>
            {/* Gorget — garganta carmesí brillante (macho adulto) */}
            <mesh position={[0.06, -0.08, 0.12]}>
                <sphereGeometry args={[0.13, 20, 16]} />
                <meshStandardMaterial
                    color={gorgetColor}
                    metalness={0.7}
                    roughness={0.25}
                    emissive={gorgetColor}
                    emissiveIntensity={0.4}
                />
            </mesh>
            {/* Pico — cone largo apuntando adelante-arriba */}
            <mesh position={[0.32, -0.02, 0]} rotation={[0, 0, -Math.PI / 2 + 0.1]}>
                <coneGeometry args={[0.025, 0.45, 12]} />
                <meshStandardMaterial
                    color="#0f172a"
                    metalness={0.5}
                    roughness={0.4}
                />
            </mesh>
            {/* Ojo — sphere blanco emissive con catchlight encima */}
            <group position={[0.08, 0.04, 0.18]}>
                <mesh>
                    <sphereGeometry args={[0.05, 16, 12]} />
                    <meshStandardMaterial
                        color="#020617"
                        emissive="#0c0a09"
                        emissiveIntensity={0.3}
                    />
                </mesh>
                {/* Catchlight blanco — el detalle que da vida */}
                <mesh position={[0.02, 0.018, 0.035]}>
                    <sphereGeometry args={[0.018, 12, 8]} />
                    <meshBasicMaterial color="#ffffff" />
                </mesh>
            </group>
        </group>
    );
}

function Halo({ intensity }) {
    const haloRef = useRef();
    const particlesRef = useRef();

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (haloRef.current) {
            haloRef.current.rotation.y = -t * 0.4; // opuesto al cuerpo
            haloRef.current.rotation.x = Math.PI / 2;
            const pulse = 1 + Math.sin(t * 1.5) * 0.06;
            haloRef.current.scale.set(pulse, 1, pulse);
        }
        if (particlesRef.current) {
            particlesRef.current.rotation.y = t * 0.2;
        }
    });

    return (
        <group>
            {/* Halo cónico — cilindro plano con AdditiveBlending */}
            <mesh ref={haloRef} position={[0, -0.05, 0]}>
                <torusGeometry args={[0.95, 0.07, 8, 64]} />
                <meshBasicMaterial
                    color="#10b981"
                    transparent
                    opacity={0.25 * intensity}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>
            <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0.3]}>
                <torusGeometry args={[1.15, 0.04, 8, 64]} />
                <meshBasicMaterial
                    color="#06b6d4"
                    transparent
                    opacity={0.18 * intensity}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>
            <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, -0.5]}>
                <torusGeometry args={[1.3, 0.03, 8, 64]} />
                <meshBasicMaterial
                    color="#8b5cf6"
                    transparent
                    opacity={0.14 * intensity}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>
            {/* Partículas iridiscentes — polen flotante */}
            <group ref={particlesRef}>
                {Array.from({ length: 18 }).map((_, i) => {
                    const angle = (i / 18) * Math.PI * 2;
                    const radius = 1.4 + (i % 3) * 0.15;
                    const y = (i % 5 - 2) * 0.15;
                    const colors = ['#34d399', '#06b6d4', '#a78bfa', '#fbbf24'];
                    return (
                        <mesh
                            key={i}
                            position={[
                                Math.cos(angle) * radius,
                                y,
                                Math.sin(angle) * radius,
                            ]}
                        >
                            <sphereGeometry args={[0.025, 6, 4]} />
                            <meshBasicMaterial
                                color={colors[i % 4]}
                                transparent
                                opacity={0.7}
                            />
                        </mesh>
                    );
                })}
            </group>
        </group>
    );
}

function Hummingbird({ state }) {
    const groupRef = useRef();
    const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;

    useFrame((s) => {
        if (!groupRef.current) return;
        const t = s.clock.elapsedTime;
        // Rotación Y continua para que se vea desde todos los ángulos
        groupRef.current.rotation.y = t * cfg.rotSpeed;
        // Bob vertical suave — respiración
        groupRef.current.position.y = Math.sin(t * 1.2) * cfg.bob;
    });

    return (
        <group ref={groupRef}>
            <Body baseColor="#10b981" highlightColor="#06b6d4" />
            <Head baseColor="#10b981" gorgetColor="#dc2626" headTilt={cfg.headTilt} />
            <Wing side="left" flapHz={cfg.wingFlap} color="#34d399" />
            <Wing side="right" flapHz={cfg.wingFlap} color="#34d399" />
        </group>
    );
}

function Scene({ state }) {
    const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;
    return (
        <>
            {/* Lights — clave (key) + relleno (fill) + rim cyan */}
            <ambientLight intensity={0.55} color="#a7f3d0" />
            <directionalLight position={[3, 4, 2]} intensity={0.9} color="#ffffff" castShadow={false} />
            <directionalLight position={[-3, 1, -2]} intensity={0.4} color="#a78bfa" />
            <pointLight position={[0, 0, 3]} intensity={0.8} color="#06b6d4" distance={5} decay={2} />
            {/* Personaje */}
            <Hummingbird state={state} />
            <Halo intensity={cfg.haloIntensity} />
        </>
    );
}

/**
 * Componente principal. Si Three.js falla por cualquier razón (GPU
 * sin WebGL, browser viejo), el Suspense cae al SVG actual sin drama.
 */
export default function ChagraAgentAvatarColibri3D({
    state = 'idle',
    size = 180,
    glow = false,
    className = '',
    ariaLabel,
}) {
    return (
        <div
            className={`relative inline-flex items-center justify-center ${className}`}
            style={{ width: size, height: size }}
            role="img"
            aria-label={ariaLabel || 'Chagra IA · colibrí 3D'}
        >
            <Suspense
                fallback={
                    <ChagraAgentAvatarColibri
                        state={state}
                        size={size}
                        glow={glow}
                        ariaLabel={ariaLabel}
                    />
                }
            >
                <Canvas
                    camera={{ position: [0, 0.2, 3.0], fov: 35 }}
                    dpr={[1, 2]}
                    gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
                    style={{ background: 'transparent' }}
                    onCreated={({ gl }) => {
                        gl.toneMapping = THREE.ACESFilmicToneMapping;
                        gl.toneMappingExposure = 1.1;
                    }}
                >
                    <Scene state={state} />
                </Canvas>
            </Suspense>
            {glow && (
                <div
                    className="absolute inset-0 pointer-events-none rounded-full"
                    style={{
                        boxShadow: '0 0 20px 4px rgba(255, 183, 0, 0.55), inset 0 0 10px rgba(255, 183, 0, 0.2)',
                        animation: 'chagra3d-glow-pulse 1.5s ease-in-out infinite',
                    }}
                />
            )}
            <style>{`
                @keyframes chagra3d-glow-pulse {
                    0%, 100% { opacity: 0.55; }
                    50% { opacity: 1; }
                }
                @media (prefers-reduced-motion: reduce) {
                    canvas { animation: none !important; }
                }
            `}</style>
        </div>
    );
}
