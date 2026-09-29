import { Sparkles } from 'lucide-react';
import { GlassPanel } from '../components/layout/GlassPanel';
import {
  DANCE_AVATAR_GENDERS,
  DANCE_AVATAR_STYLES,
  type DanceAvatarGender,
  type DanceAvatarStyle,
} from '../engines/dance-avatars/danceAvatars.types';
import { useLocale } from '../i18n/LocaleContext';
import type { EngineParameterValue } from '../project/project.types';
import { PanelHeading } from './appVisuals';

/** Dance Avatars gender + style chips (used for layer 1, and for layer 2 of a mix). */
export function AvatarOptionsPanel({
  engineParameters,
  onEngineParameter,
  label,
  className = '',
}: {
  engineParameters: Record<string, EngineParameterValue>;
  onEngineParameter: (parameterId: string, value: EngineParameterValue) => void;
  label?: string;
  className?: string;
}) {
  const { t } = useLocale();
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
    <GlassPanel className={`avatar-options ${className}`.trim()}>
      <PanelHeading icon={<Sparkles size={18} />} label={label ?? t('avatarOptions')} />
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
  );
}
