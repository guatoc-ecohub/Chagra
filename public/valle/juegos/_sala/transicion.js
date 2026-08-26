import * as THREE from 'three';

const VERT_SABANA = /* glsl */ `
  uniform float uProgress;
  uniform float uRadius;
  uniform float uTilt;
  varying vec2 vUv;
  varying float vTheta;

  void main() {
    vUv = uv;
    vec3 p = position;

    float L = -1.32 + uProgress * 2.95 + uTilt * p.x;
    float d = L - p.y;
    float theta = 0.0;

    if (d > 0.0) {
      theta = d / uRadius;
      float R = uRadius * (1.0 + 0.055 * theta);
      p.y = L - sin(theta) * R;
      p.z = (1.0 - cos(theta)) * R * 0.62;
    }
    vTheta = theta;
    gl_Position = vec4(p.xy, p.z * -0.18, 1.0);
  }
`;

const FRAG_SABANA = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uProgress;
  varying vec2 vUv;
  varying float vTheta;

  void main() {
    vec3 col;
    vec3 vivo = pow(texture2D(uTex, vUv).rgb, vec3(0.4545));

    if (gl_FrontFacing) {
      col = vivo;
      float destinte = smoothstep(0.0, 1.4, vTheta);
      vec3 acuarela = mix(vivo, vec3(0.93, 0.87, 0.72), 0.55);
      col = mix(col, acuarela, destinte * 0.45);
      float luz = 0.42 + 0.58 * max(0.0, cos(vTheta));
      col *= mix(1.0, luz, smoothstep(0.0, 0.35, vTheta));
    } else {
      vec3 tinta = pow(texture2D(uTex, vec2(1.0 - vUv.x, vUv.y)).rgb, vec3(0.4545));
      col = mix(vec3(0.94, 0.87, 0.70), tinta, 0.10);
      float haciaCamara = max(0.0, -cos(vTheta));
      col *= 0.40 + 0.48 * haciaCamara;
      col += vec3(0.09, 0.07, 0.04) * pow(haciaCamara, 12.0);
      col *= 0.975 + 0.02 * sin(vUv.x * 520.0) + 0.012 * sin(vUv.y * 300.0);
    }

    float filo = smoothstep(0.012, 0.0, vUv.y);
    col = mix(col, vec3(0.42, 0.31, 0.20), filo * 0.7);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const VERT_LAMINA = /* glsl */ `
  varying vec2 vUv;
  uniform float uRespiro;
  void main() {
    vUv = uv;
    vec3 p = position * (1.0 + uRespiro);
    gl_Position = vec4(p.xy, 0.9, 1.0);
  }
`;

const FRAG_LAMINA = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uProgress;
  uniform float uRadius;
  uniform float uTilt;
  varying vec2 vUv;

  void main() {
    vec3 col = texture2D(uTex, vUv).rgb;
    float y = vUv.y * 2.0 - 1.0;
    float x = vUv.x * 2.0 - 1.0;
    float L = -1.32 + uProgress * 2.95 + uTilt * x;
    float haz = L - y;
    float sombra = smoothstep(0.34, 0.02, haz) * step(0.0, haz);
    col *= 1.0 - 0.32 * sombra * smoothstep(0.02, 0.1, uProgress) * smoothstep(1.0, 0.92, uProgress);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class CompositorSala {
  constructor(renderer, roomCanvas) {
    this.renderer = renderer;

    this.rt = new THREE.WebGLRenderTarget(2, 2, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2, 2);

    this.matSabana = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: this.rt.texture },
        uProgress: { value: 0 },
        uRadius: { value: 0.125 },
        uTilt: { value: 0.085 },
      },
      vertexShader: VERT_SABANA,
      fragmentShader: FRAG_SABANA,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
    });
    this.sabana = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 64, 220), this.matSabana);
    this.sabana.renderOrder = 1;
    this.sabana.frustumCulled = false;
    this.scene.add(this.sabana);

    this.N = 96;
    this.life = new Float32Array(this.N);
    this.vel = new Float32Array(this.N * 2);
    const pos = new Float32Array(this.N * 3);
    for (let i = 0; i < this.N; i++) pos[i * 3 + 1] = -9;
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const cv = document.createElement('canvas');
    cv.width = cv.height = 48;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, 'rgba(255,240,190,1)');
    g.addColorStop(0.4, 'rgba(255,220,130,0.7)');
    g.addColorStop(1, 'rgba(255,210,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 48, 48);

    this.polvo = new THREE.Points(
      this.geo,
      new THREE.PointsMaterial({
        map: new THREE.CanvasTexture(cv),
        color: 0xffd97a,
        size: 9,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.85,
        alphaTest: 0.02,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      })
    );
    this.polvo.renderOrder = 2;
    this.polvo.frustumCulled = false;
    this.scene.add(this.polvo);

    this.seeding = 0;
  }

  resize(w, h, dpr) {
    this.rt.setSize(Math.round(w * dpr), Math.round(h * dpr));
  }

  render(roomScene, roomCamera, progress, dt, t) {
    const transitioning = progress > 0.002 && progress < 0.998;
    this.matSabana.uniforms.uProgress.value = progress;

    if (progress < 0.998) {
      this.renderer.setRenderTarget(this.rt);
      this.renderer.render(roomScene, roomCamera);
      this.renderer.setRenderTarget(null);
    }

    this.sabana.visible = progress < 0.998;

    const pos = this.geo.attributes.position.array;
    if (transitioning) {
      this.seeding += dt * 24;
      while (this.seeding > 1) {
        this.seeding -= 1;
        for (let i = 0; i < this.N; i++) {
          if (this.life[i] <= 0) {
            const x = Math.random() * 2 - 1;
            const L = -1.32 + progress * 2.95 + 0.085 * x;
            pos[i * 3] = x;
            pos[i * 3 + 1] = L + (Math.random() - 0.5) * 0.02;
            pos[i * 3 + 2] = 0;
            this.vel[i * 2] = (Math.random() - 0.5) * 0.08;
            this.vel[i * 2 + 1] = 0.08 + Math.random() * 0.18;
            this.life[i] = 0.5 + Math.random() * 0.5;
            break;
          }
        }
      }
    }

    for (let i = 0; i < this.N; i++) {
      if (this.life[i] > 0) {
        this.life[i] -= dt;
        pos[i * 3] += this.vel[i * 2] * dt;
        pos[i * 3 + 1] += this.vel[i * 2 + 1] * dt;
        this.vel[i * 2 + 1] *= 0.985;
        if (this.life[i] <= 0) pos[i * 3 + 1] = -9;
      }
    }
    this.geo.attributes.position.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }
}
