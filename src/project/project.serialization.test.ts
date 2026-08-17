import { describe, expect, it } from 'vitest';
import { PROJECT_SCHEMA_VERSION, createProject } from './project.defaults';
import { ProjectValidationError, PROJECT_LIMITS } from './project.schema';
import { parseProject, serializeProject, toProjectDocument } from './project.serialization';
import type { VisualMelodyProject } from './project.types';

/** A complete, hand-written version-1 document as older builds wrote it. */
const legacyV1 = () => ({
  schemaVersion: 1,
  id: 'legacy-project',
  name: 'In the Spirit of Naomi',
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-02T10:00:00.000Z',
  audio: {
    fileName: 'In the Spirit of Naomi.m4a',
    mimeType: 'audio/mp4',
    size: 4_200_000,
    duration: 176.5,
    objectUrl: 'blob:http://localhost/9f0b',
  },
  analysis: {
    sampleRate: 48_000,
    bpm: 88,
    peak: 0.94,
    averageEnergy: 0.41,
    waveform: [12, 74, 33],
    energy: [0.1, 0.6],
  },
  engine: {
    engineId: 'minimal-album-art',
    presetId: 'Naomi',
    parameters: { directorMood: 'More Dreamy', rotationSpeed: 0.4 },
  },
  export: { format: 'mp4', width: 1280, height: 720, frameRate: 30, videoBitRate: 6_000_000 },
});

const parseValue = (value: unknown) => parseProject(JSON.stringify(value));

const expectCode = (run: () => unknown, code: string) => {
  try {
    run();
  } catch (reason) {
    expect(reason).toBeInstanceOf(ProjectValidationError);
    expect((reason as ProjectValidationError).code).toBe(code);
    expect((reason as ProjectValidationError).message).toMatch(/AiXel/);
    return;
  }
  throw new Error(`Expected a ${code} validation error.`);
};

describe('project serialization', () => {
  it('round-trips a current project unchanged', () => {
    const project = createProject('Naomi');
    project.artistName = 'Axel Fisch';
    project.sourceHint = { fileName: 'naomi.wav', mimeType: 'audio/wav', size: 42, duration: 12, sha256: null };
    expect(parseProject(serializeProject(project))).toEqual(project);
  });

  it('cannot serialize runtime state even when it is attached to the project', () => {
    const project = createProject();
    project.sourceHint = { fileName: 'naomi.wav', mimeType: 'audio/wav', size: 42, duration: 12, sha256: null };
    const contaminated = project as VisualMelodyProject & Record<string, unknown>;
    contaminated.sourceFile = new File(['x'], 'naomi.wav');
    contaminated.decodedAudio = {};
    contaminated.objectUrl = 'blob:http://localhost/9f0b';

    const serialized = serializeProject(contaminated);
    expect(serialized).not.toMatch(/blob:/);
    expect(serialized).not.toMatch(/sourceFile|decodedAudio|objectUrl/);
    expect(Object.keys(toProjectDocument(contaminated))).toEqual([
      'schemaVersion',
      'id',
      'name',
      'artistName',
      'createdAt',
      'updatedAt',
      'sourceHint',
      'analysis',
      'engine',
      'export',
    ]);
  });

  it('refuses to serialize an unsafe source location', () => {
    const project = createProject();
    project.sourceHint = {
      fileName: 'https://cdn.example.com/naomi.wav',
      mimeType: 'audio/wav',
      size: 42,
      duration: 12,
      sha256: null,
    };
    expectCode(() => serializeProject(project), 'unsafe_reference');
  });
});

describe('project migration', () => {
  it('migrates a version-1 document deterministically', () => {
    const first = parseValue(legacyV1());
    const second = parseValue(legacyV1());
    expect(first).toEqual(second);

    expect(first.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(first.artistName).toBeNull();
    expect(first.export.aspectRatio).toBe('16:9');
    expect(first.export.endCardMode).toBe('aixel');
  });

  it('turns the version-1 audio block into a source hint and drops its object URL', () => {
    const migrated = parseValue(legacyV1());
    expect(migrated.sourceHint).toEqual({
      fileName: 'In the Spirit of Naomi.m4a',
      mimeType: 'audio/mp4',
      size: 4_200_000,
      duration: 176.5,
      sha256: null,
    });
    expect(JSON.stringify(migrated)).not.toMatch(/blob:/);
  });

  it('migrates legacy Director mood parameters into structured state', () => {
    const migrated = parseValue(legacyV1());
    expect(migrated.engine.director.mood).toBe('More Dreamy');
    expect(migrated.engine.director.values.space).toBe(88);
    expect(migrated.engine.parameters.directorMood).toBeUndefined();
    expect(migrated.engine.parameters.rotationSpeed).toBe(0.4);
  });

  it('derives a supported aspect ratio and rejects unknown version-1 geometry', () => {
    const vertical = legacyV1();
    vertical.export = { ...vertical.export, width: 720, height: 1280 };
    expect(parseValue(vertical).export.aspectRatio).toBe('9:16');

    const unknownShape = legacyV1();
    unknownShape.export = { ...unknownShape.export, width: 1234, height: 567 };
    expectCode(() => parseValue(unknownShape), 'invalid_value');
  });

  it('migrates a version-1 project without audio or analysis', () => {
    const bare = { ...legacyV1(), audio: null, analysis: null };
    const migrated = parseValue(bare);
    expect(migrated.sourceHint).toBeNull();
    expect(migrated.analysis).toBeNull();
  });

  it('re-serializes a migrated project as the current version', () => {
    const migrated = parseValue(legacyV1());
    expect(parseProject(serializeProject(migrated))).toEqual(migrated);
  });
});

describe('project validation', () => {
  it('rejects unreadable JSON', () => {
    expectCode(() => parseProject('{ not json'), 'unreadable');
  });

  it('rejects unsupported schema versions', () => {
    expectCode(() => parseProject('{"schemaVersion":99}'), 'unsupported_version');
    expectCode(() => parseProject('{"schemaVersion":"2"}'), 'unsupported_version');
    expectCode(() => parseProject('{}'), 'unsupported_version');
    expect(() => parseProject('{"schemaVersion":99}')).toThrow(/version/i);
  });

  it('rejects a payload above the serialized ceiling', () => {
    const oversized = createProject();
    oversized.analysis = {
      sampleRate: 48_000,
      bpm: 88,
      peak: 0.5,
      averageEnergy: 0.5,
      waveform: [],
      energy: Array.from({ length: 70_000 }, () => 0.123456789012345),
    };
    expectCode(() => serializeProject(oversized), 'too_large');
    expectCode(() => parseProject(`{"schemaVersion":2,"pad":"${'x'.repeat(PROJECT_LIMITS.maxSerializedBytes)}"}`), 'too_large');
  });

  it('rejects unknown keys instead of silently keeping them', () => {
    expectCode(() => parseValue({ ...legacyV1(), surprise: true }), 'unknown_field');
    const project = JSON.parse(serializeProject(createProject()));
    expectCode(() => parseValue({ ...project, export: { ...project.export, watermark: false } }), 'unknown_field');
  });

  it('rejects prototype-shaped keys anywhere in the document', () => {
    expectCode(() => parseProject('{"schemaVersion":1,"__proto__":{"polluted":true}}'), 'unknown_field');
    expectCode(
      () => parseProject('{"schemaVersion":1,"engine":{"parameters":{"constructor":1}}}'),
      'unknown_field',
    );
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects non-finite and out-of-range numbers', () => {
    const withBadAnalysis = (analysis: unknown) => () => parseValue({ ...legacyV1(), analysis });
    expectCode(withBadAnalysis({ ...legacyV1().analysis, bpm: 1e999 }), 'invalid_value');
    expectCode(withBadAnalysis({ ...legacyV1().analysis, sampleRate: -1 }), 'invalid_value');
    expectCode(withBadAnalysis({ ...legacyV1().analysis, energy: [0.5, -0.5] }), 'invalid_value');

    const badExport = legacyV1();
    badExport.export = { ...badExport.export, frameRate: 30.5 };
    expectCode(() => parseValue(badExport), 'invalid_value');

    const hugeFrame = legacyV1();
    hugeFrame.export = { ...hugeFrame.export, width: 99_999 };
    expectCode(() => parseValue(hugeFrame), 'invalid_value');

    const oversizedSource = legacyV1();
    oversizedSource.audio = { ...oversizedSource.audio, size: PROJECT_LIMITS.maxSourceBytes + 1 };
    expectCode(() => parseValue(oversizedSource), 'invalid_value');

    const overlongSource = legacyV1();
    overlongSource.audio = { ...overlongSource.audio, duration: PROJECT_LIMITS.maxSourceDuration + 1 };
    expectCode(() => parseValue(overlongSource), 'invalid_value');
  });

  it('rejects malformed and incomplete documents', () => {
    expectCode(() => parseProject('[]'), 'invalid_shape');
    expectCode(() => parseValue({ ...legacyV1(), name: 42 }), 'invalid_shape');
    expectCode(() => parseValue({ ...legacyV1(), createdAt: 'yesterday' }), 'invalid_value');
    const { engine: _engine, ...withoutEngine } = legacyV1();
    expectCode(() => parseValue(withoutEngine), 'invalid_shape');

    const current = JSON.parse(serializeProject(createProject()));
    const { artistName: _artistName, ...withoutArtistName } = current;
    expectCode(() => parseValue(withoutArtistName), 'invalid_shape');
    const { parameters: _parameters, ...engineWithoutParameters } = current.engine;
    expectCode(() => parseValue({ ...current, engine: engineWithoutParameters }), 'invalid_shape');
    const { values: _values, ...directorWithoutValues } = current.engine.director;
    expectCode(
      () => parseValue({ ...current, engine: { ...current.engine, director: directorWithoutValues } }),
      'invalid_shape',
    );
  });

  it('enforces normalized analysis and non-empty source bounds', () => {
    expectCode(
      () => parseValue({ ...legacyV1(), analysis: { ...legacyV1().analysis, peak: 1.01 } }),
      'invalid_value',
    );
    expectCode(
      () => parseValue({ ...legacyV1(), analysis: { ...legacyV1().analysis, energy: [1.01] } }),
      'invalid_value',
    );
    expectCode(
      () => parseValue({ ...legacyV1(), analysis: { ...legacyV1().analysis, waveform: [100.01] } }),
      'invalid_value',
    );
    expectCode(
      () => parseValue({ ...legacyV1(), audio: { ...legacyV1().audio, size: 0 } }),
      'invalid_value',
    );
    expectCode(
      () => parseValue({ ...legacyV1(), audio: { ...legacyV1().audio, duration: 0 } }),
      'invalid_value',
    );
  });

  it('rejects unknown enum values', () => {
    const project = JSON.parse(serializeProject(createProject()));
    expectCode(() => parseValue({ ...project, export: { ...project.export, aspectRatio: '21:9' } }), 'invalid_value');
    expectCode(() => parseValue({ ...project, export: { ...project.export, endCardMode: 'sponsor' } }), 'invalid_value');
    expectCode(() => parseValue({ ...project, export: { ...project.export, format: 'webm' } }), 'invalid_value');
    expectCode(
      () => parseValue({ ...project, engine: { ...project.engine, director: { ...project.engine.director, mood: 'More Loud' } } }),
      'invalid_value',
    );
  });

  it('rejects a current document whose declared ratio disagrees with its pixels', () => {
    const project = JSON.parse(serializeProject(createProject()));
    expectCode(
      () => parseValue({ ...project, export: { ...project.export, width: 1920, height: 720 } }),
      'invalid_value',
    );
    expectCode(
      () => parseValue({ ...project, export: { ...project.export, width: 720, height: 1280 } }),
      'invalid_value',
    );
  });

  it('refuses a source hint that points at a location instead of describing a file', () => {
    const project = JSON.parse(serializeProject(createProject()));
    const hint = { fileName: 'naomi.wav', mimeType: 'audio/wav', size: 10, duration: 5, sha256: null };
    expectCode(
      () => parseValue({ ...project, sourceHint: { ...hint, fileName: 'blob:http://localhost/9f0b' } }),
      'unsafe_reference',
    );
    expectCode(
      () => parseValue({ ...project, sourceHint: { ...hint, fileName: 'https://cdn.example.com/naomi.wav' } }),
      'unsafe_reference',
    );
    expectCode(() => parseValue({ ...project, sourceHint: { ...hint, sha256: 'not-a-digest' } }), 'invalid_value');
    expectCode(
      () => parseValue({ ...project, sourceHint: { ...hint, remoteUrl: 'https://cdn.example.com/naomi.wav' } }),
      'unknown_field',
    );
  });

  it('keeps a Creator Pro configuration representable without authorizing it', () => {
    const project = JSON.parse(serializeProject(createProject()));
    const pro = parseValue({
      ...project,
      export: { ...project.export, width: 1080, height: 1920, aspectRatio: '9:16', endCardMode: 'clean' },
    });
    expect(pro.export.aspectRatio).toBe('9:16');
    expect(pro.export.endCardMode).toBe('clean');
  });
});
