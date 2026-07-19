import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'en' | 'fr';

const copy: Record<Locale, Record<string, string>> = {
  en: {
    home: 'Home', analyze: 'Analyze', create: 'Create', preview: 'Preview', export: 'Export', settings: 'Settings',
    primaryNavigation: 'Primary navigation', goHome: 'Go to Home', language: 'Language',
    heroEyebrow: 'Visual Intelligence for Music', heroTitle: 'Transform Your Music Into', heroTitleAccent: 'Living Visuals',
    heroPoetic: 'Every Note Becomes Light.', importMusic: 'Import Music', createProject: 'Create New Project',
    goldenTrack: 'Golden Reference Track', openReactivePreview: 'Open Reactive Preview', analyzingLight: 'Analyzing the light…',
    sixEngines: 'Six Visual Engines', enginesNote: 'Every world has its own language of light',
    pipeline: 'The Creative Pipeline', approvedReferences: 'Approved References',
    import: 'Import', analyzeStep: 'Analyze', createStep: 'Create', previewStep: 'Preview', exportStep: 'Export',
    analyzeTitle: 'Import a track', analyzeNote: 'Audio analysis runs locally in your browser.',
    chooseTrack: 'Choose a track', analyzing: 'Analyzing…', formats: 'WAV, MP3, M4A, AAC, OGG or FLAC · maximum 15 minutes and 150 MB.',
    waveformSpectrum: 'Waveform and FFT Spectrum', detectedStructure: 'Detected Structure', estimatedBpm: 'Estimated BPM',
    duration: 'Duration', sampleRate: 'Sample rate', peak: 'Peak', emotionProfile: 'Emotion Profile', aixelIntelligence: 'AiXel Intelligence',
    importSummary: 'Import a track to obtain its musical profile before choosing a visual engine.',
    readySummary: 'The analysis is ready: now choose your visual engine in Create.', continueCreate: 'Continue to Create',
    creativeStudio: 'Creative Studio', visualPresets: 'Visual Presets', directorHelp: 'Tell it how to feel. AiXel translates your intent into motion.',
    continuePreview: 'Continue to Preview', unsupportedControl: 'This engine does not support this setting yet.', adjust: 'Adjust',
    previewNeedsAnalysis: 'The music must be analyzed first.', previewEmptyHelp: 'Import a track or open the Golden Reference to activate the audio-reactive Preview.',
    openAnalyze: 'Open Analyze', livePreview: 'Live Preview', pausePreview: 'Pause preview', playPreview: 'Play preview',
    unmutePreview: 'Unmute preview', mutePreview: 'Mute preview', previewVolume: 'Preview volume', previewQuality: 'Preview quality', futureVersion: 'Available in a future version',
    exportTitle: 'Render a synchronized MP4', exportNote: 'The 720p render is produced locally and preserves the original decoded audio track.',
    formatGrid: 'Format Grid', renderProgress: 'Render Progress', renderedFrame: 'Video frame currently being rendered', renderProgressLabel: 'Render progress',
    keepTabActive: 'Keep this tab visible and active until the export is complete. Switching tabs or windows may freeze the video image in some browsers.',
    noTrackExport: 'Import a track in Analyze first.', completeDownload: 'MP4 completed and downloaded.', cancelled: 'Render cancelled. You can start again.',
    unsupportedMp4: 'This browser does not provide a native MP4 encoder. Try a recent version of Safari for this MVP export.', failedExport: 'The export failed.',
    exportAgain: 'Download again', cancelRender: 'Cancel render', exportMp4: 'Export MP4', aixelCredits: 'AiXel end card',
    settingsTitle: 'Three sections only', settingsNote: 'Settings remain accessible from every screen.', viewDesignSystem: 'View Design System', on: 'On',
    goldenPlayLabel: 'Play In the Spirit of Naomi in reactive preview', planAlt: 'Approved AiXel Visual Melody plan board', studioAlt: 'Approved AiXel Visual Melody studio reference',
    cosmicCharacter: 'Nebulas, soft particles, deep space.', geometryCharacter: 'Concentric circles and harmonic rings.', liquidCharacter: 'Ink-like gradients and organic blur.',
    cityCharacter: 'Architectural skyline of spectrum bars.', albumCharacter: 'Graphite vinyl and one gold accent.', neonCharacter: 'Synthwave light trails on deep purple.',
    cosmicMood: 'The light breathes, nebulas drifting slowly like held breath.', geometryMood: 'Everything becomes geometric, circles moving in quiet harmony.', liquidMood: 'The interface turns liquid, ink folding into ink.', cityMood: 'A skyline of sound, architecture built from spectrum.', albumMood: 'Minimal and monochrome, the record spinning in silence.', neonMood: 'Lights turn to velvet, synthwave trails in the dark.',
    reflective: 'Reflective', expansive: 'Expansive', tender: 'Tender', dreamy: 'Dreamy', luminous: 'Luminous', calm: 'Calm',
    moreCinematic: 'More Cinematic', moreEmotional: 'More Emotional', moreDreamy: 'More Dreamy', morePowerful: 'More Powerful', moreOrganic: 'More Organic', moreMinimal: 'More Minimal',
    emotion: 'Emotion', space: 'Space', fluidity: 'Fluidity', light: 'Light', dynamics: 'Dynamics', particles: 'Particles', colorEnergy: 'Color Energy', motionComplexity: 'Motion Complexity',
  },
  fr: {
    home: 'Accueil', analyze: 'Analyser', create: 'Créer', preview: 'Aperçu', export: 'Exporter', settings: 'Réglages',
    primaryNavigation: 'Navigation principale', goHome: "Aller à l’accueil", language: 'Langue',
    heroEyebrow: 'Intelligence visuelle pour la musique', heroTitle: 'Transformez votre musique en', heroTitleAccent: 'images vivantes',
    heroPoetic: 'Chaque note devient lumière.', importMusic: 'Importer une musique', createProject: 'Créer un nouveau projet',
    goldenTrack: 'Piste de référence Golden', openReactivePreview: "Ouvrir l’aperçu réactif", analyzingLight: 'Analyse de la lumière…',
    sixEngines: 'Six moteurs visuels', enginesNote: 'Chaque univers possède son propre langage de lumière',
    pipeline: 'Le parcours créatif', approvedReferences: 'Références approuvées',
    import: 'Importer', analyzeStep: 'Analyser', createStep: 'Créer', previewStep: 'Aperçu', exportStep: 'Exporter',
    analyzeTitle: 'Importer un morceau', analyzeNote: 'L’analyse audio est effectuée localement dans votre navigateur.',
    chooseTrack: 'Choisir un morceau', analyzing: 'Analyse en cours…', formats: 'WAV, MP3, M4A, AAC, OGG ou FLAC · 15 minutes et 150 Mo maximum.',
    waveformSpectrum: 'Forme d’onde et spectre FFT', detectedStructure: 'Structure détectée', estimatedBpm: 'BPM estimé',
    duration: 'Durée', sampleRate: 'Échantillonnage', peak: 'Pic', emotionProfile: 'Profil émotionnel', aixelIntelligence: 'Intelligence AiXel',
    importSummary: 'Importez un morceau pour obtenir son profil musical avant de choisir un moteur visuel.',
    readySummary: 'L’analyse est prête : choisissez maintenant votre moteur visuel dans Créer.', continueCreate: 'Continuer vers Créer',
    creativeStudio: 'Studio créatif', visualPresets: 'Préréglages visuels', directorHelp: 'Décrivez l’émotion souhaitée. AiXel traduit votre intention en mouvement.',
    continuePreview: "Continuer vers l’aperçu", unsupportedControl: 'Ce moteur ne prend pas encore en charge ce réglage.', adjust: 'Ajuster',
    previewNeedsAnalysis: 'La musique doit d’abord être analysée.', previewEmptyHelp: 'Importez une piste ou ouvrez la référence Golden pour activer l’aperçu audio-réactif.',
    openAnalyze: 'Ouvrir Analyser', livePreview: 'Aperçu en direct', pausePreview: "Mettre l’aperçu en pause", playPreview: "Lire l’aperçu",
    unmutePreview: 'Réactiver le son', mutePreview: 'Couper le son', previewVolume: "Volume de l’aperçu", previewQuality: "Qualité de l’aperçu", futureVersion: 'Disponible dans une version future',
    exportTitle: 'Créer un MP4 synchronisé', exportNote: 'Le rendu 720p est produit localement et conserve la piste audio originale décodée.',
    formatGrid: 'Format', renderProgress: 'Progression du rendu', renderedFrame: 'Image vidéo actuellement rendue', renderProgressLabel: 'Progression du rendu',
    keepTabActive: 'Gardez cet onglet visible et actif jusqu’à la fin de l’export. Changer d’onglet ou de fenêtre peut figer l’image vidéo dans certains navigateurs.',
    noTrackExport: 'Importez d’abord un morceau dans Analyser.', completeDownload: 'MP4 terminé et téléchargé.', cancelled: 'Rendu annulé. Vous pouvez recommencer.',
    unsupportedMp4: 'Ce navigateur ne propose pas d’encodeur MP4 natif. Essayez une version récente de Safari pour cet export MVP.', failedExport: 'L’export a échoué.',
    exportAgain: 'Télécharger de nouveau', cancelRender: 'Annuler le rendu', exportMp4: 'Exporter le MP4', aixelCredits: 'générique AiXel',
    settingsTitle: 'Trois sections seulement', settingsNote: 'Les réglages restent accessibles depuis chaque écran.', viewDesignSystem: 'Voir le système graphique', on: 'Actif',
    goldenPlayLabel: "Lire In the Spirit of Naomi dans l’aperçu réactif", planAlt: 'Tableau de référence AiXel Visual Melody approuvé', studioAlt: 'Référence studio AiXel Visual Melody approuvée',
    cosmicCharacter: 'Nébuleuses, particules douces et espace profond.', geometryCharacter: 'Cercles concentriques et anneaux harmoniques.', liquidCharacter: 'Dégradés d’encre et flou organique.',
    cityCharacter: 'Architecture urbaine construite avec le spectre.', albumCharacter: 'Vinyle graphite avec un accent doré.', neonCharacter: 'Traînées synthwave sur un violet profond.',
    cosmicMood: 'La lumière respire tandis que les nébuleuses dérivent lentement.', geometryMood: 'Tout devient géométrique, les cercles évoluent en harmonie.', liquidMood: 'L’interface devient liquide, l’encre se replie sur elle-même.', cityMood: 'Une ville sonore, une architecture bâtie avec le spectre.', albumMood: 'Minimal et monochrome, le disque tourne dans le silence.', neonMood: 'La lumière devient velours et traverse l’obscurité.',
    reflective: 'Réfléchi', expansive: 'Expansif', tender: 'Tendre', dreamy: 'Onirique', luminous: 'Lumineux', calm: 'Calme',
    moreCinematic: 'Plus cinématique', moreEmotional: 'Plus émotionnel', moreDreamy: 'Plus onirique', morePowerful: 'Plus puissant', moreOrganic: 'Plus organique', moreMinimal: 'Plus minimal',
    emotion: 'Émotion', space: 'Espace', fluidity: 'Fluidité', light: 'Lumière', dynamics: 'Dynamique', particles: 'Particules', colorEnergy: 'Énergie des couleurs', motionComplexity: 'Complexité du mouvement',
  },
};

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function initialLocale(): Locale {
  const saved = localStorage.getItem('aixel-visual-melody-locale');
  if (saved === 'en' || saved === 'fr') return saved;
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale: (next) => {
      localStorage.setItem('aixel-visual-melody-locale', next);
      document.documentElement.lang = next;
      setLocaleState(next);
    },
    t: (key) => copy[locale][key] ?? copy.en[key] ?? key,
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleProvider.');
  return value;
}
