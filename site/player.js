// Transport is independent of the DOM so timing/races can be tested deterministically.
export class LessonPlayer {
  constructor(segments, audio, { now = () => performance.now(), onChange = () => {}, onError = () => {} } = {}) {
    this.segments = segments; this.audio = audio; this.now = now;
    this.onChange = onChange; this.onError = onError;
    this.index = 0; this.phase = 'audio'; this.running = false;
    this.sentenceScale = 1; this.practiceScale = 1;
    this.elapsedGap = 0; this.gapStarted = null; this.generation = 0;
    this.audio.addEventListener('ended', () => this.ended());
    this.audio.addEventListener('error', () => this.fail('The audio could not load. Check your connection, then try Play again.'));
    this.load();
  }
  get segment() { return this.segments[this.index]; }
  gapFor(s = this.segment) { return s.gap * (s.practice ? this.practiceScale : this.sentenceScale); }
  gapElapsed() { return this.elapsedGap + (this.gapStarted === null ? 0 : (this.now() - this.gapStarted) / 1000); }
  remaining() { return Math.max(0, this.gapFor() - this.gapElapsed()); }
  emit() { this.onChange(this); }
  load() { this.audio.src = this.segment.audio; this.audio.load(); }
  async startAudio() {
    const generation = ++this.generation;
    try {
      await this.audio.play();
      if (generation !== this.generation) return;
      if (!this.running) this.audio.pause();
    } catch (error) {
      if (generation !== this.generation || error.name === 'AbortError') return;
      this.fail(error.name === 'NotAllowedError' ? 'Your browser paused playback. Press Play to continue.' : 'Unable to play this clip. Check your connection and try again.');
    }
  }
  play() {
    if (this.running) return;
    if (this.phase === 'done') this.select(0, false);
    this.running = true;
    if (this.phase === 'gap') this.gapStarted = this.now();
    else this.startAudio();
    this.emit(); this.tick();
  }
  pause() {
    this.generation++;
    if (this.phase === 'gap') this.elapsedGap = this.gapElapsed();
    this.gapStarted = null; this.running = false; this.audio.pause(); this.emit();
  }
  select(index, resume = this.running) {
    this.pause(); this.index = Math.max(0, Math.min(index, this.segments.length - 1));
    this.phase = 'audio'; this.elapsedGap = 0; this.load();
    if (resume) this.play(); else this.emit();
  }
  next(resume = this.running) {
    if (this.index === this.segments.length - 1) {
      this.pause(); this.phase = 'done'; this.emit(); return;
    }
    this.select(this.index + 1, resume);
  }
  repeat() { this.select(this.index, this.running); }
  ended() {
    if (!this.running || this.phase !== 'audio' || !this.audio.ended) return;
    this.phase = 'gap'; this.elapsedGap = 0; this.gapStarted = this.now(); this.emit(); this.tick();
  }
  setScales(sentence, practice) {
    this.sentenceScale = Math.max(.25, Math.min(3, Number(sentence)));
    this.practiceScale = Math.max(.5, Math.min(2.5, Number(practice)));
    // Recompute against elapsed time: changing a slider affects the CURRENT gap.
    this.emit(); this.tick();
  }
  tick() {
    if (this.running && this.phase === 'gap' && this.remaining() <= 0) this.next(true);
    else this.emit();
  }
  fail(message) { this.pause(); this.onError(message); }
  totalDuration() { return this.segments.reduce((total, s) => total + s.duration + this.gapFor(s), 0); }
  progressSeconds() {
    const before = this.segments.slice(0, this.index).reduce((total, s) => total + s.duration + this.gapFor(s), 0);
    if (this.phase === 'done') return this.totalDuration();
    return before + (this.phase === 'gap' ? this.segment.duration + Math.min(this.gapElapsed(), this.gapFor()) : Math.min(this.audio.currentTime || 0, this.segment.duration));
  }
}
