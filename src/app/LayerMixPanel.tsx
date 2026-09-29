import { useMemo, useState } from 'react';
import { ArrowUpDown, Layers } from 'lucide-react';
import { GlassPanel } from '../components/layout/GlassPanel';
import { isProEngineId, listEngines } from '../engines/engine.registry';
import { MAX_BACKGROUND_DIM } from '../engines/layer-mix/layerMix.defaults';
import { LAYER_BLEND_MODES, type LayerBlendMode, type LayerBlendSettings, type LayerMix } from '../engines/layer-mix/layerMix.types';
import { useLocale } from '../i18n/LocaleContext';
import { layerMixTranslator } from '../engines/layer-mix/layerMix.i18n';
import { engines as engineCatalog } from './engines.catalog';
import { PanelHeading } from './appVisuals';

const PRO_LABEL_KEYS: Record<string, string> = {
  'particle-sphere': 'particleSphere',
  'dance-avatars': 'danceAvatars',
  'image-pulse': 'imagePulse',
  'lyric-canvas': 'lyricCanvas',
};

const BLEND_LABEL_KEYS: Record<LayerBlendMode, string> = {
  normal: 'blendNormal',
  screen: 'blendScreen',
  lighten: 'blendLighten',
  add: 'blendAdd',
  overlay: 'blendOverlay',
};

/** App translator extended with the layer-mix copy. */
export function useLayerMixText(): (key: string) => string {
  const { locale, t } = useLocale();
  return useMemo(() => layerMixTranslator(locale, t), [locale, t]);
}

/** Localised engine label: classic engines keep their names, Pro tools use their Create labels. */
export function engineLabel(engineId: string, t: (key: string) => string): string {
  const key = PRO_LABEL_KEYS[engineId];
  if (key) return t(key);
  return engineCatalog.find((item) => item.id === engineId)?.name ?? engineId;
}

/** Display order: the six classic engines (catalog order), then the four Pro tools. */
function orderedEngineIds(): { classic: string[]; pro: string[] } {
  const known = new Set(listEngines().map((engine) => engine.id));
  const ids = engineCatalog.map((item) => item.id).filter((id) => known.has(id));
  return { classic: ids.filter((id) => !isProEngineId(id)), pro: ids.filter((id) => isProEngineId(id)) };
}

function EngineChoices({
  layer,
  selected,
  blocked,
  onSelect,
  includeNone = false,
}: {
  layer: 'base' | 'overlay';
  selected: string | null;
  blocked: string | null;
  onSelect: (engineId: string | null) => void;
  includeNone?: boolean;
}) {
  const t = useLayerMixText();
  const { classic, pro } = orderedEngineIds();
  const chip = (engineId: string) => {
    const disabled = engineId === blocked;
    return (
      <button
        key={engineId}
        className={selected === engineId ? 'selected' : ''}
        disabled={disabled}
        aria-pressed={selected === engineId}
        title={disabled ? t('layerUsedByOther') : undefined}
        data-layer-engine={engineId}
        onClick={() => onSelect(engineId)}
      >
        {engineLabel(engineId, t)}
      </button>
    );
  };
  return (
    <div className="layer-choices" data-layer={layer}>
      {includeNone ? (
        <div className="chips wrap">
          <button className={selected === null ? 'selected' : ''} aria-pressed={selected === null} onClick={() => onSelect(null)}>
            {t('layerNone')}
          </button>
        </div>
      ) : null}
      <span className="layer-group-label">{t('layerClassicGroup')}</span>
      <div className="chips wrap">{classic.map(chip)}</div>
      <span className="layer-group-label">{t('layerProGroup')}</span>
      <div className="chips wrap">{pro.map(chip)}</div>
    </div>
  );
}

/**
 * Create-screen control for the two-layer mix: 'Mixer deux moteurs' toggle,
 * 'Couche 1 (fond)' / 'Couche 2 (premier plan)' engine choices, and the layer-2
 * blend (opacity, mode, background dim). Off / 'Aucune' = the single engine, unchanged.
 */
export function LayerMixPanel({
  baseEngineId,
  mix,
  onBaseEngine,
  onOverlay,
  onBlend,
  onSwap,
}: {
  baseEngineId: string;
  mix: LayerMix;
  onBaseEngine: (engineId: string) => void;
  onOverlay: (engineId: string | null) => void;
  onBlend: (settings: Partial<LayerBlendSettings>) => void;
  onSwap: () => void;
}) {
  const t = useLayerMixText();
  const overlayId = mix.overlay?.engineId ?? null;
  const [open, setOpen] = useState(overlayId !== null);
  const expanded = open || overlayId !== null;
  const opacity = Math.round(mix.opacity * 100);
  const dim = Math.round(mix.backgroundDim * 100);

  const toggle = (checked: boolean) => {
    setOpen(checked);
    if (!checked && overlayId) onOverlay(null);
  };

  return (
    <GlassPanel className={`layer-mix${expanded ? ' expanded' : ''}`}>
      <div className="layer-mix-head">
        <PanelHeading icon={<Layers size={18} />} label={t('layerMix')} />
        <label className="layer-switch">
          <input
            type="checkbox"
            role="switch"
            checked={expanded}
            aria-checked={expanded}
            onChange={(event) => toggle(event.target.checked)}
          />
          <span className="layer-switch-track" aria-hidden="true"><i /></span>
          {t('layerMixToggle')}
        </label>
      </div>
      <p className="muted">{t('layerMixHelp')}</p>
      {expanded ? (
        <>
          <div className="layer-rows">
            <section className="layer-row" aria-label={t('layerBase')}>
              <h3><em>1</em>{t('layerBase')}</h3>
              <EngineChoices layer="base" selected={baseEngineId} blocked={overlayId} onSelect={(id) => id && onBaseEngine(id)} />
            </section>
            <button
              type="button"
              className="layer-swap"
              onClick={onSwap}
              disabled={!overlayId}
              title={t('layerSwap')}
              aria-label={t('layerSwap')}
            >
              <ArrowUpDown size={16} />
              {t('layerSwap')}
            </button>
            <section className="layer-row" aria-label={t('layerOverlay')}>
              <h3><em>2</em>{t('layerOverlay')}</h3>
              <EngineChoices layer="overlay" selected={overlayId} blocked={baseEngineId} onSelect={onOverlay} includeNone />
            </section>
          </div>
          {overlayId ? (
            <div className="layer-blend fine-tuning">
              <label>
                <span>
                  {t('layerOpacity')}
                  <em>{opacity}%</em>
                </span>
                <input
                  aria-label={t('layerOpacity')}
                  type="range"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={(event) => onBlend({ opacity: Number(event.target.value) / 100 })}
                />
              </label>
              <div className="layer-blend-modes">
                <span className="layer-group-label">{t('layerBlendMode')}</span>
                <div className="chips wrap" role="group" aria-label={t('layerBlendMode')}>
                  {LAYER_BLEND_MODES.map((mode) => (
                    <button
                      key={mode}
                      className={mix.blendMode === mode ? 'selected' : ''}
                      aria-pressed={mix.blendMode === mode}
                      onClick={() => onBlend({ blendMode: mode })}
                    >
                      {t(BLEND_LABEL_KEYS[mode])}
                    </button>
                  ))}
                </div>
              </div>
              <label title={t('layerBackgroundDimHelp')}>
                <span>
                  {t('layerBackgroundDim')}
                  <em>{dim}%</em>
                </span>
                <input
                  aria-label={t('layerBackgroundDim')}
                  type="range"
                  min="0"
                  max={Math.round(MAX_BACKGROUND_DIM * 100)}
                  value={dim}
                  onChange={(event) => onBlend({ backgroundDim: Number(event.target.value) / 100 })}
                />
              </label>
              <p className="muted layer-shared-note">{t('layerSharedNote')}</p>
            </div>
          ) : null}
        </>
      ) : null}
    </GlassPanel>
  );
}
