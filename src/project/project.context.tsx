import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { AnalyzeAudioResult } from '../audio';
import { releasePulseImage } from '../engines/image-pulse/imagePulse.images';
import { prepareImagePulseUpload } from '../engines/image-pulse/imagePulse.upload';
import { createProject } from './project.defaults';
import { projectReducer, type ProjectAction } from './project.reducer';
import type { ProjectRuntime, VisualMelodyProject } from './project.types';

type ProjectContextValue = {
  project: VisualMelodyProject;
  runtime: ProjectRuntime;
  dispatch: React.Dispatch<ProjectAction>;
  setAnalyzedAudio: (file: File, result: AnalyzeAudioResult) => string;
  /** Validates + decodes an Image Pulse upload, then stores it (rejects with ImagePulseUploadError). */
  setImageFile: (file: File) => Promise<void>;
  clearImage: () => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, dispatch] = useReducer(projectReducer, undefined, () => createProject());
  const [runtime, setRuntime] = useState<ProjectRuntime>({ sourceFile: null, decodedAudio: null });
  const objectUrlRef = useRef<string | null>(null);
  const imageUrlRef = useRef<string | null>(null);

  const revokeCurrentUrl = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }, []);

  useEffect(() => revokeCurrentUrl, [revokeCurrentUrl]);

  const revokeImageUrl = useCallback(() => {
    if (imageUrlRef.current) {
      releasePulseImage(imageUrlRef.current);
      URL.revokeObjectURL(imageUrlRef.current);
    }
    imageUrlRef.current = null;
  }, []);

  useEffect(() => revokeImageUrl, [revokeImageUrl]);

  const setImageFile = useCallback(async (file: File) => {
    const { objectUrl, image, mimeType } = await prepareImagePulseUpload(file);
    revokeImageUrl();
    imageUrlRef.current = objectUrl;
    dispatch({
      type: 'SET_IMAGE_SOURCE',
      image: { fileName: file.name, mimeType, size: file.size, width: image.width, height: image.height, objectUrl },
    });
  }, [revokeImageUrl]);

  const clearImage = useCallback(() => {
    revokeImageUrl();
    dispatch({ type: 'CLEAR_IMAGE_SOURCE' });
  }, [revokeImageUrl]);

  const setAnalyzedAudio = useCallback((file: File, result: AnalyzeAudioResult) => {
    revokeCurrentUrl();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setRuntime({ sourceFile: file, decodedAudio: result.decodedAudio });
    dispatch({
      type: 'SET_AUDIO_SOURCE',
      audio: { fileName: file.name, mimeType: file.type, size: file.size, duration: result.duration, objectUrl },
    });
    dispatch({ type: 'ANALYSIS_COMPLETED', analysis: result.analysis });
    return objectUrl;
  }, [revokeCurrentUrl]);

  const value = useMemo(
    () => ({ project, runtime, dispatch, setAnalyzedAudio, setImageFile, clearImage }),
    [project, runtime, setAnalyzedAudio, setImageFile, clearImage],
  );
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject doit être utilisé dans ProjectProvider.');
  return context;
}
