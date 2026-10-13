import { LessonPlayer } from './player.js';
const $ = id => document.getElementById(id);
const formatTime = seconds => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const number = value => Number(value.toFixed(2)).toString();
let player, lesson, chapterButtons = [], lastState = '';
const audio = new Audio();
audio.preload = 'auto';
const showError = message => { $('error').textContent = message; $('error').hidden = false; };

function saveSettings() {
  try { localStorage.setItem('english-in-rhythm-settings', JSON.stringify({ sentence: player.sentenceScale, practice: player.practiceScale, showText: $('show-text').checked })); } catch {}
}
function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('english-in-rhythm-settings'));
    if (!saved) return;
    for (const [key, id, min, max] of [['sentence','sentence-pause',.25,3],['practice','answer-pause',.5,2.5]]) {
      if (Number.isFinite(saved[key])) $(id).value = Math.max(min, Math.min(max, saved[key]));
    }
    $('show-text').checked = Boolean(saved.showText);
  } catch {}
}
function settingsChanged() {
  if (!player) return;
  player.setScales(Number($('sentence-pause').value), Number($('answer-pause').value));
  saveSettings();
}
function update() {
  if (!player || !lesson) return;
  const segment = player.segment;
  const chapterIndex = lesson.chapters.findLastIndex(c => c.index <= player.index);
  const practice = player.phase === 'gap' && segment.practice;
  const state = `${player.index}:${player.phase}:${player.running}:${$('show-text').checked}`;
  if (state !== lastState) {
    lastState = state;
    $('chapter-number').textContent = `${String(chapterIndex + 1).padStart(2,'0')} / ${lesson.chapters.length}`;
    $('chapter-name').textContent = segment.chapter.replace(/^\d+ · /, '');
    $('play-label').textContent = player.running ? 'Pause' : player.phase === 'done' ? 'Play again' : 'Play lesson';
    $('play-icon').textContent = player.running ? 'Ⅱ' : '▶';
    $('play').setAttribute('aria-label', player.running ? 'Pause lesson' : player.phase === 'done' ? 'Play lesson again' : 'Play lesson');
    $('previous').disabled = player.index === 0;
    $('next').disabled = player.phase === 'done';
    $('skip-pause').hidden = player.phase !== 'gap';
    $('skip-pause').disabled = !player.running;
    $('stage').dataset.phase = player.phase === 'done' ? 'done' : !player.running ? 'paused' : practice ? 'practice' : player.phase === 'gap' ? 'gap' : 'speaking';
    let title, help;
    if (player.phase === 'done') { title = 'Session complete'; help = 'Tomorrow, try one sentence about now, yesterday, and tomorrow before listening again.'; }
    else if (!player.running) { title = player.phase === 'gap' ? 'Pause held' : 'Ready when you are'; help = player.phase === 'gap' ? 'Press Play to continue the remaining pause.' : 'Press Play. Speak out loud during the practice pauses.'; }
    else if (practice) { title = segment.kind === 'repeat_model' ? 'Your turn · repeat it' : segment.kind === 'free_response_prompt' ? 'Your turn · make it personal' : 'Your turn · find the words'; help = segment.kind === 'repeat_model' ? 'Repeat the phrase you just heard.' : segment.kind === 'free_response_prompt' ? 'Talk about now, yesterday, and tomorrow. There is no single correct answer.' : 'Try an answer before the example. A short sentence is enough.'; }
    else if (player.phase === 'gap') { title = 'A little breathing room'; help = 'The next sentence is coming up.'; }
    else { title = segment.language === 'pt-BR' ? 'Listen · Brazilian Portuguese' : 'Listen · American English'; help = segment.kind === 'confirmation' ? 'Compare your answer with this example.' : segment.kind === 'repeat_model' ? 'Listen first. You’ll have time to repeat it.' : 'Let the sentence finish before you respond.'; }
    $('stage-label').textContent = title;
    $('stage-help').textContent = help;
    $('current-line').hidden = !$('show-text').checked || player.phase === 'done';
    $('current-line').textContent = segment.text;
    $('current-line').lang = segment.language;
    // Never show the next model answer during a recall window.
    $('lesson-progress').value = player.index;
    $('lesson-progress').setAttribute('aria-valuetext', `Clip ${player.index + 1} of ${lesson.segments.length}: ${segment.chapter}`);
    $('clip-count').textContent = `Clip ${player.index + 1} / ${lesson.segments.length}`;
    chapterButtons.forEach((button, i) => { if (i === chapterIndex) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
  }
  $('countdown').textContent = player.phase === 'gap' ? `${player.remaining().toFixed(1)}s` : '';
  $('elapsed').textContent = formatTime(player.progressSeconds());
  $('duration').textContent = formatTime(player.totalDuration());
  $('sentence-output').textContent = `${number(player.sentenceScale)}×`;
  $('answer-output').textContent = `${number(player.practiceScale)}×`;
  $('sentence-detail').textContent = `Typical gaps: ${number(.6 * player.sentenceScale)}–${number(.8 * player.sentenceScale)} seconds`;
  $('answer-detail').textContent = `Most answers: ${number(4 * player.practiceScale)}–${number(8 * player.practiceScale)} seconds · personal turn: ${number(30 * player.practiceScale)}s`;
  // Chapter estimates also update when either pause slider moves.
  lesson.chapters.forEach((c, i) => {
    const duration = lesson.segments.slice(c.index, lesson.chapters[i + 1]?.index ?? lesson.segments.length).reduce((n, s) => n + s.duration + player.gapFor(s), 0);
    chapterButtons[i].querySelector('.chapter-duration').textContent = formatTime(duration);
  });
}

async function init() {
  try {
    const response = await fetch('lesson.json');
    if (!response.ok) throw new Error(`Lesson fetch failed: ${response.status}`);
    lesson = await response.json();
    if (!lesson.segments?.length || !lesson.chapters?.length) throw new Error('Invalid lesson');
    // Native relative URLs work on GitHub Pages project paths and locally.
    player = new LessonPlayer(lesson.segments, audio, { onChange: update, onError: showError });
    for (const [i, chapter] of lesson.chapters.entries()) {
      const button = document.createElement('button');
      button.className = 'chapter';
      const top = document.createElement('span'); top.className = 'chapter-top';
      const index = document.createElement('span'); index.textContent = String(i + 1).padStart(2,'0');
      const duration = document.createElement('span'); duration.className = 'chapter-duration';
      top.append(index, duration);
      const title = document.createElement('span'); title.className = 'chapter-title'; title.textContent = chapter.title.replace(/^\d+ · /,'');
      button.append(top, title); button.addEventListener('click', () => { $('error').hidden = true; player.select(chapter.index); });
      $('chapters').append(button); chapterButtons.push(button);
    }
    ['play','next','repeat','lesson-progress'].forEach(id => $(id).disabled = false);
    $('lesson-progress').max = lesson.segments.length - 1;
    $('play').addEventListener('click', () => { $('error').hidden = true; if (player.running) player.pause(); else player.play(); });
    $('previous').addEventListener('click', () => player.select(player.index - 1));
    $('next').addEventListener('click', () => player.next());
    $('skip-pause').addEventListener('click', () => player.next());
    $('repeat').addEventListener('click', () => player.repeat());
    $('lesson-progress').addEventListener('input', () => player.select(Number($('lesson-progress').value)));
    ['sentence-pause','answer-pause'].forEach(id => $(id).addEventListener('input', settingsChanged));
    $('reset-pace').addEventListener('click', () => { $('sentence-pause').value = '1'; $('answer-pause').value = '1'; settingsChanged(); });
    $('show-text').addEventListener('change', () => { update(); saveSettings(); });
    document.addEventListener('keydown', e => {
      if (e.code !== 'Space' || /INPUT|BUTTON|TEXTAREA|SELECT|A/.test(e.target.tagName) || e.target.isContentEditable) return;
      e.preventDefault(); $('play').click();
    });
    restoreSettings(); settingsChanged(); update();
    setInterval(() => { player.tick(); }, 100);
    // A visual countdown may be throttled in background tabs; compare wall-clock
    // on return so pauses are never skipped prematurely.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) player.tick(); });
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: lesson.title, artist: 'English, in rhythm', album: 'Pilot 01 · PT-BR → EN-US' });
      navigator.mediaSession.setActionHandler('play', () => player.play());
      navigator.mediaSession.setActionHandler('pause', () => player.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => player.select(player.index - 1));
      navigator.mediaSession.setActionHandler('nexttrack', () => player.next());
    }
  } catch (error) {
    $('stage-label').textContent = 'Couldn’t load the lesson';
    $('stage-help').textContent = 'Refresh the page to try again.';
    showError('The lesson could not load. Please check your connection and refresh.');
    console.error(error);
  }
}
init();
