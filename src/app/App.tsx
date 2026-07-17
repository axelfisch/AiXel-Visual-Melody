import React, { useMemo, useState } from 'react';
import {
  AudioLines,
  ChevronRight,
  CircleGauge,
  Clapperboard,
  Download,
  Eye,
  FileAudio,
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
import planReference from '../../references/Plan-Visual-Melody.png';
import studioReference from '../../references/AiXel-Studio-Visual-Melody.png';
import logoReference from '../../references/logo-references/Logo-AiXel-Visual-Melody.png';
import { analyzeAudioFile, formatTime, type AnalyzeAudioResult, type AudioAnalysis } from '../audio';
import { Waveform } from '../components/audio/Waveform';
import { GlassPanel } from '../components/layout/GlassPanel';
import { getEngineOrDefault } from '../engines/engine.registry';
import {
  directorCapabilities,
  directorMoodProfiles,
  mapDirectorToEngine,
  type DirectorDimension,
  type DirectorMood,
  type DirectorState,
} from '../director';
import { useProject } from '../project/project.context';
import { ExportScreen } from '../screens/ExportScreen';
import { PreviewScreen } from '../screens/PreviewScreen';
import { screens, useHashNavigation, type Screen } from './navigation';

type EngineKey = 'cosmic' | 'geometry' | 'liquid' | 'city' | 'album' | 'neon';

type Engine = {
  id: string;
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

const engines: Engine[] = [
  {
    id: 'cosmic-waves',
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
    id: 'jazz-geometry',
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
    id: 'liquid-colors',
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
    id: 'frequency-city',
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
    id: 'minimal-album-art',
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
    id: 'neon-velvet',
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

export function App() {
  const { screen, navigate } = useHashNavigation();
  const { project, runtime, dispatch, setAnalyzedAudio } = useProject();
  const [goldenBusy, setGoldenBusy] = useState(false);
  const [goldenError, setGoldenError] = useState('');
  const [autoPlayPreview, setAutoPlayPreview] = useState(false);

  const engine = useMemo(
    () => engines.find((item) => item.id === project.engine.engineId) ?? engines[4],
    [project.engine.engineId],
  );
  const renderEngine = useMemo(() => getEngineOrDefault(project.engine.engineId), [project.engine.engineId]);
  const activeEngine = engine.key;
  const activePreset = project.engine.presetId ?? 'Naomi';
  const selectedMood = project.engine.director.mood;
  const directorValues = project.engine.director.values;
  const supportedDirectorDimensions = useMemo(
    () => directorCapabilities(project.engine.engineId),
    [project.engine.engineId],
  );
  const selectEngine = (key: EngineKey) => {
    const selected = engines.find((item) => item.key === key);
    if (selected) {
      const mapped = mapDirectorToEngine(selected.id, directorValues);
      dispatch({ type: 'SELECT_ENGINE', engineId: selected.id, parameters: mapped.parameters });
    }
  };
  const applyDirector = (values: DirectorState, mood: DirectorMood | null) => {
    const mapped = mapDirectorToEngine(project.engine.engineId, values, project.engine.parameters);
    dispatch({ type: 'APPLY_DIRECTOR', mood, values, parameters: mapped.parameters });
  };
  const analysis = useMemo<AudioAnalysis | null>(() => {
    if (!project.analysis || !project.audio || !runtime.decodedAudio) return null;
    return {
      ...project.analysis,
      name: project.name,
      duration: project.audio.duration,
      buffer: runtime.decodedAudio,
    };
  }, [project.analysis, project.audio, project.name, runtime.decodedAudio]);
  const openGoldenReference = async () => {
    if (analysis && project.name === 'In the Spirit of Naomi') {
      setAutoPlayPreview(true);
      navigate('preview');
      return;
    }
    setGoldenBusy(true);
    setGoldenError('');
    try {
      const response = await fetch('/audio/in-the-spirit-of-naomi.m4a');
      if (!response.ok) throw new Error('Le Golden Reference est introuvable.');
      const blob = await response.blob();
      const file = new File([blob], 'In the Spirit of Naomi.m4a', { type: blob.type || 'audio/mp4' });
      const result = await analyzeAudioFile(file);
      setAnalyzedAudio(file, result);
      selectEngine('album');
      setAutoPlayPreview(true);
      navigate('preview');
    } catch (reason) {
      setGoldenError(reason instanceof Error ? reason.message : "Le Golden Reference n’a pas pu être chargé.");
    } finally {
      setGoldenBusy(false);
    }
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
        {screen === 'home' && (
          <HomeScreen
            onNavigate={navigate}
            onEngine={selectEngine}
            onGoldenReference={() => void openGoldenReference()}
            goldenBusy={goldenBusy}
            goldenError={goldenError}
          />
        )}
        {screen === 'analyze' && (
          <AnalyzeScreen
            analysis={analysis}
            onAnalysis={setAnalyzedAudio}
            onNavigate={navigate}
          />
        )}
        {screen === 'create' && (
          <CreateScreen
            activeEngine={activeEngine}
            activePreset={activePreset}
            selectedMood={selectedMood}
            directorValues={directorValues}
            supportedDirectorDimensions={supportedDirectorDimensions}
            engine={engine}
            projectName={project.name}
            onEngine={selectEngine}
            onPreset={(presetId) => dispatch({ type: 'SELECT_PRESET', presetId })}
            onMood={(mood) => applyDirector(directorMoodProfiles[mood], mood)}
            onDirectorChange={(dimension, value) => applyDirector({ ...directorValues, [dimension]: value }, null)}
            onNavigate={navigate}
          />
        )}
        {screen === 'preview' && (
          <PreviewScreen
            onNavigate={navigate}
            autoPlay={autoPlayPreview}
            onAutoPlayHandled={() => setAutoPlayPreview(false)}
          />
        )}
        {screen === 'export' && (
          <ExportScreen
            analysis={analysis}
            engine={renderEngine}
            engineConfig={project.engine.parameters}
            previewBackground={engine.preview}
            settings={project.export}
          />
        )}
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
  onGoldenReference,
  goldenBusy,
  goldenError,
}: {
  onNavigate: (screen: Screen) => void;
  onEngine: (engine: EngineKey) => void;
  onGoldenReference: () => void;
  goldenBusy: boolean;
  goldenError: string;
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
        <button
          className="play-disc"
          onClick={onGoldenReference}
          disabled={goldenBusy}
          aria-label="Play In the Spirit of Naomi in reactive preview"
        >
          <Play size={16} fill="currentColor" />
        </button>
        <div>
          <p className="tiny-label gold">Golden Reference Track</p>
          <h2>In the Spirit of Naomi</h2>
        </div>
        <Waveform bars={waveform.slice(0, 56)} />
        <button className="golden-open" onClick={onGoldenReference} disabled={goldenBusy}>
          {goldenBusy ? 'Analyzing the light…' : 'Open Reactive Preview'}
          <ChevronRight size={16} />
        </button>
      </GlassPanel>
      {goldenError && <p className="error-message golden-error" role="alert">{goldenError}</p>}

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

function AnalyzeScreen({
  analysis,
  onAnalysis,
  onNavigate,
}: {
  analysis: AudioAnalysis | null;
  onAnalysis: (file: File, result: AnalyzeAudioResult) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const intelligenceSummary = analysis
    ? `${analysis.bpm < 80 ? 'Tempo posé' : analysis.bpm < 120 ? 'Tempo modéré' : 'Tempo énergique'}. ${analysis.averageEnergy < 0.2 ? 'Dynamique délicate' : analysis.averageEnergy < 0.5 ? 'Dynamique équilibrée' : 'Dynamique intense'}. L’analyse est prête : choisissez maintenant votre moteur visuel dans Create.`
    : 'Importez un morceau pour obtenir son profil musical avant de choisir un moteur visuel.';

  const importFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const result = await analyzeAudioFile(file);
      onAnalysis(file, result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ce fichier audio ne peut pas être analysé.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="screen analysis-layout">
      <ScreenTitle eyebrow="Analyze" title={analysis?.name ?? 'Import a short track'} note="L’analyse audio est effectuée localement dans votre navigateur." />
      <GlassPanel className="audio-import span-2">
        <label className="primary-action file-action">
          <FileAudio size={18} />
          {busy ? 'Analyse en cours…' : 'Choisir un morceau'}
          <input type="file" accept="audio/*" disabled={busy} onChange={(event) => void importFile(event.target.files?.[0])} />
        </label>
        <p className="muted">WAV, MP3, M4A, AAC, OGG ou FLAC · 15 minutes et 150 Mo maximum.</p>
        {error && <p className="error-message" role="alert">{error}</p>}
      </GlassPanel>
      <div className="analysis-grid">
        <GlassPanel className="span-2">
          <PanelHeading icon={<AudioLines size={18} />} label="Waveform and FFT Spectrum" />
          <Waveform bars={analysis?.waveform ?? waveform} large />
          <Spectrum bars={(analysis?.energy.slice(0, 44).map((value) => 12 + value * 88)) ?? spectrum} />
        </GlassPanel>
        <GlassPanel>
          <PanelHeading icon={<CircleGauge size={18} />} label="Detected Structure" />
          <Metric label="BPM estimé" value={analysis ? String(analysis.bpm) : '—'} />
          <Metric label="Durée" value={analysis ? formatTime(analysis.duration) : '—'} />
          <Metric label="Échantillonnage" value={analysis ? `${Math.round(analysis.sampleRate / 1000)} kHz` : '—'} />
          <Metric label="Pic" value={analysis ? `${Math.round(analysis.peak * 100)}%` : '—'} />
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
            {intelligenceSummary}
          </blockquote>
          <button className="primary-action" disabled={!analysis} onClick={() => onNavigate('create')}>
            Continuer vers Create
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
  directorValues,
  supportedDirectorDimensions,
  engine,
  projectName,
  onEngine,
  onPreset,
  onMood,
  onDirectorChange,
  onNavigate,
}: {
  activeEngine: EngineKey;
  activePreset: string;
  selectedMood: DirectorMood | null;
  directorValues: DirectorState;
  supportedDirectorDimensions: DirectorDimension[];
  engine: Engine;
  projectName: string;
  onEngine: (engine: EngineKey) => void;
  onPreset: (preset: string) => void;
  onMood: (mood: DirectorMood) => void;
  onDirectorChange: (dimension: DirectorDimension, value: number) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const presets = ['Naomi', 'Dream', 'Universe', 'Rain', 'Blue', 'Neon', 'Galaxy', 'Jazz Club', 'Deep Space', 'Ocean'];
  const moods: DirectorMood[] = ['More Cinematic', 'More Emotional', 'More Dreamy', 'More Powerful', 'More Organic', 'More Minimal'];
  const directorControls: Array<{ dimension: DirectorDimension; label: string }> = [
    { dimension: 'emotion', label: 'Emotion' },
    { dimension: 'space', label: 'Space' },
    { dimension: 'fluidity', label: 'Fluidity' },
    { dimension: 'light', label: 'Light' },
    { dimension: 'dynamics', label: 'Dynamics' },
    { dimension: 'particles', label: 'Particles' },
    { dimension: 'colorEnergy', label: 'Color Energy' },
    { dimension: 'motionComplexity', label: 'Motion Complexity' },
  ];

  return (
    <section className="screen create-layout">
      <ScreenTitle eyebrow="Creative Studio" title={projectName} note={engine.mood} />
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
            {directorControls.map(({ dimension, label }) => {
              const supported = supportedDirectorDimensions.includes(dimension);
              const value = directorValues[dimension];
              return (
              <label className={supported ? '' : 'director-control-disabled'} key={dimension}>
                <span>
                  {label}
                  <em>{value}%</em>
                </span>
                <input
                  aria-label={label}
                  type="range"
                  min="0"
                  max="100"
                  value={value}
                  disabled={!supported}
                  title={supported ? `Ajuster ${label}` : 'Ce moteur ne prend pas encore en charge ce réglage.'}
                  onChange={(event) => onDirectorChange(dimension, Number(event.target.value))}
                />
              </label>
              );
            })}
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
