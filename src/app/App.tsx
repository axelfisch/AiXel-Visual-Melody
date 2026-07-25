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
import cosmicWavesThumbnail from '../assets/engine-thumbnails/cosmic-waves.jpg';
import frequencyCityThumbnail from '../assets/engine-thumbnails/frequency-city.jpg';
import jazzGeometryThumbnail from '../assets/engine-thumbnails/jazz-geometry.jpg';
import liquidColorsThumbnail from '../assets/engine-thumbnails/liquid-colors.jpg';
import minimalAlbumArtThumbnail from '../assets/engine-thumbnails/minimal-album-art.jpg';
import neonVelvetThumbnail from '../assets/engine-thumbnails/neon-velvet.jpg';
import particleOrbThumbnail from '../../references/Particle-Orb-Special-Reference.png';
import { AUDIO_FILE_ACCEPT, analyzeAudioFile, formatTime, type AnalyzeAudioResult, type AudioAnalysis } from '../audio';
import { Waveform } from '../components/audio/Waveform';
import { GlassPanel } from '../components/layout/GlassPanel';
import { getEngineOrDefault } from '../engines/engine.registry';
import { useLocale } from '../i18n/LocaleContext';
import {
  directorCapabilities,
  directorMoodProfiles,
  directorPalettes,
  mapDirectorToEngine,
  type DirectorDimension,
  type DirectorMood,
  type DirectorPalette,
  type DirectorState,
} from '../director';
import { useProject } from '../project/project.context';
import type { EngineParameterValue } from '../project/project.types';
import { ExportScreen } from '../screens/ExportScreen';
import { PreviewScreen } from '../screens/PreviewScreen';
import { screens, useHashNavigation, type Screen } from './navigation';

type EngineKey = 'cosmic' | 'geometry' | 'liquid' | 'city' | 'album' | 'neon' | 'orb';

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
  thumbnail: string;
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
    thumbnail: cosmicWavesThumbnail,
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
    thumbnail: jazzGeometryThumbnail,
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
    thumbnail: liquidColorsThumbnail,
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
    thumbnail: frequencyCityThumbnail,
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
    thumbnail: minimalAlbumArtThumbnail,
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
    thumbnail: neonVelvetThumbnail,
    radius: 22,
    mood: 'Lights turn to velvet, synthwave trails in the dark.',
  },
  {
    id: 'particle-orb',
    key: 'orb',
    number: 'SPECIAL',
    name: 'Particle Orb',
    character: 'A luminous 3D sphere woven from living particles.',
    motion: 'Organic deformation, orbital rotation and translucent shell.',
    accentFrom: '#9eeaff',
    accentTo: '#8a6bff',
    preview: 'radial-gradient(circle at 50% 45%, #163c64 0%, #08152d 38%, #030713 78%)',
    thumbnail: particleOrbThumbnail,
    radius: 28,
    mood: 'A living constellation turns slowly around the heart of the music.',
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
  const applyPalette = (palette: DirectorPalette) => {
    const colorParameterIds = renderEngine.parameters.filter((item) => item.type === 'color').map((item) => item.id);
    const parameters: Record<string, EngineParameterValue> = {};
    colorParameterIds.forEach((id, index) => {
      parameters[id] = palette.colors[index % palette.colors.length];
    });
    dispatch({ type: 'UPDATE_ENGINE_PARAMETERS', parameters });
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
            onPalette={applyPalette}
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
  const { locale, setLocale, t } = useLocale();
  return (
    <header className="top-nav">
      <button className="brand" onClick={() => onNavigate('home')} aria-label={t('goHome')}>
        <img src={logoReference} alt="" />
        <span>
          <strong>AiXel</strong> Visual Melody
          <small>AiXel Studio</small>
        </span>
      </button>
      <nav aria-label={t('primaryNavigation')}>
        {screens.map((item) => (
          <button
            className={current === item.id ? 'active' : ''}
            key={item.id}
            onClick={() => onNavigate(item.id)}
          >
            {t(item.id)}
          </button>
        ))}
      </nav>
      <div className="language-switch" aria-label={t('language')} role="group">
        <button className={locale === 'fr' ? 'active' : ''} onClick={() => setLocale('fr')} aria-pressed={locale === 'fr'}>FR</button>
        <button className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')} aria-pressed={locale === 'en'}>EN</button>
      </div>
      <button className="icon-button" onClick={() => onNavigate('settings')} aria-label={t('settings')}>
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
  const { t } = useLocale();
  return (
    <section className="screen home-screen">
      <div className="hero">
        <p className="eyebrow">{t('heroEyebrow')}</p>
        <h1>
          {t('heroTitle')} <span>{t('heroTitleAccent')}</span>
        </h1>
        <p className="poetic">{t('heroPoetic')}</p>
        <div className="hero-actions">
          <button className="primary-action" onClick={() => onNavigate('analyze')}>
            <FileAudio size={18} />
            {t('importMusic')}
          </button>
          <button className="secondary-action" onClick={() => onNavigate('create')}>
            <WandSparkles size={18} />
            {t('createProject')}
          </button>
        </div>
      </div>

      <GlassPanel className="reference-strip">
        <button
          className="play-disc"
          onClick={onGoldenReference}
          disabled={goldenBusy}
          aria-label={t('goldenPlayLabel')}
        >
          <Play size={16} fill="currentColor" />
        </button>
        <div>
          <p className="tiny-label gold">{t('goldenTrack')}</p>
          <h2>In the Spirit of Naomi</h2>
        </div>
        <Waveform bars={waveform.slice(0, 56)} />
        <button className="golden-open" onClick={onGoldenReference} disabled={goldenBusy}>
          {goldenBusy ? t('analyzingLight') : t('openReactivePreview')}
          <ChevronRight size={16} />
        </button>
      </GlassPanel>
      {goldenError && <p className="error-message golden-error" role="alert">{goldenError}</p>}

      <SectionHeader label={t('sevenEngines')} note={t('enginesNote')} />
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
          <SectionHeader label={t('pipeline')} compact />
          <div className="pipeline">
            {[
              [t('import'), FileAudio],
              [t('analyzeStep'), AudioLines],
              [t('createStep'), Sparkles],
              [t('previewStep'), Eye],
              [t('exportStep'), Download],
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
          <SectionHeader label={t('approvedReferences')} compact />
          <div className="reference-gallery">
            <img src={planReference} alt={t('planAlt')} />
            <img src={studioReference} alt={t('studioAlt')} />
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
  const { locale, t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const intelligenceSummary = analysis
    ? locale === 'fr'
      ? `${analysis.bpm < 80 ? 'Tempo posé' : analysis.bpm < 120 ? 'Tempo modéré' : 'Tempo énergique'}. ${analysis.averageEnergy < 0.2 ? 'Dynamique délicate' : analysis.averageEnergy < 0.5 ? 'Dynamique équilibrée' : 'Dynamique intense'}. ${t('readySummary')}`
      : `${analysis.bpm < 80 ? 'Relaxed tempo' : analysis.bpm < 120 ? 'Moderate tempo' : 'Energetic tempo'}. ${analysis.averageEnergy < 0.2 ? 'Delicate dynamics' : analysis.averageEnergy < 0.5 ? 'Balanced dynamics' : 'Intense dynamics'}. ${t('readySummary')}`
    : t('importSummary');

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
      <ScreenTitle eyebrow={t('analyze')} title={analysis?.name ?? t('analyzeTitle')} note={t('analyzeNote')} />
      <GlassPanel className="audio-import span-2">
        <label className="primary-action file-action">
          <FileAudio size={18} />
          {busy ? t('analyzing') : t('chooseTrack')}
          <input type="file" accept={AUDIO_FILE_ACCEPT} disabled={busy} onChange={(event) => void importFile(event.target.files?.[0])} />
        </label>
        <p className="muted">{t('formats')}</p>
        {error && <p className="error-message" role="alert">{error}</p>}
      </GlassPanel>
      <div className="analysis-grid">
        <GlassPanel className="span-2">
          <PanelHeading icon={<AudioLines size={18} />} label={t('waveformSpectrum')} />
          <Waveform bars={analysis?.waveform ?? waveform} large />
          <Spectrum bars={(analysis?.energy.slice(0, 44).map((value) => 12 + value * 88)) ?? spectrum} />
        </GlassPanel>
        <GlassPanel>
          <PanelHeading icon={<CircleGauge size={18} />} label={t('detectedStructure')} />
          <Metric label={t('estimatedBpm')} value={analysis ? String(analysis.bpm) : '—'} />
          <Metric label={t('duration')} value={analysis ? formatTime(analysis.duration) : '—'} />
          <Metric label={t('sampleRate')} value={analysis ? `${Math.round(analysis.sampleRate / 1000)} kHz` : '—'} />
          <Metric label={t('peak')} value={analysis ? `${Math.round(analysis.peak * 100)}%` : '—'} />
        </GlassPanel>
        <GlassPanel>
          <PanelHeading icon={<Sparkles size={18} />} label={t('emotionProfile')} />
          <div className="chips">
            {['reflective', 'expansive', 'tender', 'dreamy', 'luminous', 'calm'].map((chip) => (
              <span key={chip}>{t(chip)}</span>
            ))}
          </div>
        </GlassPanel>
        <GlassPanel className="ai-panel">
          <PanelHeading icon={<WandSparkles size={18} />} label={t('aixelIntelligence')} />
          <blockquote>
            {intelligenceSummary}
          </blockquote>
          <button className="primary-action" disabled={!analysis} onClick={() => onNavigate('create')}>
            {t('continueCreate')}
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
  onPalette,
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
  onPalette: (palette: DirectorPalette) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const { t } = useLocale();
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);
  const presets = ['Naomi', 'Dream', 'Universe', 'Rain', 'Blue', 'Neon', 'Galaxy', 'Jazz Club', 'Deep Space', 'Ocean'];
  const moods: DirectorMood[] = ['More Cinematic', 'More Emotional', 'More Dreamy', 'More Powerful', 'More Organic', 'More Minimal'];
  const paletteLabels: Record<string, string> = {
    auroraViolet: t('paletteAuroraViolet'),
    solarGold: t('paletteSolarGold'),
    emeraldTide: t('paletteEmeraldTide'),
    crimsonVelvet: t('paletteCrimsonVelvet'),
    glacierMono: t('paletteGlacierMono'),
  };
  const directorControls: Array<{ dimension: DirectorDimension; label: string }> = [
    { dimension: 'emotion', label: t('emotion') },
    { dimension: 'space', label: t('space') },
    { dimension: 'fluidity', label: t('fluidity') },
    { dimension: 'light', label: t('light') },
    { dimension: 'dynamics', label: t('dynamics') },
    { dimension: 'particles', label: t('particles') },
    { dimension: 'colorEnergy', label: t('colorEnergy') },
    { dimension: 'motionComplexity', label: t('motionComplexity') },
  ];
  const moodLabels: Record<DirectorMood, string> = {
    'More Cinematic': t('moreCinematic'),
    'More Emotional': t('moreEmotional'),
    'More Dreamy': t('moreDreamy'),
    'More Powerful': t('morePowerful'),
    'More Organic': t('moreOrganic'),
    'More Minimal': t('moreMinimal'),
  };

  return (
    <section className="screen create-layout">
      <ScreenTitle eyebrow={t('creativeStudio')} title={projectName} note={t(`${engine.key}Mood`)} />
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
            <PanelHeading icon={<Palette size={18} />} label={t('visualPresets')} />
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
          <p className="muted">{t('directorHelp')}</p>
          <div className="chips wrap mood-chips">
            {moods.map((mood) => (
              <button
                className={selectedMood === mood ? 'selected' : ''}
                key={mood}
                onClick={() => onMood(mood)}
              >
                {moodLabels[mood]}
              </button>
            ))}
          </div>
          <p className="muted palette-help">{t('colorPaletteHelp')}</p>
          <div className="chips wrap palette-chips">
            {directorPalettes.map((palette) => (
              <button
                className={selectedPalette === palette.id ? 'selected palette-swatch' : 'palette-swatch'}
                key={palette.id}
                onClick={() => {
                  setSelectedPalette(palette.id);
                  onPalette(palette);
                }}
                title={paletteLabels[palette.id]}
              >
                <span className="palette-dots">
                  {palette.colors.map((swatch, index) => (
                    <i key={index} style={{ background: swatch }} />
                  ))}
                </span>
                {paletteLabels[palette.id]}
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
                  title={supported ? `${t('adjust')} ${label}` : t('unsupportedControl')}
                  onChange={(event) => onDirectorChange(dimension, Number(event.target.value))}
                />
              </label>
              );
            })}
          </div>
          <button className="primary-action full" onClick={() => onNavigate('preview')}>
            {t('continuePreview')}
            <ChevronRight size={17} />
          </button>
        </GlassPanel>
      </div>
    </section>
  );
}

function SettingsScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { locale, t } = useLocale();
  const sections = locale === 'fr'
    ? [
        ['Audio', ["Sensibilité d’entrée", "Cache d’analyse", 'Verrouillage de la piste de référence']],
        ['Visuel', ['Mouvement réduit', "Qualité de l’aperçu", 'Synchronisation des accents du moteur']],
        ['Performance', ['Mode aperçu GPU', 'File de rendu en arrière-plan', 'Économie de mémoire']],
      ]
    : [
        ['Audio', ['Input sensitivity', 'Analysis cache', 'Reference track lock']],
        ['Visual', ['Reduced motion aware', 'Preview quality', 'Engine accent sync']],
        ['Performance', ['GPU preview mode', 'Background render queue', 'Memory saver']],
      ];
  return (
    <section className="screen settings-layout">
      <ScreenTitle eyebrow={t('settings')} title={t('settingsTitle')} note={t('settingsNote')} />
      <div className="settings-grid">
        {sections.map(([section, rows]) => (
          <GlassPanel key={section as string}>
            <PanelHeading icon={<Settings size={18} />} label={section as string} />
            {(rows as string[]).map((row) => (
              <div className="setting-row" key={row}>
                <span>{row}</span>
                <button>{t('on')}</button>
              </div>
            ))}
          </GlassPanel>
        ))}
      </div>
      <button className="secondary-action" onClick={() => onNavigate('design-system')}>
        {t('viewDesignSystem')}
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
    <div
      className={`preview-canvas preview-${engine.key} ${full ? 'full' : ''}`}
      style={{ background: engine.preview, borderRadius: `var(--preview-radius)` }}
    >
      <div
        aria-hidden="true"
        className="preview-reference-art"
        style={{ backgroundImage: `url(${engine.thumbnail})` }}
      />
      {engine.key === 'cosmic' && <CosmicVisual />}
      {engine.key === 'geometry' && <GeometryVisual />}
      {engine.key === 'liquid' && <LiquidVisual />}
      {engine.key === 'city' && <CityVisual />}
      {engine.key === 'album' && <AlbumVisual />}
      {engine.key === 'neon' && <NeonVisual />}
      {engine.key === 'orb' && <ParticleOrbVisual />}
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

function ParticleOrbVisual() {
  return (
    <div className="particle-orb-visual" aria-hidden="true">
      <span className="particle-orb-halo" />
      <span className="particle-orb-shell" />
      {Array.from({ length: 56 }, (_, index) => {
        const angle = index * 137.508;
        const radius = 8 + Math.sqrt(index / 55) * 42;
        return (
          <i
            key={index}
            style={{
              transform: `rotate(${angle}deg) translateY(-${radius}%)`,
              animationDelay: `${-(index % 13) * 0.17}s`,
            }}
          />
        );
      })}
    </div>
  );
}

function GeometryVisual() {
  return (
    <div className="geometry-visual">
      <span />
      <span />
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
