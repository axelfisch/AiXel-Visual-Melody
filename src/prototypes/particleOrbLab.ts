import '../prototypes/particleOrbLab.css';
import { particleOrbDefaultConfig } from '../engines/particle-orb/particleOrb.config';
import { renderParticleOrb } from '../engines/particle-orb/particleOrb.renderer';

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Particle Orb Lab element is missing: ${selector}`);
  return element;
}

const canvas = requiredElement<HTMLCanvasElement>('#particle-orb-canvas');
const toggle = requiredElement<HTMLButtonElement>('#orb-toggle');
const progress = requiredElement<HTMLElement>('#orb-progress');
const canvasContext = canvas.getContext('2d');
if (!canvasContext) throw new Error('Particle Orb Lab canvas is unavailable.');
const context: CanvasRenderingContext2D = canvasContext;

const LOOP_DURATION = 9;
let running = true;
let pausedAt = 0;
let startTime = performance.now();

function fitCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(640, Math.round(bounds.width * ratio));
  const height = Math.max(640, Math.round(bounds.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function frame(now: number) {
  fitCanvas();
  const elapsed = running ? (now - startTime) / 1000 : pausedAt;
  const loopTime = elapsed % LOOP_DURATION;
  const phase = (loopTime / LOOP_DURATION) * Math.PI * 2;
  const energy = 0.22
    + Math.pow((Math.sin(phase * 2 - 0.7) + 1) / 2, 3) * 0.34
    + Math.pow((Math.sin(phase * 5 + 1.2) + 1) / 2, 8) * 0.16;

  renderParticleOrb(
    { context, width: canvas.width, height: canvas.height, pixelRatio: window.devicePixelRatio || 1 },
    {
      time: loopTime,
      duration: LOOP_DURATION,
      progress: loopTime / LOOP_DURATION,
      energy,
      bpm: 92,
    },
    {
      ...particleOrbDefaultConfig,
      orbitSpeed: (Math.PI * 2) / LOOP_DURATION,
      particleCount: 1,
      sparkleDensity: 0.82,
      glowIntensity: 1.32,
      showTitle: false,
    },
  );
  progress.style.transform = `scaleX(${loopTime / LOOP_DURATION})`;
  requestAnimationFrame(frame);
}

toggle.addEventListener('click', () => {
  if (running) {
    pausedAt = (performance.now() - startTime) / 1000;
    running = false;
    toggle.textContent = 'Reprendre';
    toggle.setAttribute('aria-label', 'Reprendre la boucle');
  } else {
    startTime = performance.now() - pausedAt * 1000;
    running = true;
    toggle.textContent = 'Pause';
    toggle.setAttribute('aria-label', 'Mettre la boucle en pause');
  }
});

window.addEventListener('resize', fitCanvas);
requestAnimationFrame(frame);
