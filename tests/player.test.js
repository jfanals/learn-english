import test from 'node:test';
import assert from 'node:assert/strict';
import { LessonPlayer } from '../site/player.js';
import fs from 'node:fs';

class FakeAudio {
  listeners = {}; currentTime = 0; ended = false; pauses = 0; plays = 0;
  addEventListener(name, fn) { this.listeners[name] = fn; }
  load() { this.currentTime = 0; this.ended = false; }
  play() { this.plays++; return Promise.resolve(); }
  pause() { this.pauses++; }
  finish() { this.ended = true; this.listeners.ended(); }
}
const segments = [
  { audio: 'a.mp3', duration: 2, gap: .8, practice: false },
  { audio: 'b.mp3', duration: 3, gap: 6, practice: true },
  { audio: 'c.mp3', duration: 2, gap: .8, practice: false }
];
function setup() {
  let now = 0; const audio = new FakeAudio();
  const p = new LessonPlayer(segments, audio, { now: () => now });
  return { p, audio, advance: ms => { now += ms; p.tick(); } };
}

test('play, pause, and resume do not reset the audio clip', () => {
  const { p, audio } = setup(); p.play(); audio.currentTime = 1; p.pause();
  assert.equal(p.running, false); assert.equal(audio.currentTime, 1);
  p.play(); assert.equal(audio.currentTime, 1); assert.equal(audio.plays, 2);
});
test('automatic clip progression observes the sentence gap', () => {
  const { p, audio, advance } = setup(); p.play(); audio.finish();
  assert.equal(p.phase, 'gap'); advance(799); assert.equal(p.index, 0);
  advance(2); assert.equal(p.index, 1); assert.equal(p.phase, 'audio');
});
test('paused waiting time is frozen until resume', () => {
  const { p, audio, advance } = setup(); p.select(1); p.play(); audio.finish();
  advance(2000); p.pause(); advance(100000);
  assert.equal(p.remaining(), 4); p.play(); advance(3999); assert.equal(p.index, 1);
  advance(2); assert.equal(p.index, 2);
});
test('shortening a current practice gap takes effect immediately', () => {
  const { p, audio, advance } = setup(); p.select(1); p.play(); audio.finish();
  advance(4000); p.setScales(1, .5); assert.equal(p.index, 2);
});
test('lengthening a current gap preserves elapsed time', () => {
  const { p, audio, advance } = setup(); p.play(); audio.finish(); advance(400);
  p.setScales(2, 1); assert.ok(Math.abs(p.remaining() - 1.2) < .001);
});
test('sentence and response settings are independent', () => {
  const { p } = setup(); p.setScales(3, .5);
  assert.ok(Math.abs(p.gapFor(segments[0]) - 2.4) < 1e-9); assert.equal(p.gapFor(segments[1]), 3);
});
test('repeat starts the current prompt again, navigation cancels a gap', () => {
  const { p, audio } = setup(); p.select(1, true); audio.finish(); p.repeat();
  assert.equal(p.index, 1); assert.equal(p.phase, 'audio'); assert.equal(p.running, true);
  p.select(0, false); assert.equal(p.running, false); assert.equal(audio.currentTime, 0);
});
test('last clip completes, play restarts without advancing out of bounds', () => {
  const { p, audio, advance } = setup(); p.select(2, true); audio.finish(); advance(801);
  assert.equal(p.phase, 'done'); assert.equal(p.running, false); p.play();
  assert.equal(p.index, 0); assert.equal(p.phase, 'audio');
});
test('late rejected play cannot stop a newly selected clip', async () => {
  const { p, audio } = setup(); let reject;
  audio.play = () => new Promise((_resolve, rej) => { reject = rej; });
  p.play(); const rejectOld = reject; audio.play = () => Promise.resolve();
  p.select(1, true); rejectOld(new Error('obsolete request')); await Promise.resolve();
  assert.equal(p.running, true); assert.equal(p.index, 1);
});
test('export contains only relative original audio and no private paths/answers', () => {
  const raw = fs.readFileSync(new URL('../site/lesson.json', import.meta.url), 'utf8');
  const manifest = JSON.parse(raw);
  assert.equal(manifest.segments.length, 156); assert.equal(manifest.chapters.length, 10);
  assert.equal(new Set(manifest.segments.map(s => s.audio)).size, 99);
  assert.ok(!raw.includes('/Users/') && !raw.includes('expected_answer') && !raw.includes('Pimsleur Complete Collection'));
  for (const s of manifest.segments) {
    assert.match(s.audio, /^audio\/[a-f0-9]+\.mp3$/);
    assert.ok(fs.existsSync(new URL(`../site/${s.audio}`, import.meta.url)));
    assert.ok(s.duration > 0 && s.gap >= 0);
  }
});
