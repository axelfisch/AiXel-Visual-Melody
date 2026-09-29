import React, { useState } from 'react';
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
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import planReference from '../../references/Plan-Visual-Melody.png';
import studioReference from '../../references/AiXel-Studio-Visual-Melody.png';
import logoReference from '../../references/logo-references/Logo-AiXel-Visual-Melody.png';
import { AUDIO_FILE_ACCEPT, analyzeAudioFile, formatTime, type AnalyzeAudioResult, type AudioAnalysis } from '../audio';
import { Waveform } from '../components/audio/Waveform';
import { GlassPanel } from '../components/layout/GlassPanel';
import { useLocale } from '../i18n/LocaleContext';
import { screens, type Screen } from './navigation';
import { engines, PRO_ENGINE_KEYS, type Engine, type EngineKey } from './engines.catalog';
import {
  EngineCard,
  Metric,
  PanelHeading,
  PreviewCanvas,
  ScreenTitle,
  SectionHeader,
  Spectrum,
} from './appVisuals';

const waveform = Array.from({ length: 72 }, (_, i) => 18 + Math.abs(Math.sin(i * 0.38)) * 54 + (i % 7) * 3);
const spectrum = Array.from({ length: 44 }, (_, i) => 16 + Math.abs(Math.sin(i * 0.55)) * 68 + (i % 5) * 4);

export function CosmicBackground() {
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

export function TopNavigation({ current, onNavigate }: { current: Screen; onNavigate: (screen: Screen) => void }) {
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

export function HomeScreen({
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

      <SectionHeader label={t('sixEngines')} note={t('enginesNote')} />
      <div className="engine-grid">
        {engines.filter((item) => !PRO_ENGINE_KEYS.includes(item.key)).map((engine) => (
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

export function AnalyzeScreen({
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
      ? `${analysis.bpm < 80 ? 'Tempo pos\u00e9' : analysis.bpm < 120 ? 'Tempo mod\u00e9r\u00e9' : 'Tempo \u00e9nergique'}. ${analysis.averageEnergy < 0.2 ? 'Dynamique d\u00e9licate' : analysis.averageEnergy < 0.5 ? 'Dynamique \u00e9quilibr\u00e9e' : 'Dynamique intense'}. ${t('readySummary')}`
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
      setError(reason instanceof Error ? reason.message : 'Ce fichier audio ne peut pas \u00eatre analys\u00e9.');
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
          <Metric label={t('estimatedBpm')} value={analysis ? String(analysis.bpm) : '\u2014'} />
          <Metric label={t('duration')} value={analysis ? formatTime(analysis.duration) : '\u2014'} />
          <Metric label={t('sampleRate')} value={analysis ? `${Math.round(analysis.sampleRate / 1000)} kHz` : '\u2014'} />
          <Metric label={t('peak')} value={analysis ? `${Math.round(analysis.peak * 100)}%` : '\u2014'} />
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

export function SettingsScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { locale, t } = useLocale();
  const sections = locale === 'fr'
    ? [
        ['Audio', ["Sensibilit\u00e9 d\u2019entr\u00e9e", "Cache d\u2019analyse", 'Verrouillage de la piste de r\u00e9f\u00e9rence']],
        ['Visuel', ['Mouvement r\u00e9duit', "Qualit\u00e9 de l\u2019aper\u00e7u", 'Synchronisation des accents du moteur']],
        ['Performance', ['Mode aper\u00e7u GPU', 'File de rendu en arri\u00e8re-plan', '\u00c9conomie de m\u00e9moire']],
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

export function DesignSystemScreen() {
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
