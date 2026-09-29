/** Lyric Canvas copy. Looked up first so the Pro Tools status lines reflect all four tools. */
export const lyricCanvasCopy: Record<'en' | 'fr', Record<string, string>> = {
  en: {
    lyricsCharacter: 'Your lyrics as cinematic, beat-synced typography.',
    lyricsMood: 'Your words light up with the music — karaoke sweeps, kinetic pops, neon, typewriter and cinematic fades in your Creator colors.',
    lyricsOptions: 'Lyric Canvas',
    lyricsLabel: 'Lyrics',
    lyricsHelp: 'Paste your lyrics, one line per sung phrase. Leave a blank line between sections. Optional LRC timestamps like [01:23.45] set exact timing.',
    lyricsPlaceholder: 'Sous la pluie d’été, je marche sans bruit\nLes néons s’allument au cœur de la nuit\n\n[00:42.50] …or LRC timestamps for exact timing',
    lyricsEmpty: 'No lyrics yet — the track title is shown as a placeholder until you paste some.',
    lyricsStatsAuto: '{lines} lines · {sections} sections · auto-timed on the beat grid across the track',
    lyricsStatsTimed: '{lines} lines · LRC timestamps detected',
    lyricsNoTrack: 'Analyze a track to place lines on its real duration and tempo.',
    lyricsPreset: 'Typography preset',
    lyricsPresetHelp: 'Five looks wired to the same Director faders and Creator colors.',
    lyricsPresetKaraoke: 'Karaoke',
    lyricsPresetKinetic: 'Kinetic pop',
    lyricsPresetNeon: 'Neon glow',
    lyricsPresetTypewriter: 'Typewriter',
    lyricsPresetCinematic: 'Cinematic',
    lyricsBackground: 'Background',
    lyricsBackgroundAurora: 'Aurora',
    lyricsBackgroundParticles: 'Starfield',
    lyricsBackgroundImage: 'My image',
    lyricsImageHint: 'Uses the image uploaded in Image Pulse (or choose one here).',
    lyricsChooseImage: 'Choose image',
    lyricsRemoveImage: 'Remove image',
    lyricsOffset: 'Timing offset',
    lyricsOffsetHelp: 'Nudge every line earlier (−) or later (+).',
    lyricsOffsetReset: 'Reset',
    lyricsToLrc: 'Convert auto timing to LRC',
    lyricsToLrcHelp: 'Writes the computed timestamps into the text so you can fine-tune any line by hand.',
    lyricsSample: 'Try sample lyrics',
    lyricsPreviewHint: 'Paste lyrics in Create to see them sung on screen.',
    lyricsPoetic: 'Every word lights up on the real pulse of the track.',
    proToolsHelp: 'Choose a classic visual engine or a Pro Tool. Particle Sphere, Dance Avatars, Image Pulse and Lyric Canvas are ready.',
    comingSoonNote: 'This Pro Tool is coming soon.',
    comingSoonBanner: 'This tool is stubbed for Pro Tools V1. Select another Pro Tool or a classic engine to continue Preview and Export.',
  },
  fr: {
    lyricsCharacter: 'Vos paroles en typographie cinématique, calée sur le beat.',
    lyricsMood: 'Vos mots s’illuminent avec la musique — balayage karaoké, pops cinétiques, néon, machine à écrire et fondus cinéma aux couleurs Creator.',
    lyricsOptions: 'Toile de paroles',
    lyricsLabel: 'Paroles',
    lyricsHelp: 'Collez vos paroles, une ligne par phrase chantée. Laissez une ligne vide entre les sections. Des horodatages LRC comme [01:23.45] fixent le timing exact.',
    lyricsPlaceholder: 'Sous la pluie d’été, je marche sans bruit\nLes néons s’allument au cœur de la nuit\n\n[00:42.50] …ou des horodatages LRC pour un timing exact',
    lyricsEmpty: 'Pas encore de paroles — le titre du morceau s’affiche en attendant.',
    lyricsStatsAuto: '{lines} lignes · {sections} sections · réparties automatiquement sur la grille du beat',
    lyricsStatsTimed: '{lines} lignes · horodatages LRC détectés',
    lyricsNoTrack: 'Analysez un morceau pour placer les lignes sur sa durée et son tempo réels.',
    lyricsPreset: 'Style typographique',
    lyricsPresetHelp: 'Cinq rendus branchés sur les mêmes faders Director et couleurs Creator.',
    lyricsPresetKaraoke: 'Karaoké',
    lyricsPresetKinetic: 'Pop cinétique',
    lyricsPresetNeon: 'Néon',
    lyricsPresetTypewriter: 'Machine à écrire',
    lyricsPresetCinematic: 'Cinéma',
    lyricsBackground: 'Arrière-plan',
    lyricsBackgroundAurora: 'Aurore',
    lyricsBackgroundParticles: 'Ciel étoilé',
    lyricsBackgroundImage: 'Mon image',
    lyricsImageHint: 'Utilise l’image importée dans Image Pulse (ou choisissez-en une ici).',
    lyricsChooseImage: 'Choisir une image',
    lyricsRemoveImage: 'Retirer l’image',
    lyricsOffset: 'Décalage',
    lyricsOffsetHelp: 'Avancez (−) ou retardez (+) toutes les lignes.',
    lyricsOffsetReset: 'Réinitialiser',
    lyricsToLrc: 'Convertir le timing auto en LRC',
    lyricsToLrcHelp: 'Écrit les horodatages calculés dans le texte pour ajuster chaque ligne à la main.',
    lyricsSample: 'Essayer des paroles d’exemple',
    lyricsPreviewHint: 'Collez des paroles dans Créer pour les voir chantées à l’écran.',
    lyricsPoetic: 'Chaque mot s’illumine sur la pulsation réelle du morceau.',
    proToolsHelp: 'Choisissez un moteur classique ou un outil Pro. Sphère de particules, Avatars danse, Image Pulse et Toile de paroles sont prêts.',
    comingSoonNote: 'Cet outil Pro arrive bientôt.',
    comingSoonBanner: 'Cet outil est un stub pour Pro Tools V1. Sélectionnez un autre outil Pro ou un moteur classique pour continuer vers Aperçu et Export.',
  },
};

export const LYRIC_SAMPLE = `Sous la pluie d’été, je marche sans bruit
Les néons s’allument au cœur de la nuit
J’entends ta voix qui danse dans l’écho
Et mon âme s’envole au-delà des mots

Lumière, lumière, emporte-moi là-bas
Où les étoiles chantent à chaque pas ✨
Lumière, lumière, ne t’éteins jamais
Garde nos rêves au creux de l’été

Déjà l’aube efface nos ombres légères
On garde un reflet, un parfum de mystère 🌙`;
