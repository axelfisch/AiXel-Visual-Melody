import React, { useState } from 'react';
import { ChevronRight, Palette, SlidersHorizontal, WandSparkles } from 'lucide-react';
import { GlassPanel } from '../components/layout/GlassPanel';
import type { VisualEngine } from '../engines/engine.types';
import { DEFAULT_LAYER_MIX } from '../engines/layer-mix/layerMix.defaults';
import type { LayerBlendSettings, LayerMix } from '../engines/layer-mix/layerMix.types';
import { useLocale } from '../i18n/LocaleContext';
import { getTool, listProTools, type ProjectToolId } from '../tools';
import {
  directorMoodProfiles,
  directorPalettes,
  type DirectorDimension,
  type DirectorMood,
  type DirectorPalette,
  type DirectorState,
} from '../director';
import type { EngineParameterValue, ProjectAnalysis, ProjectImage, ProjectLyrics } from '../project/project.types';
import { AvatarOptionsPanel } from './AvatarOptionsPanel';
import { ImagePulsePanel } from './ImagePulsePanel';
import { engineLabel, LayerMixPanel, useLayerMixText } from './LayerMixPanel';
import { LyricCanvasPanel } from './LyricCanvasPanel';
import type { Engine, EngineKey } from './engines.catalog';
import { ScreenTitle, PanelHeading, PreviewCanvas } from './appVisuals';
import type { Screen } from './navigation';

export function CreateScreen({
  activeEngine,
  activePreset,
  activeTool,
  selectedMood,
  directorValues,
  supportedDirectorDimensions,
  engine,
  classicEngines,
  creator,
  engineParameters,
  projectName,
  image = null,
  onImageFile = async () => undefined,
  onClearImage = () => undefined,
  lyrics = { text: '', offset: 0 },
  onLyrics = () => undefined,
  trackDuration = null,
  trackBpm = null,
  analysis = null,
  onEngine,
  onTool,
  onPreset,
  onMood,
  onDirectorChange,
  onPalette,
  onEngineParameter,
  onNavigate,
  baseEngineId,
  mix = DEFAULT_LAYER_MIX,
  mixEngine = null,
  mixConfig,
  overlayParameters = null,
  onBaseEngine = () => undefined,
  onOverlay = () => undefined,
  onBlend = () => undefined,
  onSwapLayers = () => undefined,
  onOverlayParameter = () => undefined,
}: {
  activeEngine: EngineKey;
  activePreset: string;
  activeTool: ProjectToolId;
  selectedMood: DirectorMood | null;
  directorValues: DirectorState;
  supportedDirectorDimensions: DirectorDimension[];
  engine: Engine;
  classicEngines: Engine[];
  creator: { primaryColor: string; accentColor: string };
  engineParameters: Record<string, EngineParameterValue>;
  projectName: string;
  image?: ProjectImage | null;
  onImageFile?: (file: File) => Promise<void>;
  onClearImage?: () => void;
  lyrics?: ProjectLyrics;
  onLyrics?: (lyrics: Partial<ProjectLyrics>) => void;
  trackDuration?: number | null;
  trackBpm?: number | null;
  /** Analysed track (drives the live Pro Tool preview; a synthetic 118 BPM clock is used without it). */
  analysis?: ProjectAnalysis | null;
  onEngine: (engine: EngineKey) => void;
  onTool: (tool: ProjectToolId) => void;
  onPreset: (preset: string) => void;
  onMood: (mood: DirectorMood) => void;
  onDirectorChange: (dimension: DirectorDimension, value: number) => void;
  onPalette: (palette: DirectorPalette) => void;
  onEngineParameter: (parameterId: string, value: EngineParameterValue) => void;
  onNavigate: (screen: Screen) => void;
  /** Layer 1 engine id (defaults to the catalog engine's id). */
  baseEngineId?: string;
  /** Two-layer mix state ('Aucune' layer 2 = single engine). */
  mix?: LayerMix;
  /** Composite engine rendered live on Create when a layer 2 is set (same renderer as Preview/Export). */
  mixEngine?: VisualEngine | null;
  mixConfig?: unknown;
  /** Resolved layer 2 parameters (drive its option panels). */
  overlayParameters?: Record<string, EngineParameterValue> | null;
  onBaseEngine?: (engineId: string) => void;
  onOverlay?: (engineId: string | null) => void;
  onBlend?: (settings: Partial<LayerBlendSettings>) => void;
  onSwapLayers?: () => void;
  onOverlayParameter?: (parameterId: string, value: EngineParameterValue) => void;
}) {
  const { t } = useLocale();
  const tm = useLayerMixText();
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);
  const presets = ['Naomi', 'Dream', 'Universe', 'Rain', 'Blue', 'Neon', 'Galaxy', 'Jazz Club', 'Deep Space', 'Ocean'];
  const moods: DirectorMood[] = ['More Cinematic', 'More Emotional', 'More Dreamy', 'More Powerful', 'More Organic', 'More Minimal'];
  const proTools = listProTools();
  const activeToolDef = getTool(activeTool === 'engine' ? 'engine' : activeTool);
  const toolComingSoon = activeToolDef.availability === 'coming-soon';
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
  const studioNote = toolComingSoon
    ? t('comingSoonNote')
    : activeTool === 'particle-sphere'
      ? t('sphereMood')
      : activeTool === 'dance-avatar'
        ? t('avatarMood')
        : activeTool === 'image-pulse'
          ? t('pulseMood')
          : activeTool === 'lyric-canvas'
            ? t('lyricsMood')
            : t(`${engine.key}Mood`);
  const layer1Id = baseEngineId ?? engine.id;
  const overlayId = mix.overlay?.engineId ?? null;
  const overlayOptions = overlayParameters ?? mix.overlay?.parameters ?? {};
  const mixLabel = overlayId ? `${engineLabel(layer1Id, t)} + ${engineLabel(overlayId, t)}` : undefined;

  return (
    <section className="screen create-layout">
      <ScreenTitle eyebrow={t('creativeStudio')} title={projectName} note={studioNote} />
      <GlassPanel className="tool-picker">
        <PanelHeading icon={<WandSparkles size={18} />} label={t('proTools')} />
        <p className="muted">{t('proToolsHelp')}</p>
        <div className="chips wrap tool-chips">
          <button
            className={activeTool === 'engine' ? 'selected' : ''}
            onClick={() => onTool('engine')}
          >
            {t('visualEnginesTool')}
          </button>
          {proTools.map((tool) => (
            <button
              className={activeTool === tool.id ? 'selected' : ''}
              key={tool.id}
              onClick={() => onTool(tool.id)}
            >
              {tool.id === 'particle-sphere' ? t('particleSphere')
                : tool.id === 'dance-avatar' ? t('danceAvatars')
                  : tool.id === 'image-pulse' ? t('imagePulse')
                    : t('lyricCanvas')}
              {tool.availability === 'coming-soon' ? <em className="soon-badge">{t('comingSoon')}</em> : null}
            </button>
          ))}
        </div>
        <div className="creator-colors" aria-label={t('creatorColors')}>
          <span className="creator-swatch" title={t('primaryColor')}>
            <i style={{ background: creator.primaryColor }} />
            {t('primaryColor')}
          </span>
          <span className="creator-swatch" title={t('accentColor')}>
            <i style={{ background: creator.accentColor }} />
            {t('accentColor')}
          </span>
        </div>
      </GlassPanel>
      {toolComingSoon && (
        <GlassPanel className="coming-soon-banner">
          <p>{t('comingSoonBanner')}</p>
        </GlassPanel>
      )}
      {activeTool === 'engine' && (
      <div className="engine-tabs">
        {classicEngines.map((item) => (
          <button
            className={activeEngine === item.key ? 'active' : ''}
            key={item.key}
            onClick={() => onEngine(item.key)}
          >
            {item.name}
          </button>
        ))}
      </div>
      )}
      <LayerMixPanel
        baseEngineId={layer1Id}
        mix={mix}
        onBaseEngine={onBaseEngine}
        onOverlay={onOverlay}
        onBlend={onBlend}
        onSwap={onSwapLayers}
      />
      {activeTool === 'dance-avatar' && (
        <AvatarOptionsPanel engineParameters={engineParameters} onEngineParameter={onEngineParameter} />
      )}
      {activeTool === 'image-pulse' && (
        <ImagePulsePanel
          image={image}
          engineParameters={engineParameters}
          onImageFile={onImageFile}
          onClearImage={onClearImage}
          onEngineParameter={onEngineParameter}
        />
      )}
      {activeTool === 'lyric-canvas' && (
        <LyricCanvasPanel
          lyrics={lyrics}
          engineParameters={engineParameters}
          image={image}
          trackDuration={trackDuration}
          bpm={trackBpm}
          onLyrics={onLyrics}
          onEngineParameter={onEngineParameter}
          onImageFile={onImageFile}
          onClearImage={onClearImage}
        />
      )}
      {overlayId === 'dance-avatars' && (
        <AvatarOptionsPanel
          className="layer-overlay-options"
          label={`${tm('layerOverlaySettings')} · ${t('avatarOptions')}`}
          engineParameters={overlayOptions}
          onEngineParameter={onOverlayParameter}
        />
      )}
      {overlayId === 'image-pulse' && (
        <div className="layer-overlay-options">
          <p className="tiny-label layer-overlay-tag">{tm('layerOverlaySettings')} · {t('imagePulse')}</p>
          <ImagePulsePanel
            image={image}
            engineParameters={overlayOptions}
            onImageFile={onImageFile}
            onClearImage={onClearImage}
            onEngineParameter={onOverlayParameter}
          />
        </div>
      )}
      {overlayId === 'lyric-canvas' && (
        <div className="layer-overlay-options">
          <p className="tiny-label layer-overlay-tag">{tm('layerOverlaySettings')} · {t('lyricCanvas')}</p>
          <LyricCanvasPanel
            lyrics={lyrics}
            engineParameters={overlayOptions}
            image={image}
            trackDuration={trackDuration}
            bpm={trackBpm}
            onLyrics={onLyrics}
            onEngineParameter={onOverlayParameter}
            onImageFile={onImageFile}
            onClearImage={onClearImage}
          />
        </div>
      )}
      <div className="studio-grid">
        <div className="studio-main">
          <PreviewCanvas
            engine={engine}
            config={engineParameters}
            liveEngine={mixEngine}
            liveConfig={mixConfig}
            label={mixLabel}
            analysis={analysis}
            duration={trackDuration}
            syntheticDuration={activeTool === 'lyric-canvas' || overlayId === 'lyric-canvas' ? syntheticLyricsLoop(lyrics.text) : undefined}
            title={projectName}
          />
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

/** Without audio, loop the synthetic clock over the whole auto-timed lyric sheet (~4 s per line). */
function syntheticLyricsLoop(text: string): number {
  const lines = text.split('\n').filter((line) => line.replace(/\[[^\]]*\]/g, '').trim()).length;
  return Math.max(30, lines * 4) + 3;
}
