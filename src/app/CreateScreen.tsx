import React, { useState } from 'react';
import { ChevronRight, Palette, SlidersHorizontal, Sparkles, WandSparkles } from 'lucide-react';
import { GlassPanel } from '../components/layout/GlassPanel';
import {
  DANCE_AVATAR_GENDERS,
  DANCE_AVATAR_STYLES,
  type DanceAvatarGender,
  type DanceAvatarStyle,
} from '../engines/dance-avatars/danceAvatars.types';
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
import type { EngineParameterValue, ProjectImage } from '../project/project.types';
import { ImagePulsePanel } from './ImagePulsePanel';
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
  onEngine,
  onTool,
  onPreset,
  onMood,
  onDirectorChange,
  onPalette,
  onEngineParameter,
  onNavigate,
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
  onEngine: (engine: EngineKey) => void;
  onTool: (tool: ProjectToolId) => void;
  onPreset: (preset: string) => void;
  onMood: (mood: DirectorMood) => void;
  onDirectorChange: (dimension: DirectorDimension, value: number) => void;
  onPalette: (palette: DirectorPalette) => void;
  onEngineParameter: (parameterId: string, value: EngineParameterValue) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const { t } = useLocale();
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
          : t(`${engine.key}Mood`);
  const avatarGender = (engineParameters.gender === 'male' || engineParameters.gender === 'female'
    ? engineParameters.gender
    : 'female') as DanceAvatarGender;
  const avatarStyle = (typeof engineParameters.style === 'string'
    && DANCE_AVATAR_STYLES.includes(engineParameters.style as DanceAvatarStyle)
    ? engineParameters.style
    : 'neon') as DanceAvatarStyle;
  const genderLabels: Record<DanceAvatarGender, string> = {
    male: t('genderMale'),
    female: t('genderFemale'),
  };
  const styleLabels: Record<DanceAvatarStyle, string> = {
    shadow: t('styleShadow'),
    particle: t('styleParticle'),
    neon: t('styleNeon'),
    humanoid: t('styleHumanoid'),
    hologram: t('styleHologram'),
  };

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
      {activeTool === 'dance-avatar' && (
        <GlassPanel className="avatar-options">
          <PanelHeading icon={<Sparkles size={18} />} label={t('avatarOptions')} />
          <p className="muted">{t('avatarGenderHelp')}</p>
          <div className="chips wrap" role="group" aria-label={t('avatarGender')}>
            {DANCE_AVATAR_GENDERS.map((gender) => (
              <button
                className={avatarGender === gender ? 'selected' : ''}
                key={gender}
                onClick={() => onEngineParameter('gender', gender)}
              >
                {genderLabels[gender]}
              </button>
            ))}
          </div>
          <p className="muted avatar-style-help">{t('avatarStyleHelp')}</p>
          <div className="chips wrap" role="group" aria-label={t('avatarStyle')}>
            {DANCE_AVATAR_STYLES.map((style) => (
              <button
                className={avatarStyle === style ? 'selected' : ''}
                key={style}
                onClick={() => onEngineParameter('style', style)}
              >
                {styleLabels[style]}
              </button>
            ))}
          </div>
        </GlassPanel>
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
      <div className="studio-grid">
        <div className="studio-main">
          <PreviewCanvas engine={engine} imageUrl={activeTool === 'image-pulse' ? image?.objectUrl ?? null : null} />
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
