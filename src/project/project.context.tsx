import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { AnalyzeAudioResult } from '../audio';
import { createProject } from './project.defaults';
import { projectReducer, type ProjectAction } from './project.reducer';
import type { ProjectRuntime, VisualMelodyProject } from './project.types';

type ProjectContextValue = {
  project: VisualMelodyProject;
  runtime: ProjectRuntime;
  dispatch: React.Dispatch<ProjectAction>;
  setAnalyzedAudio: (file: File, result: AnalyzeAudioResult) => string;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, dispatch] = useReducer(projectReducer, undefined, () => createProject());
  const [runtime, setRuntime] = useState<ProjectRuntime>({
    sourceFile: null,
    decodedAudio: null,
    objectUrl: null,
  });
  const objectUrlRef = useRef<string | null>(null);

  const revokeCurrentUrl = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }, []);

  useEffect(() => revokeCurrentUrl, [revokeCurrentUrl]);

  const setAnalyzedAudio = useCallback((file: File, result: AnalyzeAudioResult) => {
    revokeCurrentUrl();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    // The `File`, the decoded buffer, and the object URL live only here.
    setRuntime({ sourceFile: file, decodedAudio: result.decodedAudio, objectUrl });
    dispatch({
      type: 'SET_AUDIO_SOURCE',
      sourceHint: {
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        duration: result.duration,
        sha256: null,
      },
    });
    dispatch({ type: 'ANALYSIS_COMPLETED', analysis: result.analysis });
    return objectUrl;
  }, [revokeCurrentUrl]);

  const value = useMemo(() => ({ project, runtime, dispatch, setAnalyzedAudio }), [project, runtime, setAnalyzedAudio]);
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject doit être utilisé dans ProjectProvider.');
  return context;
}
