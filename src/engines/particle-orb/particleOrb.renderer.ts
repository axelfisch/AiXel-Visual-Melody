import * as THREE from 'three';
import { adjustSaturation, applyWarmthOverlay } from '../engine.directorFx';
import type { EngineFrame, RenderSurface } from '../engine.types';
import type { ParticleOrbConfig } from './particleOrb.types';

const MAX_PARTICLES = 12_000;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

type OrbScene = {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  shell: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  halo: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  basePositions: Float32Array;
};

const scenes = new WeakMap<HTMLCanvasElement, OrbScene>();

function createOrbScene(target: HTMLCanvasElement): OrbScene {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 20);
  camera.position.z = 4.15;

  const positions = new Float32Array(MAX_PARTICLES * 3);
  for (let index = 0; index < MAX_PARTICLES; index += 1) {
    const y = 1 - (index / (MAX_PARTICLES - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = GOLDEN_ANGLE * index;
    positions[index * 3] = Math.cos(theta) * radius;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = Math.sin(theta) * radius;
  }
  const basePositions = positions.slice();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: '#9eeaff',
      size: 0.018,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(points);

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 44, 30),
    new THREE.MeshBasicMaterial({
      color: '#8a6bff',
      wireframe: true,
      transparent: true,
      opacity: 0.105,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  shell.scale.set(1.08, 0.94, 1.06);
  scene.add(shell);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.28, 36, 24),
    new THREE.MeshBasicMaterial({
      color: '#4f8cff',
      transparent: true,
      opacity: 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    }),
  );
  scene.add(halo);

  const state = { canvas, renderer, scene, camera, points, shell, halo, basePositions };
  scenes.set(target, state);
  return state;
}

function drawCanvasFallback(surface: RenderSurface, frame: EngineFrame, config: ParticleOrbConfig) {
  const { context, width, height } = surface;
  const energy = Math.min(1, frame.energy * config.energyResponse);
  context.fillStyle = '#030816';
  context.fillRect(0, 0, width, height);
  context.save();
  context.translate(width / 2, height / 2);
  context.strokeStyle = config.secondaryColor;
  context.fillStyle = config.primaryColor;
  for (let index = 0; index < 900; index += 1) {
    const y = 1 - (index / 899) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = GOLDEN_ANGLE * index + frame.time * config.orbitSpeed;
    const z = Math.sin(theta) * radius;
    const scale = 0.78 + z * 0.22;
    const x2d = Math.cos(theta) * radius * width * 0.2 * scale;
    const y2d = y * height * 0.31 * scale;
    context.globalAlpha = 0.25 + (z + 1) * 0.3;
    context.beginPath();
    context.arc(x2d, y2d, 0.7 + scale * (0.8 + energy), 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
  context.globalAlpha = 1;
}

export function renderParticleOrb(surface: RenderSurface, frame: EngineFrame, config: ParticleOrbConfig) {
  const { context, width, height } = surface;
  const energy = Math.min(1, Math.max(0, frame.energy * config.energyResponse));
  let state: OrbScene;
  try {
    state = scenes.get(context.canvas) ?? createOrbScene(context.canvas);
  } catch {
    drawCanvasFallback(surface, frame, config);
    return;
  }

  if (state.canvas.width !== width || state.canvas.height !== height) {
    state.renderer.setSize(width, height, false);
    state.camera.aspect = width / height;
    state.camera.updateProjectionMatrix();
  }

  const primary = adjustSaturation(config.primaryColor, config.colorSaturation);
  const secondary = adjustSaturation(config.secondaryColor, config.colorSaturation);
  const background = new THREE.Color('#030713').lerp(new THREE.Color(secondary), 0.055 + energy * 0.035);
  state.scene.background = background;
  state.points.material.color.set(primary);
  state.shell.material.color.set(secondary);
  state.halo.material.color.set(primary);
  state.points.material.size = (0.014 + config.sparkleDensity * 0.006) * (1 + energy * 0.34);
  state.points.material.opacity = 0.64 + config.glowIntensity * 0.16;
  state.shell.material.opacity = 0.055 + config.glowIntensity * 0.055 + energy * 0.05;
  state.halo.material.opacity = 0.025 + config.glowIntensity * 0.03 + energy * 0.035;
  state.points.geometry.setDrawRange(0, Math.round(MAX_PARTICLES * config.particleCount));

  const positions = state.points.geometry.attributes.position as THREE.BufferAttribute;
  const array = positions.array as Float32Array;
  const pulse = 0.018 + energy * 0.12;
  for (let index = 0; index < MAX_PARTICLES; index += 1) {
    const offset = index * 3;
    const x = state.basePositions[offset];
    const y = state.basePositions[offset + 1];
    const z = state.basePositions[offset + 2];
    const wave = Math.sin(x * 5.3 + frame.time * 0.8) * Math.cos(y * 4.1 - frame.time * 0.55)
      + Math.sin(z * 6.2 + frame.time * 0.42) * 0.55;
    const displacement = 1 + wave * pulse;
    array[offset] = x * displacement;
    array[offset + 1] = y * displacement;
    array[offset + 2] = z * displacement;
  }
  positions.needsUpdate = true;

  const rotation = frame.time * config.orbitSpeed;
  const scale = config.spaceScale * (0.94 + energy * 0.075);
  state.points.rotation.set(rotation * 0.23, rotation, Math.sin(rotation * 0.45) * 0.12);
  state.shell.rotation.set(-rotation * 0.31, rotation * 0.62, rotation * 0.18);
  state.halo.rotation.copy(state.shell.rotation);
  state.points.scale.setScalar(scale);
  state.shell.scale.set(1.08 * scale, (0.94 + Math.sin(frame.time * 0.7) * 0.035) * scale, 1.06 * scale);
  state.halo.scale.setScalar(scale);
  state.camera.position.x = Math.sin(rotation * 0.24) * 0.18;
  state.camera.position.y = Math.cos(rotation * 0.19) * 0.08;
  state.camera.lookAt(0, 0, 0);
  state.renderer.render(state.scene, state.camera);

  context.globalAlpha = 1;
  context.drawImage(state.canvas, 0, 0, width, height);
  applyWarmthOverlay(context, width, height, config.warmth);
  if (config.showTitle && frame.title) {
    context.fillStyle = '#eef1fb';
    context.textAlign = 'center';
    context.font = '500 30px Manrope, sans-serif';
    context.fillText(frame.title, width / 2, height - 54, width - 120);
  }
}
