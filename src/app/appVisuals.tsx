import React from 'react';
import { Waveform } from '../components/audio/Waveform';
import { useLocale } from '../i18n/LocaleContext';
import type { Engine } from './engines.catalog';

const waveform = Array.from({ length: 72 }, (_, i) => 18 + Math.abs(Math.sin(i * 0.38)) * 54 + (i % 7) * 3);
const spectrum = Array.from({ length: 44 }, (_, i) => 16 + Math.abs(Math.sin(i * 0.55)) * 68 + (i % 5) * 4);

export function PreviewCanvas({ engine, full = false }: { engine: Engine; full?: boolean }) {
  return (
    <div className={`preview-canvas ${full ? 'full' : ''}`} style={{ background: engine.preview, borderRadius: `var(--preview-radius)` }}>
      {engine.key === 'cosmic' && <CosmicVisual />}
      {engine.key === 'geometry' && <GeometryVisual />}
      {engine.key === 'liquid' && <LiquidVisual />}
      {engine.key === 'city' && <CityVisual />}
      {engine.key === 'album' && <AlbumVisual />}
      {engine.key === 'neon' && <NeonVisual />}
      {engine.key === 'sphere' && <SphereVisual />}
      {engine.key === 'avatar' && <AvatarVisual />}
      <span className="live-badge">{engine.name}</span>
      <Waveform bars={waveform.slice(0, 40)} compact />
    </div>
  );
}

export function CosmicVisual() {
  return (
    <>
      <div className="nebula nebula-a" />
      <div className="nebula nebula-b" />
      {Array.from({ length: 20 }, (_, i) => (
        <i className="particle" key={i} style={{ left: `${(i * 17) % 96}%`, animationDelay: `${(i % 9) * 0.5}s` }} />
      ))}
    </>
  );
}

export function GeometryVisual() {
  return (
    <div className="geometry-visual">
      <span />
      <span />
      <span />
    </div>
  );
}

export function LiquidVisual() {
  return <div className="liquid-visual" />;
}

export function CityVisual() {
  return (
    <div className="city-visual">
      {spectrum.slice(0, 18).map((height, index) => (
        <span key={index} style={{ height: `${height}%`, animationDelay: `${index * 0.12}s` }} />
      ))}
    </div>
  );
}

export function AlbumVisual() {
  return (
    <div className="album-visual">
      <span />
    </div>
  );
}

export function NeonVisual() {
  return (
    <svg className="neon-visual" viewBox="0 0 300 170" aria-hidden="true">
      <path d="M20,150 C90,20 160,160 280,40" />
      <path d="M20,120 C80,40 170,130 280,30" />
    </svg>
  );
}

export function SphereVisual() {
  return (
    <div className="sphere-visual" aria-hidden="true">
      <span className="sphere-core" />
      <span className="sphere-ring ring-a" />
      <span className="sphere-ring ring-b" />
      <span className="sphere-ring ring-c" />
      {Array.from({ length: 18 }, (_, i) => (
        <i className="sphere-dot" key={i} style={{ '--i': i } as React.CSSProperties} />
      ))}
    </div>
  );
}

export function AvatarVisual() {
  return (
    <div className="avatar-visual" aria-hidden="true">
      <span className="avatar-glow" />
      <span className="avatar-figure" />
    </div>
  );
}

export function EngineCard({ engine, onClick }: { engine: Engine; onClick: () => void }) {
  const { t } = useLocale();
  return (
    <button className="engine-card" onClick={onClick}>
      <div
        className="engine-thumb"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(5, 6, 11, 0.04), rgba(5, 6, 11, 0.42)), url(${engine.thumbnail})` }}
      >
        <span>{engine.number}</span>
      </div>
      <strong>{engine.name}</strong>
      <p>{t(`${engine.key}Character`)}</p>
    </button>
  );
}

export function SectionHeader({ label, note, compact = false }: { label: string; note?: string; compact?: boolean }) {
  return (
    <div className={`section-header ${compact ? 'compact' : ''}`}>
      <h2>{label}</h2>
      {note && <p>{note}</p>}
    </div>
  );
}

export function ScreenTitle({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) {
  return (
    <div className="screen-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{note}</p>
    </div>
  );
}

export function PanelHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="panel-heading">
      {icon}
      <h2>{label}</h2>
    </div>
  );
}

export function Spectrum({ bars }: { bars: number[] }) {
  return (
    <div className="spectrum" aria-hidden="true">
      {bars.map((bar, index) => (
        <span key={index} style={{ height: `${bar}%` }} />
      ))}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
