import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AudioLines,
  ChevronRight,
  CircleGauge,
  Clapperboard,
  Download,
  Eye,
  FileAudio,
  Film,
  Gauge,
  Home,
  Layers3,
  Moon,
  Palette,
  Play,
  Settings,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import planReference from '../references/Plan-Visual-Melody.png';
import studioReference from '../references/AiXel-Studio-Visual-Melody.png';
import logoReference from '../references/logo-references/Logo-AiXel-Visual-Melody.png';
import './styles.css';

type Screen = 'home' | 'analyze' | 'create' | 'preview' | 'export' | 'settings' | 'design-system';

type EngineKey = 'cosmic' | 'geometry' | 'liquid' | 'city' | 'album' | 'neon';

type Engine = {
  key: EngineKey;
  number: string;
  name: string;
  character: string;
  motion: string;
  accentFrom: string;
  accentTo: string;
  preview: string;
  radius: number;
  mood: string;
};

const screens: Array<{ id: Screen; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'create', label: 'Create' },
  { id: 'preview', label: 'Preview' },
  { id: 'export', label: 'Export' },
  { id: 'settings', label: 'Settings' },
];

const engines: Engine[] = [
  {
    key: 'cosmic',
    number: '01',
    name: 'Cosmic Waves',
    character: 'Nebulas, soft particles, deep space.',
    motion: 'Slow drift and breathing opacity.',
    accentFrom: '#7fe0ff',
    accentTo: '#8a6bff',
    preview: 'radial-gradient(circle at 30% 25%, #3a6bd8 0%, #1a2a66 42%, #05060b 100%)',
    radius: 22,
    mood: 'The light breathes, nebulas drifting slowly like held breath.',
  },
  {
    key: 'geometry',
    number: '02',
    name: 'Jazz Geometry',
    character: 'Concentric circles and harmonic rings.',
    motion: 'Independent slow rotation.',
    accentFrom: '#e7c977',
    accentTo: '#f4e3b0',
    preview: 'radial-gradient(circle at 55% 40%, #2a2f4a 0%, #10121e 65%, #05060b 100%)',
    radius: 14,
    mood: 'Everything becomes geometric, circles moving in quiet harmony.',
  },
  {
    key: 'liquid',
    number: '03',
    name: 'Liquid Colors',
    character: 'Ink-like gradients and organic blur.',
    motion: 'Continuous liquid gradient shift.',
    accentFrom: '#e08a4a',
    accentTo: '#a24fc9',
    preview: 'linear-gradient(120deg, #c9682f, #7a2f8a, #1a2a66)',
    radius: 34,
    mood: 'The interface turns liquid, ink folding into ink.',
  },
  {
    key: 'city',
    number: '04',
    name: 'Frequency City',
    character: 'Architectural skyline of spectrum bars.',
    motion: 'Independent bar pulse per building.',
    accentFrom: '#e750b4',
    accentTo: '#5fd0ff',
    preview: 'linear-gradient(0deg, #05060b 0%, #1a1030 42%, #2a1040 100%)',
    radius: 12,
    mood: 'A skyline of sound, architecture built from spectrum.',
  },
  {
    key: 'album',
    number: '05',
    name: 'Minimal Album Art',
    character: 'Graphite vinyl and one gold accent.',
    motion: 'Constant slow rotation.',
    accentFrom: '#e7c977',
    accentTo: '#ffffff',
    preview: 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #060606 65%, #05060b 100%)',
    radius: 20,
    mood: 'Minimal and monochrome, the record spinning in silence.',
  },
  {
    key: 'neon',
    number: '06',
    name: 'Neon Velvet',
    character: 'Synthwave light trails on deep purple.',
    motion: 'Traveling neon trail animation.',
    accentFrom: '#5fd0ff',
    accentTo: '#8a6bff',
    preview: 'linear-gradient(135deg, #150a2e 0%, #2a0a4a 52%, #05060b 100%)',
    radius: 22,
    mood: 'Lights turn to velvet, synthwave trails in the dark.',
  },
];

const waveform = Array.from({ length: 72 }, (_, i) => 18 + Math.abs(Math.sin(i * 0.38)) * 54 + (i % 7) * 3);
const spectrum = Array.from({ length: 44 }, (_, i) => 16 + Math.abs(Math.sin(i * 0.55)) * 68 + (i % 5) * 4);

function screenFromHash(): Screen {
  const hash = window.location.hash.replace('#', '') as Screen;
  return screens.some((screen) => screen.id === hash) || hash === 'design-system' ? hash : 'home';
}

function App() {
  const [screen, setScreen] = useState<Screen>(() => screenFromHash());
  const [activeEngine, setActiveEngine] = useState<EngineKey>('cosmic');
  const [activePreset, setActivePreset] = useState('Naomi');
  const [selectedMood, setSelectedMood] = useState('More Emotional');

  const engine = useMemo(
    () => engines.find((item) => item.key === activeEngine) ?? engines[0],
    [activeEngine],
  );

  useEffect(() => {
    const onHash = () => setScreen(screenFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (next: Screen) => {
    window.location.hash = next;
    setScreen(next);
  };

  return (
    <div
      className={`app-shell engine-${engine.key}`}
      style={
        {
          '--accent-from': engine.accentFrom,
          '--accent-to': engine.accentTo,
          '--preview-radius': `${engine.radius}px`,
        } as React.CSSProperties
      }
    >
      <CosmicBackground />
      <TopNavigation current={screen} onNavigate={navigate} />
      <main>
        {screen === 'home' && <HomeScreen onNavigate={navigate} onEngine={setActiveEngine} />}
        {screen === 'analyze' && <AnalyzeScreen onNavigate={navigate} />}
        {screen === 'create' && (
          <CreateScreen
            activeEngine={activeEngine}
            activePreset={activePreset}
            selectedMood={selectedMood}
            engine={engine}
            onEngine={setActiveEngine}
            onPreset={setActivePreset}
            onMood={setSelectedMood}
            onNavigate={navigate}
          />
        )}
        {screen === 'preview' && <PreviewScreen engine={engine} onNavigate={navigate} />}
        {screen === 'export' && <ExportScreen engine={engine} />}
        {screen === 'settings' && <SettingsScreen onNavigate={navigate} />}
        {screen === 'design-system' && <DesignSystemScreen />}
      </main>
    </div>
  );
}

function CosmicBackground() {
  return (
    <div className="cosmic-bg" aria-hidden="true">
      <div className="haze" />
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      {Array.from({ length: 54 }, (_, i) => (
        <span
          className="star"
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 61) % 100}%`,
            animationDelay: `${(i % 11) * 0.45}s`,
          }}
        />
      ))}
    </div>
  );
}

function TopNavigation({ current, onNavigate }: { current: Screen; onNavigate: (screen: Screen) => void }) {
  return (
    <header className="top-nav">
      <button className="brand" onClick={() => onNavigate('home')} aria-label="Go to Home">
        <img src={logoReference} alt="" />
        <span>
          <strong>AiXel</strong> Visual Melody
          <small>AiXel Studio</small>
        </span>
      </button>
      <nav aria-label="Primary">
        {screens.map((item) => (
          <button
            className={current === item.id ? 'active' : ''}
            key={item.id}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <button className="icon-button" onClick={() => onNavigate('settings')} aria-label="Settings">
        <Settings size={17} />
      </button>
    </header>
  );
}

function HomeScreen({
  onNavigate,
  onEngine,
}: {
  onNavigate: (screen: Screen) => void;
  onEngine: (engine: EngineKey) => void;
}) {
  return (
    <section className="screen home-screen">
      <div className="hero">
        <p className="eyebrow">Visual Intelligence for Music</p>
        <h1>
          Transform Your Music Into <span>Living Visuals</span>
        </h1>
        <p className="poetic">Every Note Becomes Light.</p>
        <div className="hero-actions">
          <button className="primary-action" onClick={() => onNavigate('analyze')}>
            <FileAudio size={18} />
            Import Music
          </button>
          <button className="secondary-action" onClick={() => onNavigate('create')}>
            <WandSparkles size={18} />
            Create New Project
          </button>
        </div>
      </div>

      <GlassPanel className="reference-strip">
        <div className="play-disc">
          <Play size={16} fill="currentColor" />
        </div>
        <div>
          <p className="tiny-label gold">Golden Reference Track</p>
          <h2>In the Spirit of Naomi</h2>
        </div>
        <Waveform bars={waveform.slice(0, 56)} />
        <p>Benchmark for AI analysis</p>
      </GlassPanel>

      <SectionHeader label="Six Visual Engines" note="Every world has its own language of light" />
      <div className="engine-grid">
        {engines.map((engine) => (
          <EngineCard
            engine={engine}
            key={engine.key}
            onClick={() => {
              onEngine(engine.key);
              onNavigate('create');
            }}
          />
        ))}
      </div>

      <div className="home-lower">
        <GlassPanel>
          <SectionHeader label="The Creative Pipeline" compact />
          <div className="pipeline">
            {[
              ['Import', FileAudio],
              ['Analyze', AudioLines],
              ['Create', Sparkles],
              ['Preview', Eye],
              ['Export', Download],
            ].map(([label, Icon], index) => {
              const PipelineIcon = Icon as typeof FileAudio;
              return (
                <div className="pipeline-step" key={label as string}>
                  <span>
                    <PipelineIcon size={19} />
                  </span>
                  <strong>{label as string}</strong>
                  {index < 4 && <ChevronRight size={17} />}
                </div>
              );
            })}
          </div>
        </GlassPanel>
        <GlassPanel>
          <SectionHeader label="Approved References" compact />
          <div className="reference-gallery">
            <img src={planReference} alt="Approved AiXel Visual Melody plan board" />
            <img src={studioReference} alt="Approved AiXel Visual Melody studio reference" />
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}

function AnalyzeScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <section className="screen analysis-layout">
      <ScreenTitle eyebrow="Analyze" title="In the Spirit of Naomi" note="Representative analysis only. No real audio engine is active in V0.1." />
      <div className="analysis-grid">
        <GlassPanel className="span-2">
          <PanelHeading icon={<AudioLines size={18} />} label="Waveform and FFT Spectrum" />
          <Waveform bars={waveform} large />
          <Spectrum bars={spectrum} />
        </GlassPanel>
        <GlassPanel>
          <PanelHeading icon={<CircleGauge size={18} />} label="Detected Structure" />
          <Metric label="BPM" value="72" />
          <Metric label="Key" value="A / E" />
          <Metric label="Dynamics" value="Moderate" />
          <Metric label="Stereo Image" value="Wide" />
        </GlassPanel>
        <GlassPanel>
          <PanelHeading icon={<Sparkles size={18} />} label="Emotion Profile" />
          <div className="chips">
            {['Reflective', 'Expansive', 'Tender', 'Dreamy', 'Luminous', 'Calm'].map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
        </GlassPanel>
        <GlassPanel className="ai-panel">
          <PanelHeading icon={<WandSparkles size={18} />} label="AiXel Intelligence" />
          <blockquote>
            Ballad detected. Moderate dynamics. Rich harmonic movement. Recommended palette: Blue Aurora.
          </blockquote>
          <button className="primary-action" onClick={() => onNavigate('create')}>
            Generate
            <ChevronRight size={17} />
          </button>
        </GlassPanel>
      </div>
    </section>
  );
}

function CreateScreen({
  activeEngine,
  activePreset,
  selectedMood,
  engine,
  onEngine,
  onPreset,
  onMood,
  onNavigate,
}: {
  activeEngine: EngineKey;
  activePreset: string;
  selectedMood: string;
  engine: Engine;
  onEngine: (engine: EngineKey) => void;
  onPreset: (preset: string) => void;
  onMood: (mood: string) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const presets = ['Naomi', 'Dream', 'Universe', 'Rain', 'Blue', 'Neon', 'Galaxy', 'Jazz Club', 'Deep Space', 'Ocean'];
  const moods = ['More Cinematic', 'More Emotional', 'More Dreamy', 'More Powerful', 'More Organic', 'More Minimal'];

  return (
    <section className="screen create-layout">
      <ScreenTitle eyebrow="Creative Studio" title="In the Spirit of Naomi" note={engine.mood} />
      <div className="engine-tabs">
        {engines.map((item) => (
          <button
            className={activeEngine === item.key ? 'active' : ''}
            key={item.key}
            onClick={() => onEngine(item.key)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="studio-grid">
        <div className="studio-main">
          <PreviewCanvas engine={engine} />
          <GlassPanel>
            <PanelHeading icon={<Palette size={18} />} label="Visual Presets" />
            <div className="chips wrap">
              {presets.map((preset) => (
                <button
                  className={activePreset === preset ? 'selected' : ''}
                  key={preset}
                  onClick={() => onPreset(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </GlassPanel>
        </div>
        <GlassPanel className="director">
          <PanelHeading icon={<SlidersHorizontal size={18} />} label="AiXel Director" />
          <p className="muted">Tell it how to feel. The shell translates that into sample motion settings.</p>
          <div className="chips wrap mood-chips">
            {moods.map((mood) => (
              <button
                className={selectedMood === mood ? 'selected' : ''}
                key={mood}
                onClick={() => onMood(mood)}
              >
                {mood}
              </button>
            ))}
          </div>
          <div className="fine-tuning">
            {[
              ['Emotion', 72],
              ['Space', 58],
              ['Fluidity', 64],
              ['Light', 80],
              ['Dynamics', 45],
              ['Particles', 66],
              ['Color Energy', 52],
              ['Motion Complexity', 38],
            ].map(([label, value]) => (
              <label key={label as string}>
                <span>
                  {label}
                  <em>{value}%</em>
                </span>
                <input type="range" min="0" max="100" value={value as number} readOnly />
              </label>
            ))}
          </div>
          <button className="primary-action full" onClick={() => onNavigate('preview')}>
            Continue to Preview
            <ChevronRight size={17} />
          </button>
        </GlassPanel>
      </div>
    </section>
  );
}

function PreviewScreen({ engine, onNavigate }: { engine: Engine; onNavigate: (screen: Screen) => void }) {
  return (
    <section className="screen preview-screen">
      <div className="cinema">
        <PreviewCanvas engine={engine} full />
        <div className="cinema-overlay">
          <div>
            <p className="tiny-label">Cosmic Waves Preview</p>
            <h1>In the Spirit of Naomi</h1>
            <p className="poetic">Every note leaves a trace of light.</p>
          </div>
          <button className="primary-action" onClick={() => onNavigate('export')}>
            Export
            <Download size={17} />
          </button>
        </div>
      </div>
      <GlassPanel className="transport">
        <button className="icon-button" aria-label="Play preview">
          <Play size={18} fill="currentColor" />
        </button>
        <Waveform bars={waveform.slice(0, 64)} />
        <div className="quality">
          <button className="selected">1080p</button>
          <button>4K</button>
          <button>8K</button>
        </div>
      </GlassPanel>
    </section>
  );
}

function ExportScreen({ engine }: { engine: Engine }) {
  return (
    <section className="screen export-layout">
      <ScreenTitle eyebrow="Export" title="Render for every stage" note="This V0.1 shell shows export states only. Encoding is intentionally not implemented." />
      <div className="export-grid">
        <GlassPanel className="span-2">
          <PanelHeading icon={<Film size={18} />} label="Format Grid" />
          <div className="format-grid">
            {['YouTube 16:9', 'Instagram Reel', 'TikTok 9:16', 'Square 1:1', '4K Master', '8K Master', 'Wallpaper', 'Transparent'].map((item) => (
              <button key={item}>{item}</button>
            ))}
          </div>
        </GlassPanel>
        <GlassPanel>
          <PanelHeading icon={<Gauge size={18} />} label="Render Progress" />
          <div className="render-preview" style={{ background: engine.preview }} />
          <div className="progress-track">
            <span />
          </div>
          <p className="muted">Composing frame 1842 of 6420. Sample status only.</p>
        </GlassPanel>
      </div>
    </section>
  );
}

function SettingsScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <section className="screen settings-layout">
      <ScreenTitle eyebrow="Settings" title="Three sections only" note="Settings remain accessible from every screen." />
      <div className="settings-grid">
        {[
          ['Audio', ['Input sensitivity', 'Analysis cache', 'Reference track lock']],
          ['Visual', ['Reduced motion aware', 'Preview quality', 'Engine accent sync']],
          ['Performance', ['GPU preview mode', 'Background render queue', 'Memory saver']],
        ].map(([section, rows]) => (
          <GlassPanel key={section as string}>
            <PanelHeading icon={<Settings size={18} />} label={section as string} />
            {(rows as string[]).map((row) => (
              <div className="setting-row" key={row}>
                <span>{row}</span>
                <button>On</button>
              </div>
            ))}
          </GlassPanel>
        ))}
      </div>
      <button className="secondary-action" onClick={() => onNavigate('design-system')}>
        View Design System
      </button>
    </section>
  );
}

function DesignSystemScreen() {
  return (
    <section className="screen design-system">
      <ScreenTitle eyebrow="Design System" title="Master Design Package V1.0" note="Tokens and components translated into the V0.1 React shell." />
      <div className="token-grid">
        {['#05060b', '#1a2a66', '#5fd0ff', '#8a6bff', '#e7c977', '#eef1fb', '#e750b4'].map((color) => (
          <GlassPanel key={color}>
            <span className="swatch" style={{ background: color }} />
            <strong>{color}</strong>
          </GlassPanel>
        ))}
      </div>
      <GlassPanel>
        <PanelHeading icon={<Layers3 size={18} />} label="Component Map" />
        <div className="component-list">
          {['AppShell', 'TopNavigation', 'GlassPanel', 'VisualEngineCard', 'AiXelDirector', 'PreviewCanvas', 'AudioTimeline', 'ExportFormatCard'].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </GlassPanel>
    </section>
  );
}

function PreviewCanvas({ engine, full = false }: { engine: Engine; full?: boolean }) {
  return (
    <div className={`preview-canvas ${full ? 'full' : ''}`} style={{ background: engine.preview, borderRadius: `var(--preview-radius)` }}>
      {engine.key === 'cosmic' && <CosmicVisual />}
      {engine.key === 'geometry' && <GeometryVisual />}
      {engine.key === 'liquid' && <LiquidVisual />}
      {engine.key === 'city' && <CityVisual />}
      {engine.key === 'album' && <AlbumVisual />}
      {engine.key === 'neon' && <NeonVisual />}
      <span className="live-badge">{engine.name}</span>
      <Waveform bars={waveform.slice(0, 40)} compact />
    </div>
  );
}

function CosmicVisual() {
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

function GeometryVisual() {
  return (
    <div className="geometry-visual">
      <span />
      <span />
      <span />
    </div>
  );
}

function LiquidVisual() {
  return <div className="liquid-visual" />;
}

function CityVisual() {
  return (
    <div className="city-visual">
      {spectrum.slice(0, 18).map((height, index) => (
        <span key={index} style={{ height: `${height}%`, animationDelay: `${index * 0.12}s` }} />
      ))}
    </div>
  );
}

function AlbumVisual() {
  return (
    <div className="album-visual">
      <span />
    </div>
  );
}

function NeonVisual() {
  return (
    <svg className="neon-visual" viewBox="0 0 300 170" aria-hidden="true">
      <path d="M20,150 C90,20 160,160 280,40" />
      <path d="M20,120 C80,40 170,130 280,30" />
    </svg>
  );
}

function EngineCard({ engine, onClick }: { engine: Engine; onClick: () => void }) {
  return (
    <button className="engine-card" onClick={onClick}>
      <div className="engine-thumb" style={{ background: engine.preview }}>
        <span>{engine.number}</span>
      </div>
      <strong>{engine.name}</strong>
      <p>{engine.character}</p>
    </button>
  );
}

function GlassPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass-panel ${className}`}>{children}</div>;
}

function SectionHeader({ label, note, compact = false }: { label: string; note?: string; compact?: boolean }) {
  return (
    <div className={`section-header ${compact ? 'compact' : ''}`}>
      <h2>{label}</h2>
      {note && <p>{note}</p>}
    </div>
  );
}

function ScreenTitle({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) {
  return (
    <div className="screen-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{note}</p>
    </div>
  );
}

function PanelHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="panel-heading">
      {icon}
      <h2>{label}</h2>
    </div>
  );
}

function Waveform({ bars, large = false, compact = false }: { bars: number[]; large?: boolean; compact?: boolean }) {
  return (
    <div className={`waveform ${large ? 'large' : ''} ${compact ? 'compact' : ''}`} aria-hidden="true">
      {bars.map((bar, index) => (
        <span key={index} style={{ height: `${bar}%` }} />
      ))}
    </div>
  );
}

function Spectrum({ bars }: { bars: number[] }) {
  return (
    <div className="spectrum" aria-hidden="true">
      {bars.map((bar, index) => (
        <span key={index} style={{ height: `${bar}%` }} />
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
