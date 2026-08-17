import type { Capabilities } from '../entitlements/entitlements.types';
import { exportGateReasons, type ExportGateReason } from '../export/exportFormats';
import type { ProjectRuntime, VisualMelodyProject } from './project.types';

export const hasSourceHint = (project: VisualMelodyProject) => project.sourceHint !== null;
export const hasAudio = (runtime: ProjectRuntime) =>
  runtime.sourceFile !== null && runtime.decodedAudio !== null && runtime.objectUrl !== null;
export const hasAnalysis = (project: VisualMelodyProject) => project.analysis !== null;
export const canPreview = (project: VisualMelodyProject, runtime: ProjectRuntime) =>
  hasSourceHint(project) && hasAudio(runtime) && hasAnalysis(project);

/** Whether the project has enough material to render at all, ignoring entitlements. */
export const isRenderable = canPreview;

export const getSelectedEngine = (project: VisualMelodyProject) => project.engine;

/**
 * Why the configured output is not authorized for this user. Readiness and
 * entitlement stay separate: a project can be fully renderable and still gated,
 * and a gated project is never rewritten to make it exportable.
 */
export const exportBlockers = (
  project: VisualMelodyProject,
  capabilities: Capabilities,
): ExportGateReason[] => exportGateReasons(project.export, capabilities);

export const canExport = (
  project: VisualMelodyProject,
  runtime: ProjectRuntime,
  capabilities: Capabilities,
) => isRenderable(project, runtime) && exportBlockers(project, capabilities).length === 0;

/** True when the project stores Creator Pro output choices this user cannot render. */
export const hasUnauthorizedProSettings = (project: VisualMelodyProject, capabilities: Capabilities) =>
  exportBlockers(project, capabilities).length > 0;
