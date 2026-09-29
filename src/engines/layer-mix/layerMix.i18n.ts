export const layerMixCopy: Record<'en' | 'fr', Record<string, string>> = {
  en: {
    layerMix: 'Layer mix',
    layerMixToggle: 'Mix two engines',
    layerMixHelp: 'Stack two engines: a background and a foreground, rendered together in Create, Preview and the MP4 export.',
    layerBase: 'Layer 1 (background)',
    layerOverlay: 'Layer 2 (foreground)',
    layerNone: 'None',
    layerClassicGroup: 'Classic engines',
    layerProGroup: 'Pro tools',
    layerUsedByOther: 'Already used on the other layer',
    layerSwap: 'Swap layers',
    layerOpacity: 'Layer 2 opacity',
    layerBlendMode: 'Blend mode',
    layerBackgroundDim: 'Dim background',
    layerBackgroundDimHelp: 'Darkens layer 1 so the foreground stands out.',
    blendNormal: 'Normal',
    blendScreen: 'Screen',
    blendLighten: 'Lighten',
    blendAdd: 'Add',
    blendOverlay: 'Overlay',
    layerSharedNote: 'Creator colors and Director faders apply to both layers.',
    layerOverlaySettings: 'Layer 2 settings',
    layerMixBadge: 'Mix',
  },
  fr: {
    layerMix: 'Mixage de couches',
    layerMixToggle: 'Mixer deux moteurs',
    layerMixHelp: 'Superposez deux moteurs : un fond et un premier plan, rendus ensemble dans Créer, l’Aperçu et l’export MP4.',
    layerBase: 'Couche 1 (fond)',
    layerOverlay: 'Couche 2 (premier plan)',
    layerNone: 'Aucune',
    layerClassicGroup: 'Moteurs classiques',
    layerProGroup: 'Outils Pro',
    layerUsedByOther: 'Déjà utilisé sur l’autre couche',
    layerSwap: 'Inverser les couches',
    layerOpacity: 'Opacité de la couche 2',
    layerBlendMode: 'Mode de fusion',
    layerBackgroundDim: 'Assombrir le fond',
    layerBackgroundDimHelp: 'Assombrit la couche 1 pour faire ressortir le premier plan.',
    blendNormal: 'Normal',
    blendScreen: 'Écran',
    blendLighten: 'Lumière',
    blendAdd: 'Addition',
    blendOverlay: 'Superposition',
    layerSharedNote: 'Les couleurs Creator et les faders Director s’appliquent aux deux couches.',
    layerOverlaySettings: 'Réglages de la couche 2',
    layerMixBadge: 'Mix',
  },
};

/**
 * Layer-mix copy lookup layered over the app `t` (current locale, then English, then `t`).
 * Kept here so the global locale table stays untouched.
 */
export function layerMixTranslator(locale: string, t: (key: string) => string): (key: string) => string {
  const table = layerMixCopy[locale === 'fr' ? 'fr' : 'en'];
  return (key) => table[key] ?? layerMixCopy.en[key] ?? t(key);
}
