import React, { useMemo, useState } from 'react';
import { analyzeAudioFile, type AudioAnalysis } from '../audio';
import { getEngineOrDefault, isProEngineId } from '../engines/engine.registry';
import { getTool, type ProjectToolId } from '../tools';
import {
  directorCapabilities,
  directorMoodProfiles,
  mapDirectorToEngine,
  type DirectorMood,
  type DirectorPalette,
  type DirectorState,
} from '../director';
import { useProject } from '../project/project.context';
import type { EngineParameterValue } from '../project/project.types';
import { ExportScreen } from '../screens/ExportScreen';
import { PreviewScreen } from '../screens/PreviewScreen';
import { useHashNavigation } from './navigation';
import { engines, PRO_ENGINE_KEYS, type EngineKey } from './engines.catalog';
import { CreateScreen } from './CreateScreen';
import {
  AnalyzeScreen,
  CosmicBackground,
  DesignSystemScreen,
  HomeScreen,
  SettingsScreen,
  TopNavigation,
} from './appScreens';

export function App() {
  const { screen, navigate } = useHashNavigation();
  const { project, runtime, dispatch, setAnalyzedAudio, setImageFile, clearImage } = useProject();
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
  const classicEngines = useMemo(() => engines.filter((item) => !PRO_ENGINE_KEYS.includes(item.key)), []);
  const selectEngine = (key: EngineKey) => {
    const selected = engines.find((item) => item.key === key);
    if (selected) {
      const mapped = mapDirectorToEngine(selected.id, directorValues, {
        ...project.engine.parameters,
        ...(isProEngineId(selected.id)
          ? { primaryColor: project.creator.primaryColor, accentColor: project.creator.accentColor }
          : {}),
      });
      dispatch({ type: 'SELECT_ENGINE', engineId: selected.id, parameters: mapped.parameters });
    }
  };
  const selectTool = (toolId: ProjectToolId) => {
    const tool = getTool(toolId);
    if (tool.availability === 'coming-soon') {
      dispatch({ type: 'SELECT_TOOL', tool: toolId });
      return;
    }
    if (tool.engineId) {
      const mapped = mapDirectorToEngine(tool.engineId, directorValues, {
        ...project.engine.parameters,
        primaryColor: project.creator.primaryColor,
        accentColor: project.creator.accentColor,
        ...(tool.engineId === 'image-pulse' ? { imageSrc: project.image?.objectUrl ?? '' } : {}),
      });
      dispatch({
        type: 'SELECT_TOOL',
        tool: toolId,
        engineId: tool.engineId,
        parameters: mapped.parameters,
      });
      return;
    }
    const engineId = isProEngineId(project.engine.engineId) ? 'minimal-album-art' : project.engine.engineId;
    const mapped = mapDirectorToEngine(engineId, directorValues, project.engine.parameters);
    dispatch({ type: 'SELECT_TOOL', tool: 'engine', engineId, parameters: mapped.parameters });
  };
  const applyDirector = (values: DirectorState, mood: DirectorMood | null) => {
    const mapped = mapDirectorToEngine(project.engine.engineId, values, {
      ...project.engine.parameters,
      primaryColor: project.creator.primaryColor,
      accentColor: project.creator.accentColor,
    });
    dispatch({ type: 'APPLY_DIRECTOR', mood, values, parameters: mapped.parameters });
  };
  const applyPalette = (palette: DirectorPalette) => {
    const primaryColor = palette.colors[0];
    const accentColor = palette.colors[1];
    dispatch({ type: 'UPDATE_CREATOR', creator: { primaryColor, accentColor } });
    const colorParameterIds = renderEngine.parameters.filter((item) => item.type === 'color').map((item) => item.id);
    const parameters: Record<string, EngineParameterValue> = {};
    colorParameterIds.forEach((id, index) => {
      if (id === 'primaryColor') parameters[id] = primaryColor;
      else if (id === 'accentColor') parameters[id] = accentColor;
      else parameters[id] = palette.colors[index % palette.colors.length];
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
            activeTool={project.tool}
            selectedMood={selectedMood}
            directorValues={directorValues}
            supportedDirectorDimensions={supportedDirectorDimensions}
            engine={engine}
            classicEngines={classicEngines}
            creator={project.creator}
            engineParameters={project.engine.parameters}
            projectName={project.name}
            image={project.image}
            onImageFile={setImageFile}
            onClearImage={clearImage}
            onEngine={selectEngine}
            onTool={selectTool}
            onPreset={(presetId) => dispatch({ type: 'SELECT_PRESET', presetId })}
            onMood={(mood) => applyDirector(directorMoodProfiles[mood], mood)}
            onDirectorChange={(dimension, value) => applyDirector({ ...directorValues, [dimension]: value }, null)}
            onPalette={applyPalette}
            onEngineParameter={(parameterId, value) => dispatch({ type: 'UPDATE_ENGINE_PARAMETER', parameterId, value })}
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
