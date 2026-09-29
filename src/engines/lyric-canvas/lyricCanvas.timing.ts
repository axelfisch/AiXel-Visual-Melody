// Lyric timing: LRC parsing, automatic beat-grid distribution and word timing.
// Everything here is a pure function of (lyrics text, track duration, BPM, offset),
// so Preview and Export always resolve the exact same line on the same audio time.

export type LyricEntry = { text: string; time: number | null };

export type ParsedLyrics = {
  entries: LyricEntry[];
  /** True when at least one `[mm:ss.xx]` timestamp was found. */
  timed: boolean;
  /** LRC `[offset:±ms]` tag converted to seconds (positive = lyrics appear earlier, per the LRC convention). */
  tagOffset: number;
};

export type LyricWord = { text: string; start: number; end: number };

export type LyricLine = {
  index: number;
  text: string;
  /** Line becomes the active line. */
  start: number;
  /** Line stops being the active line (next line or pause). */
  end: number;
  /** End of the "sung" part used for word-by-word highlighting. */
  singEnd: number;
  words: LyricWord[];
  /** Section (verse / chorus) index, from blank lines or long timed pauses. */
  section: number;
};

export type LyricTimeline = { lines: LyricLine[]; timed: boolean; sections: number };

const TIME_TAG = /^\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/;
const META_TAG = /^\[([a-z#]+):([^\]]*)\]$/i;
const WORD_TAG = /<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g;

/** Folds the analyzed BPM into a musical 70–180 range (same convention as the other Pro Tools). */
export function lyricBpm(bpm: number): number {
  let value = Number.isFinite(bpm) && bpm > 20 ? bpm : 112;
  while (value > 180) value /= 2;
  while (value < 70) value *= 2;
  return value;
}

function tagSeconds(minutes: string, seconds: string): number {
  const [whole, fraction = ''] = seconds.split(/[.:]/);
  const frac = fraction ? Number(`0.${fraction}`) : 0;
  return Number(minutes) * 60 + Number(whole) + frac;
}

export function parseLyrics(text: string): ParsedLyrics {
  const entries: LyricEntry[] = [];
  let tagOffset = 0;
  for (const raw of (text ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    let rest = raw.trim();
    const meta = META_TAG.exec(rest);
    if (meta && !TIME_TAG.test(rest)) {
      if (meta[1].toLowerCase() === 'offset') {
        const ms = Number(meta[2].trim());
        if (Number.isFinite(ms)) tagOffset = ms / 1000;
      }
      continue;
    }
    const times: number[] = [];
    let match = TIME_TAG.exec(rest);
    while (match) {
      times.push(tagSeconds(match[1], match[2]));
      rest = rest.slice(match[0].length).trimStart();
      match = TIME_TAG.exec(rest);
    }
    rest = rest.replace(WORD_TAG, '').replace(/\s+/g, ' ').trim();
    if (times.length) times.forEach((time) => entries.push({ text: rest, time }));
    else entries.push({ text: rest, time: null });
  }
  // Trim leading / trailing blank entries and collapse repeated section breaks.
  const compact: LyricEntry[] = [];
  for (const entry of entries) {
    const blank = !entry.text && entry.time === null;
    if (blank && (!compact.length || (!compact[compact.length - 1].text && compact[compact.length - 1].time === null))) continue;
    compact.push(entry);
  }
  while (compact.length && !compact[compact.length - 1].text && compact[compact.length - 1].time === null) compact.pop();
  return { entries: compact, timed: compact.some((entry) => entry.time !== null), tagOffset };
}

function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function withWords(line: Omit<LyricLine, 'words' | 'singEnd'>): LyricLine {
  const words = splitWords(line.text);
  const chars = words.reduce((sum, word) => sum + Array.from(word).length, 0);
  const span = Math.max(0.05, line.end - line.start);
  const singEnd = line.start + Math.min(span * 0.9, Math.max(0.9, chars * 0.07 + 0.5));
  const weights = words.map((word) => Array.from(word).length + 1.5);
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cursor = line.start;
  const timedWords = words.map((word, index) => {
    const duration = ((singEnd - line.start) * weights[index]) / total;
    const out = { text: word, start: cursor, end: cursor + duration };
    cursor += duration;
    return out;
  });
  return { ...line, singEnd, words: timedWords };
}

function timedTimeline(parsed: ParsedLyrics, duration: number): LyricTimeline {
  // Blank lines are explicit section breaks for the next sung line.
  const source: Array<LyricEntry & { breakBefore: boolean }> = [];
  let pendingBlank = false;
  for (const entry of parsed.entries) {
    if (!entry.text && entry.time === null) {
      pendingBlank = source.length > 0;
      continue;
    }
    source.push({ ...entry, breakBefore: pendingBlank && Boolean(entry.text) });
    if (entry.text) pendingBlank = false;
  }
  const explicitBreaks = source.some((entry) => entry.breakBefore);
  // Untimed lines inside an LRC file are spread between their timed neighbours.
  for (let index = 0; index < source.length; index += 1) {
    if (source[index].time !== null) continue;
    let prev = index - 1;
    while (prev >= 0 && source[prev].time === null) prev -= 1;
    let next = index + 1;
    while (next < source.length && source[next].time === null) next += 1;
    const from = prev >= 0 ? source[prev].time as number : 0;
    const to = next < source.length ? source[next].time as number : Math.max(from + 4 * (next - prev), duration);
    source[index].time = from + ((to - from) * (index - prev)) / (next - prev);
  }
  const sorted = source
    .map((entry, order) => ({ text: entry.text, time: entry.time as number, breakBefore: entry.breakBefore, order }))
    .sort((a, b) => a.time - b.time || a.order - b.order);
  const lines: LyricLine[] = [];
  let section = 0;
  let previousEnd = -Infinity;
  sorted.forEach((entry, index) => {
    if (!entry.text) return;
    const next = sorted.slice(index + 1).find((candidate) => candidate.time > entry.time);
    const words = splitWords(entry.text).length;
    // A line stays up until the next stamp, but never through a long instrumental.
    const cap = Math.min(12, Math.max(6, words * 0.8 + 3));
    const end = Math.min(next ? next.time : Infinity, entry.time + cap);
    if (lines.length && (explicitBreaks ? entry.breakBefore : entry.time - previousEnd > 6)) section += 1;
    lines.push(withWords({ index: lines.length, text: entry.text, start: entry.time, end, section }));
    previousEnd = end;
  });
  return { lines, timed: true, sections: lines.length ? section + 1 : 0 };
}

function autoTimeline(parsed: ParsedLyrics, duration: number, bpm: number): LyricTimeline {
  const texts: Array<{ text: string; section: number }> = [];
  let section = 0;
  for (const entry of parsed.entries) {
    if (!entry.text) {
      if (texts.length) section += 1;
      continue;
    }
    texts.push({ text: entry.text, section });
  }
  if (!texts.length) return { lines: [], timed: false, sections: 0 };
  const beat = 60 / lyricBpm(bpm);
  const bar = beat * 4;
  const total = Number.isFinite(duration) && duration > 1 ? duration : Math.max(30, texts.length * 4);
  const quantize = (value: number, grid: number) => Math.round(value / grid) * grid;
  const intro = Math.max(bar, quantize(Math.min(8, total * 0.06), bar));
  const outro = Math.max(bar * 0.5, Math.min(8, total * 0.05));
  const available = Math.max(1, total - intro - outro);
  const breaks = texts[texts.length - 1].section;
  // One empty "breath" slot between sections.
  const slots = texts.length + breaks;
  const slot = available / slots;
  const grid = slot >= bar * 2 ? bar : beat;
  const lines: LyricLine[] = [];
  let slotIndex = 0;
  texts.forEach((item, index) => {
    if (index > 0 && item.section !== texts[index - 1].section) slotIndex += 1;
    const rawStart = intro + slot * slotIndex;
    const start = Math.max(0, quantize(rawStart, grid));
    const nextSameSection = texts[index + 1] && texts[index + 1].section === item.section;
    const nextStart = quantize(intro + slot * (slotIndex + 1), grid);
    const end = Math.max(start + beat, nextSameSection ? nextStart : Math.min(total, start + slot));
    lines.push(withWords({ index, text: item.text, start, end, section: item.section }));
    slotIndex += 1;
  });
  return { lines, timed: false, sections: breaks + 1 };
}

function shift(timeline: LyricTimeline, offset: number): LyricTimeline {
  if (!offset) return timeline;
  return {
    ...timeline,
    lines: timeline.lines.map((line) => ({
      ...line,
      start: line.start + offset,
      end: line.end + offset,
      singEnd: line.singEnd + offset,
      words: line.words.map((word) => ({ ...word, start: word.start + offset, end: word.end + offset })),
    })),
  };
}

export function buildLyricTimeline(text: string, duration: number, bpm: number, offset = 0): LyricTimeline {
  const parsed = parseLyrics(text);
  const base = parsed.timed ? timedTimeline(parsed, duration) : autoTimeline(parsed, duration, bpm);
  return shift(base, offset - (parsed.timed ? parsed.tagOffset : 0));
}

const cache = new Map<string, LyricTimeline>();

/** Memoized `buildLyricTimeline` (keyed by every input, so it stays a pure function). */
export function lyricTimelineFor(text: string, duration: number, bpm: number, offset = 0): LyricTimeline {
  const key = `${duration}|${bpm}|${offset}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const timeline = buildLyricTimeline(text, duration, bpm, offset);
  if (cache.size > 24) cache.clear();
  cache.set(key, timeline);
  return timeline;
}

export type ActiveLyrics = {
  /** Index of the line currently being sung, -1 when none. */
  current: number;
  /** Index of the latest line that has started (still valid during pauses), -1 before the first line. */
  latest: number;
};

export function activeLyricAt(timeline: LyricTimeline, time: number): ActiveLyrics {
  let latest = -1;
  for (let index = 0; index < timeline.lines.length; index += 1) {
    if (timeline.lines[index].start <= time) latest = index;
    else break;
  }
  const current = latest >= 0 && time < timeline.lines[latest].end ? latest : -1;
  return { current, latest };
}

export function formatLrcTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const minutes = Math.floor(clamped / 60);
  const rest = clamped - minutes * 60;
  const centi = Math.min(5999, Math.round(rest * 100));
  const whole = Math.floor(centi / 100);
  const fraction = centi % 100;
  return `[${String(minutes).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(fraction).padStart(2, '0')}]`;
}

/** Serializes a timeline as LRC (blank line between sections) so auto timing can be fine-tuned by hand. */
export function timelineToLrc(timeline: LyricTimeline): string {
  const out: string[] = [];
  timeline.lines.forEach((line, index) => {
    if (index > 0 && line.section !== timeline.lines[index - 1].section) out.push('');
    out.push(`${formatLrcTime(line.start)}${line.text}`);
  });
  return out.join('\n');
}

export type LyricsSummary = { lines: number; sections: number; timed: boolean };

export function summarizeLyrics(text: string): LyricsSummary {
  const timeline = buildLyricTimeline(text, 180, 120, 0);
  return { lines: timeline.lines.length, sections: timeline.sections, timed: timeline.timed };
}
