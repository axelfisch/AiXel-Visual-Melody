import { adjustSaturation, applyWarmthOverlay, drawAmbientSparkles } from '../engine.directorFx';
import type { EngineFrame, RenderSurface } from '../engine.types';
import type { DanceAvatarStyle, DanceAvatarsConfig } from './danceAvatars.types';

const TAU = Math.PI * 2;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
type V = { x: number; y: number };
type Pose = Record<'head'|'neck'|'shoulderL'|'shoulderR'|'elbowL'|'elbowR'|'wristL'|'wristR'|'hip'|'hipL'|'hipR'|'kneeL'|'kneeR'|'ankleL'|'ankleR', V>;

const polar = (o: V, a: number, len: number): V => ({ x: o.x + Math.cos(a) * len, y: o.y + Math.sin(a) * len });

function buildPose(cx: number, cy: number, scale: number, time: number, energy: number, expressiveness: number, danceSpeed: number, gender: 'male'|'female'): Pose {
  const beat = time * danceSpeed * TAU;
  const sway = Math.sin(beat * 0.5) * 10 * expressiveness * scale;
  const bounce = Math.abs(Math.sin(beat)) * (8 + energy * 14) * expressiveness * scale;
  const shoulderW = (gender === 'male' ? 46 : 40) * scale;
  const hipW = (gender === 'male' ? 34 : 40) * scale;
  const torso = (gender === 'male' ? 78 : 74) * scale;
  const headR = (gender === 'male' ? 18 : 17) * scale;
  const hip: V = { x: cx + sway * 0.35, y: cy + 48 * scale - bounce };
  const neck: V = { x: hip.x + Math.sin(beat * 0.35) * 6 * expressiveness * scale, y: hip.y - torso };
  const head: V = { x: neck.x, y: neck.y - headR * 1.35 };
  const shoulderL: V = { x: neck.x - shoulderW * 0.5, y: neck.y + 6 * scale };
  const shoulderR: V = { x: neck.x + shoulderW * 0.5, y: neck.y + 6 * scale };
  const arm = energy * 0.55 + expressiveness;
  const elbowL = polar(shoulderL, Math.PI * 0.55 + Math.sin(beat + 0.4) * 0.85 * arm, 42 * scale);
  const elbowR = polar(shoulderR, Math.PI * 0.45 - Math.sin(beat + 1.1) * 0.9 * arm, 42 * scale);
  const wristL = polar(elbowL, Math.PI * 0.35 + Math.cos(beat * 1.3) * 0.7 * arm, 38 * scale);
  const wristR = polar(elbowR, Math.PI * 0.65 - Math.cos(beat * 1.15) * 0.75 * arm, 38 * scale);
  const hipL: V = { x: hip.x - hipW * 0.5, y: hip.y };
  const hipR: V = { x: hip.x + hipW * 0.5, y: hip.y };
  const kneeL = polar(hipL, Math.PI * 0.5 + Math.sin(beat) * 0.35 * expressiveness, 52 * scale);
  const kneeR = polar(hipR, Math.PI * 0.5 - Math.sin(beat) * 0.35 * expressiveness, 52 * scale);
  const ankleL = polar(kneeL, Math.PI * 0.5 + Math.sin(beat + 0.2) * 0.2 * expressiveness, 50 * scale);
  const ankleR = polar(kneeR, Math.PI * 0.5 - Math.sin(beat + 0.2) * 0.2 * expressiveness, 50 * scale);
  return { head, neck, shoulderL, shoulderR, elbowL, elbowR, wristL, wristR, hip, hipL, hipR, kneeL, kneeR, ankleL, ankleR };
}

const limbs = (p: Pose): Array<[V, V]> => [
  [p.shoulderL, p.shoulderR], [p.neck, p.hip], [p.shoulderL, p.elbowL], [p.elbowL, p.wristL],
  [p.shoulderR, p.elbowR], [p.elbowR, p.wristR], [p.hipL, p.hipR], [p.hipL, p.kneeL],
  [p.kneeL, p.ankleL], [p.hipR, p.kneeR], [p.kneeR, p.ankleR],
];

function capsule(ctx: CanvasRenderingContext2D, a: V, b: V, r: number, fill: string, alpha: number) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(ang); ctx.globalAlpha = alpha; ctx.fillStyle = fill;
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(len, -r); ctx.arc(len, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(0, r); ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawStyle(style: DanceAvatarStyle, ctx: CanvasRenderingContext2D, pose: Pose, primary: string, accent: string, glow: number, energy: number, sparkle: number, time: number, width: number, height: number) {
  const segs = limbs(pose);
  if (style === 'shadow') {
    ctx.save(); ctx.shadowBlur = 28 * glow; ctx.shadowColor = accent; ctx.fillStyle = '#05060b'; ctx.globalAlpha = 0.92;
    ctx.beginPath(); ctx.arc(pose.head.x, pose.head.y, 20, 0, TAU); ctx.fill();
    for (const [a, b] of segs) capsule(ctx, a, b, 11, '#05060b', 0.95);
    ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = primary; ctx.lineWidth = 2.2; ctx.globalAlpha = 0.22 + energy * 0.2;
    ctx.beginPath(); ctx.arc(pose.head.x, pose.head.y, 21, 0, TAU); ctx.stroke(); ctx.restore();
    return;
  }
  if (style === 'particle') {
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.shadowBlur = 10 * glow; ctx.shadowColor = primary;
    for (const [a, b] of segs) {
      const steps = Math.round(10 + sparkle * 12);
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        ctx.globalAlpha = 0.35 + energy * 0.35; ctx.fillStyle = i % 3 === 0 ? accent : primary;
        ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * t + Math.sin(time * 3 + i) * 1.2, a.y + (b.y - a.y) * t + Math.cos(time * 2.4 + i) * 1.2, 1.4 + energy * 1.2, 0, TAU); ctx.fill();
      }
    }
    const joints = [pose.head, pose.neck, pose.shoulderL, pose.shoulderR, pose.elbowL, pose.elbowR, pose.wristL, pose.wristR, pose.hip, pose.hipL, pose.hipR, pose.kneeL, pose.kneeR, pose.ankleL, pose.ankleR];
    joints.forEach((j, i) => { ctx.globalAlpha = 0.55 + energy * 0.3; ctx.fillStyle = i % 2 === 0 ? primary : accent; ctx.beginPath(); ctx.arc(j.x, j.y, 3.2 + (i === 0 ? 6 : 0), 0, TAU); ctx.fill(); });
    ctx.restore(); return;
  }
  if (style === 'neon' || style === 'hologram') {
    ctx.save();
    if (style === 'hologram') {
      ctx.globalAlpha = 0.08 + energy * 0.08; ctx.strokeStyle = primary; ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 6) { const o = Math.sin(time * 2 + y * 0.05) * 4; ctx.beginPath(); ctx.moveTo(0, y + o); ctx.lineTo(width, y + o); ctx.stroke(); }
      ctx.setLineDash([6, 4]);
    }
    ctx.globalCompositeOperation = 'screen'; ctx.lineCap = 'round'; ctx.shadowBlur = (style === 'hologram' ? 22 : 18) * glow;
    ctx.shadowColor = primary; ctx.strokeStyle = primary; ctx.lineWidth = style === 'hologram' ? 2.4 : 3.2; ctx.globalAlpha = 0.55 + energy * 0.3;
    ctx.beginPath(); ctx.arc(pose.head.x, pose.head.y, 18, 0, TAU); ctx.stroke();
    for (const [a, b] of segs) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.setLineDash([]); ctx.shadowColor = accent; ctx.strokeStyle = accent; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.45 + energy * 0.2;
    for (const [a, b] of segs) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    if (style === 'hologram') {
      [pose.head, pose.wristL, pose.wristR, pose.ankleL, pose.ankleR, pose.hip].forEach((n, i) => {
        ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(time * 5 + i)); ctx.fillStyle = i % 2 === 0 ? primary : accent;
        ctx.beginPath(); ctx.arc(n.x, n.y, 3.5, 0, TAU); ctx.fill();
      });
    }
    ctx.restore(); return;
  }
  // humanoid
  ctx.save(); ctx.shadowBlur = 12 * glow; ctx.shadowColor = accent;
  capsule(ctx, pose.shoulderL, pose.shoulderR, 14, primary, 0.88); capsule(ctx, pose.neck, pose.hip, 16, primary, 0.9);
  capsule(ctx, pose.shoulderL, pose.elbowL, 9, accent, 0.85); capsule(ctx, pose.elbowL, pose.wristL, 7, accent, 0.8);
  capsule(ctx, pose.shoulderR, pose.elbowR, 9, accent, 0.85); capsule(ctx, pose.elbowR, pose.wristR, 7, accent, 0.8);
  capsule(ctx, pose.hipL, pose.kneeL, 11, primary, 0.86); capsule(ctx, pose.kneeL, pose.ankleL, 9, primary, 0.82);
  capsule(ctx, pose.hipR, pose.kneeR, 11, primary, 0.86); capsule(ctx, pose.kneeR, pose.ankleR, 9, primary, 0.82);
  ctx.globalAlpha = 0.95; ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(pose.head.x, pose.head.y, 18, 0, TAU); ctx.fill();
  ctx.globalAlpha = 0.35 + energy * 0.25; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}

export function renderDanceAvatars(surface: RenderSurface, frame: EngineFrame, config: DanceAvatarsConfig) {
  const { context, width, height } = surface;
  const energy = clamp(frame.energy * config.energyResponse);
  const primary = adjustSaturation(config.primaryColor, config.colorSaturation);
  const accent = adjustSaturation(config.accentColor, config.colorSaturation);
  const scale = config.spaceScale * (0.92 + energy * 0.08);
  const cx = width * 0.5, cy = height * 0.46;
  const bg = context.createRadialGradient(cx, cy, 20, cx, cy, width * 0.75);
  bg.addColorStop(0, `hsl(250 38% ${9 + energy * 6}%)`); bg.addColorStop(0.55, '#070914'); bg.addColorStop(1, '#03050b');
  context.globalAlpha = 1; context.fillStyle = bg; context.fillRect(0, 0, width, height);
  const floorY = cy + 150 * scale;
  const floor = context.createRadialGradient(cx, floorY, 10, cx, floorY, width * 0.35);
  floor.addColorStop(0, `rgba(138, 107, 255, ${0.12 + energy * 0.12})`); floor.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = floor; context.fillRect(0, 0, width, height);
  const pose = buildPose(cx, cy, scale, frame.time, energy, config.limbExpressiveness, config.danceSpeed, config.gender);
  drawStyle(config.style, context, pose, primary, accent, config.glowIntensity, energy, config.sparkleDensity, frame.time, width, height);
  drawAmbientSparkles(context, width, height, frame.time, config.sparkleDensity * 0.85, accent);
  applyWarmthOverlay(context, width, height, config.warmth);
  if (config.showTitle && frame.title) {
    context.fillStyle = '#eef1fb'; context.textAlign = 'center'; context.font = '500 30px Manrope, sans-serif'; context.globalAlpha = 1;
    context.fillText(frame.title, width / 2, height - 54, width - 120);
  }
}
