import { describe, expect, it } from 'vitest';
import {
  activeLyricAt,
  buildLyricTimeline,
  formatLrcTime,
  lyricTimelineFor,
  parseLyrics,
  summarizeLyrics,
  timelineToLrc,
} from './lyricCanvas.timing';

const PLAIN = `Sous la pluie d'été, je marche sans bruit
Les néons s'allument au cœur de la nuit

Lumière, lumière, emporte-moi là-bas
Où les étoiles chantent à chaque pas ✨`;

describe('Lyric Canvas · LRC parsing', () => {
  it('reads [mm:ss.xx] timestamps, metadata and multi-stamp lines', () => {
    const parsed = parseLyrics('[ti:Été]\n[ar:AiXel]\n[00:12.50]Première ligne\n[00:20][01:10.25]Refrain\n[00:30.1]Troisième');
    expect(parsed.timed).toBe(true);
    expect(parsed.entries.map((entry) => [entry.time, entry.text])).toEqual([
      [12.5, 'Première ligne'],
      [20, 'Refrain'],
      [70.25, 'Refrain'],
      [30.1, 'Troisième'],
    ]);
  });

  it('builds a sorted timed timeline, strips enhanced word tags and honours [offset:]', () => {
    const timeline = buildLyricTimeline('[offset:500]\n[00:10.00]A <00:10.50>b\n[00:05.00]Avant\n[00:14.00]', 60, 120);
    expect(timeline.timed).toBe(true);
    expect(timeline.lines.map((line) => line.text)).toEqual(['Avant', 'A b']);
    expect(timeline.lines[0].start).toBeCloseTo(4.5, 5);
    expect(timeline.lines[1].start).toBeCloseTo(9.5, 5);
    // An empty timestamp ends the previous line (pause marker).
    expect(timeline.lines[1].end).toBeCloseTo(13.5, 5);
  });

  it('interpolates untimed lines inside an LRC file', () => {
    const timeline = buildLyricTimeline('[00:10.00]Un\nDeux\n[00:20.00]Trois', 60, 120);
    expect(timeline.lines.map((line) => line.start)).toEqual([10, 15, 20]);
  });

  it('formats LRC time and round-trips an auto timeline', () => {
    expect(formatLrcTime(0)).toBe('[00:00.00]');
    expect(formatLrcTime(83.456)).toBe('[01:23.46]');
    const auto = buildLyricTimeline(PLAIN, 120, 100);
    const lrc = timelineToLrc(auto);
    expect(lrc.split('\n')).toHaveLength(5);
    const reparsed = buildLyricTimeline(lrc, 120, 100);
    expect(reparsed.timed).toBe(true);
    reparsed.lines.forEach((line, index) => expect(line.start).toBeCloseTo(auto.lines[index].start, 1));
    expect(reparsed.sections).toBe(2);
  });
});

describe('Lyric Canvas · automatic timing', () => {
  it('spreads plain lines across the track on the beat grid, with a breath between sections', () => {
    const timeline = buildLyricTimeline(PLAIN, 120, 120);
    expect(timeline.timed).toBe(false);
    expect(timeline.sections).toBe(2);
    const starts = timeline.lines.map((line) => line.start);
    // Intro before the first line, outro after the last one.
    expect(starts[0]).toBeGreaterThan(1);
    expect(timeline.lines[3].end).toBeLessThanOrEqual(120);
    // Beat-quantized (0.5 s per beat at 120 BPM).
    starts.forEach((start) => expect((start / 0.5) % 1).toBeCloseTo(0, 5));
    // Monotonic and the section break leaves an empty slot.
    for (let index = 1; index < starts.length; index += 1) expect(starts[index]).toBeGreaterThan(starts[index - 1]);
    const inSection = starts[1] - starts[0];
    expect(starts[2] - starts[1]).toBeGreaterThan(inSection * 1.5);
    expect(timeline.lines[1].end).toBeLessThanOrEqual(timeline.lines[2].start);
  });

  it('times words inside the line (accents and emoji count as single characters)', () => {
    const line = buildLyricTimeline('Où les étoiles ✨', 60, 120).lines[0];
    expect(line.words.map((word) => word.text)).toEqual(['Où', 'les', 'étoiles', '✨']);
    expect(line.words[0].start).toBe(line.start);
    expect(line.words[3].end).toBeCloseTo(line.singEnd, 6);
    for (let index = 1; index < line.words.length; index += 1) expect(line.words[index].start).toBeCloseTo(line.words[index - 1].end, 6);
    expect(line.singEnd).toBeLessThanOrEqual(line.end);
  });

  it('applies the global offset to every line and word', () => {
    const base = buildLyricTimeline(PLAIN, 120, 120);
    const late = buildLyricTimeline(PLAIN, 120, 120, 1.5);
    late.lines.forEach((line, index) => {
      expect(line.start).toBeCloseTo(base.lines[index].start + 1.5, 6);
      expect(line.words[0].start).toBeCloseTo(base.lines[index].words[0].start + 1.5, 6);
    });
  });

  it('handles empty input and unknown durations gracefully', () => {
    expect(buildLyricTimeline('', 120, 120).lines).toEqual([]);
    expect(buildLyricTimeline('\n\n  \n', 120, 120).lines).toEqual([]);
    const noDuration = buildLyricTimeline(PLAIN, 0, Number.NaN);
    expect(noDuration.lines).toHaveLength(4);
    expect(noDuration.lines.every((line) => Number.isFinite(line.start) && line.end > line.start)).toBe(true);
  });

  it('is deterministic and memoized per input', () => {
    expect(buildLyricTimeline(PLAIN, 97, 88, 0.3)).toEqual(buildLyricTimeline(PLAIN, 97, 88, 0.3));
    expect(lyricTimelineFor(PLAIN, 97, 88)).toBe(lyricTimelineFor(PLAIN, 97, 88));
  });

  it('finds the active line, including pauses between lines', () => {
    const timeline = buildLyricTimeline('[00:02.00]Un\n[00:04.00]\n[00:06.00]Deux', 30, 120);
    expect(activeLyricAt(timeline, 1)).toEqual({ current: -1, latest: -1 });
    expect(activeLyricAt(timeline, 3)).toEqual({ current: 0, latest: 0 });
    expect(activeLyricAt(timeline, 5)).toEqual({ current: -1, latest: 0 });
    expect(activeLyricAt(timeline, 6.5)).toEqual({ current: 1, latest: 1 });
  });

  it('summarizes lyrics for the Create panel', () => {
    expect(summarizeLyrics(PLAIN)).toEqual({ lines: 4, sections: 2, timed: false });
    expect(summarizeLyrics('[00:01.00]a\n[00:02.00]b')).toMatchObject({ lines: 2, timed: true });
  });
});
