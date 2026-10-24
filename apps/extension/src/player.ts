import {MusicAdapter, formatTime, type Action} from './adapter';

// All dimensions include the complete click target, not only the icon glyph.
export const playerCSS = `
:root {
  color-scheme: dark;
  font-family: system-ui, 'Segoe UI', 'Yu Gothic UI', sans-serif;
  background: #0b0d0c;
  color: #eef2ef;
  --accent: #b4d8b3;
  --muted: #8c9890;
}
* { box-sizing: border-box; }
html, body { margin: 0; min-width: 0; min-height: 100%; }
body { overflow: auto; }
button, input { font: inherit; }
button {
  display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 auto; padding: 0; width: 32px; height: 32px;
  border: 1px solid transparent; border-radius: 50%;
  background: transparent; color: #b3beb6; cursor: pointer;
}
button:hover { color: #f1f6f2; background: #1b211d; }
button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
button:disabled, input:disabled { opacity: .3; cursor: default; }
button svg { display: block; width: 18px; height: 18px; flex: none; }
.shell {
  display: flex; flex-direction: column; gap: 8px;
  width: 100%; max-width: 620px; min-width: 0; margin: 0 auto;
  padding: 10px 16px;
}
.header { display: flex; align-items: center; gap: 4px; min-width: 0; height: 20px; flex-shrink: 0; }
.brand { display: flex; align-items: center; gap: 7px; min-width: 0; margin-right: auto; color: #8c9c91; font-size: 9px; font-weight: 600; line-height: 16px; letter-spacing: .15em; white-space: nowrap; }
.brand::before { content: ''; width: 4px; height: 4px; background: var(--accent); border-radius: 50%; flex: none; }
.header button { width: 26px; height: 26px; border-radius: 5px; color: #748279; }
.header button svg { width: 14px; height: 14px; }
.track { display: flex; align-items: center; gap: 15px; min-width: 0; }
.art { display: grid; place-items: center; width: 72px; height: 72px; flex: 0 0 72px; overflow: hidden; border: 1px solid #252d27; border-radius: 7px; background: #19221b; }
.art::before { content: '♪'; grid-area: 1/1; font-size: 27px; color: #637a67; }
.cover { grid-area: 1/1; display: block; width: 100%; height: 100%; }
.cover:not([data-ready]) { visibility: hidden; }
.meta { flex: 1 1 0%; min-width: 0; }
.title, .artist { display: block; min-width: 0; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.title { font-size: 17px; font-weight: 600; line-height: 1.5; letter-spacing: -.025em; }
.artist { margin-top: 6px; font-size: 12px; line-height: 1.6; color: #9aa79e; }
.progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.seek { width: 100%; min-width: 0; margin: 0; }
input[type=range] { appearance: none; -webkit-appearance: none; cursor: pointer; background: transparent; height: 16px; padding: 0; }
input[type=range]::-webkit-slider-runnable-track { height: 2px; border-radius: 2px; background: linear-gradient(to right, var(--accent) var(--fill, 0%), #2c3730 var(--fill, 0%)); }
input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 6px; height: 6px; margin-top: -2px; border-radius: 50%; background: #c8e6c6; }
input[type=range]:hover::-webkit-slider-thumb, input[type=range]:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px #b4d8b31a; }
.times { display: flex; justify-content: space-between; gap: 12px; min-width: 0; }
.time { flex: 0 0 auto; font-size: 10px; line-height: 12px; letter-spacing: .025em; font-variant-numeric: tabular-nums; color: #77867c; }
.current { color: #aebdb2; }
.controls { position: relative; display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr); align-items: center; min-width: 0; }
.transport { grid-column: 2; display: flex; align-items: center; justify-content: center; gap: 12px; min-width: 0; }
.transport > button:not(.primary) { width: 32px; height: 36px; }
button.primary { width: 48px; height: 48px; border: 1px solid #c4e0c0; background: var(--accent); color: #132216; box-shadow: 0 2px 10px #0003; }
button.primary:hover { background: #c9e5c5; color: #132216; }
.primary svg { width: 22px; height: 22px; }
.sound { grid-column: 3; justify-self: end; min-width: 0; }
.sound > button { width: 30px; height: 32px; color: #829487; }
.sound > button[aria-expanded=true] { background: #202a22; color: var(--accent); }
.volume-panel { position: absolute; right: 0; bottom: 58px; display: flex; align-items: center; gap: 8px; width: 168px; max-width: 100%; padding: 7px 10px; border: 1px solid #3b4c3e; border-radius: 8px; background: #171e19; box-shadow: 0 8px 24px #0006; z-index: 2; }
.volume-panel[hidden] { display: none; }
.volume { flex: 1 1 0%; width: 0; min-width: 0; margin: 0; }
.volume-panel button { width: 28px; height: 28px; }
.status { margin: 0; color: #adbba7; font-size: 11px; line-height: 1.6; overflow-wrap: anywhere; }
.status { min-height: 14px; font-size: 10px; line-height: 14px; }
@media (max-width: 320px) {
  .shell { padding: 10px 12px; gap: 6px; }
  .track { gap: 12px; }
  .art { width: 64px; height: 64px; flex-basis: 64px; }
  .title { font-size: 15px; }
  .artist { margin-top: 4px; font-size: 11px; }
  .transport { gap: 8px; }
  button.primary { width: 44px; height: 44px; }
}
@media (max-width: 240px) {
  .shell { padding: 10px; }
  .art { width: 54px; height: 54px; flex-basis: 54px; }
  .brand { font-size: 8px; letter-spacing: .08em; }
  .transport { gap: 4px; }
  .transport > button:not(.primary) { width: 28px; }
}
@media (max-height: 225px) {
  .shell { gap: 6px; padding-top: 10px; padding-bottom: 10px; }
  .art { max-width: 64px; max-height: 64px; flex-basis: 64px; }
  button.primary { width: 44px; height: 44px; }
}
@media (max-width: 240px) and (max-height: 225px) {
  .art { flex-basis: 54px; }
}
@media (max-height: 200px) {
 .shell { padding: 8px 12px; gap: 5px; }
 .header { height: 18px; }
 .art { width: 56px; height: 56px; flex-basis: 56px; max-width: 56px; max-height: 56px; }
 .track { gap: 12px; }
 .title { font-size: 14px; }
 .artist { font-size: 11px; margin-top: 3px; }
 .progress { gap: 2px; }
 .progress input { height: 12px; }
 .time { font-size: 9px; line-height: 10px; }
 button.primary { width: 40px; height: 40px; }
 .status { font-size: 9px; line-height: 12px; min-height: 12px; }
 .volume-panel { bottom: 46px; }
}
@media (max-height: 170px) {
 .shell { padding: 6px 10px; gap: 3px; }
 .art { width: 42px; height: 42px; flex-basis: 42px; }
 .header { height: 16px; }
 .header button { width: 24px; height: 24px; }
 .title { font-size: 13px; }
 button.primary { width: 36px; height: 36px; }
 .transport { gap: 8px; }
}
/* The native PiP can shrink far below the requested size. Keep every music control reachable without scroll. */
@media (max-height: 100px) {
 .shell { position: relative; padding: 4px; gap: 3px; }
 .header { display: none; }
 .track { gap: 6px; padding-right: 104px; min-height: 28px; }
 .art { width: 28px; height: 28px; flex-basis: 28px; border-radius: 3px; }
 .title { font-size: 11px; line-height: 14px; }
 .artist { font-size: 9px; line-height: 12px; margin: 0; }
 .progress { flex-direction: row; align-items: center; gap: 7px; height: 14px; }
 .times { flex: 0 0 68px; gap: 4px; }
 .seek { flex: 1 1 0%; width: 0; height: 12px; }
 .time { font-size: 8px; line-height: 12px; }
 .controls { position: absolute; top: 4px; right: 4px; display: flex; gap: 0; }
 .transport { gap: 0; }
 .transport > button:not(.primary) { width: 24px; height: 28px; }
 button.primary { width: 28px; height: 28px; }
 .primary svg { width: 17px; height: 17px; }
 .sound > button { width: 24px; height: 28px; }
 .volume-panel { position: fixed; top: 4px; right: 4px; bottom: auto; width: 168px; height: 40px; max-width: calc(100% - 8px); }
 .status { position: absolute; left: 4px; right: 4px; bottom: 4px; min-height: 12px; height: 12px; line-height: 12px; font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
 .status:empty { display: none; }
 .shell:has(.status:not(:empty)) .progress { visibility: hidden; }
}
@media (prefers-reduced-motion: no-preference) { button { transition: background .14s, color .14s; } }
`;

const paths = {
  play: 'M9 5.5v13l10-6.5z',
  pause: 'M7 5h3.5v14H7zm6.5 0H17v14h-3.5z',
  previous: 'M5 5h2v14H5zm13 0v14L8 12z',
  next: 'M17 5h2v14h-2zM6 5v14l10-7z',
  sound: 'M3 9v6h4l5 4V5L7 9zm12-1.5v2a3.5 3.5 0 010 5v2a5.5 5.5 0 000-9zm3-3v2.1a7.5 7.5 0 010 10.8v2.1a9.5 9.5 0 000-15z',
  muted: 'M3 9v6h4l5 4V5L7 9zm12-.4L17.4 11 15 13.4l1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4-2.4-2.4 2.4-2.4-1.4-1.4-2.4 2.4-2.4-2.4z',
  close: 'M6.7 5.3L12 10.6l5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3z',
  return: 'M13 4h7v7h-2V7.4l-7.3 7.3-1.4-1.4L16.6 6H13zM4 6h6v2H6v10h10v-4h2v6H4z',
};
type Icon = keyof typeof paths;

export function mountPlayer(win: Window, adapter: MusicAdapter, onReturn: () => void) {
  const doc = win.document;
  doc.documentElement.lang = 'ja';
  doc.title = 'MusicDock Mini 2.0.1';
  const style = doc.createElement('style');
  style.textContent = playerCSS;
  doc.head.append(style);

  function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') {
    const node = doc.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }
  function icon(button: HTMLButtonElement, name: Icon) {
    if (button.dataset.icon === name) return;
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('fill', 'currentColor');
    const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', paths[name]);
    svg.append(path);
    button.replaceChildren(svg);
    button.dataset.icon = name;
  }
  function button(label: string, name: Icon, run: () => void, className = '') {
    const node = el('button', className);
    node.type = 'button';
    node.setAttribute('aria-label', label);
    node.title = label;
    icon(node, name);
    node.addEventListener('click', run);
    return node;
  }

  const shell = el('main', 'shell');
  shell.setAttribute('aria-label', 'MusicDock Mini プレイヤー');
  const header = el('header', 'header');
  header.append(el('span', 'brand', 'MUSICDOCK MINI'), button('YouTube Musicに戻る', 'return', onReturn), button('閉じる', 'close', () => win.close()));
  const track = el('section', 'track');
  const art = el('div', 'art');
  const cover = el('canvas', 'cover');
  const meta = el('div', 'meta');
  const title = el('div', 'title');
  const artist = el('div', 'artist');
  cover.width = cover.height = 160;
  cover.setAttribute('role', 'img');
  cover.setAttribute('aria-label', 'アルバムジャケット');
  art.append(cover);
  meta.append(title, artist);
  track.append(art, meta);

  const progress = el('section', 'progress');
  const seek = el('input', 'seek');
  seek.type = 'range'; seek.min = '0'; seek.step = '1';
  seek.setAttribute('aria-label', '再生位置');
  const times = el('div', 'times');
  const current = el('span', 'time current');
  const duration = el('span', 'time');
  times.append(current, duration);
  progress.append(times, seek);

  let dragging = false, cooldown = 0, message = '', messageUntil = 0, drawnCover = '', displayedTrackKey = '', scrubTrackKey = '';
  const status = el('p', 'status');
  status.setAttribute('role', 'status');
  function report(text: string) { message = text; messageUntil = Date.now() + 3000; status.textContent = text; }
  function act(action: Action) {
    if (Date.now() < cooldown) return;
    cooldown = Date.now() + 250;
    if (!adapter.act(action)) report('この操作は現在利用できません');
    render();
  }
  const controls = el('nav', 'controls');
  controls.setAttribute('aria-label', '再生操作');
  const transport = el('div', 'transport');
  const prev = button('前の曲', 'previous', () => act('previous'));
  const toggle = button('再生', 'play', () => act('toggle'), 'primary');
  const next = button('次の曲', 'next', () => act('next'));
  transport.append(prev, toggle, next);

  const sound = el('div', 'sound');
  const volumePanel = el('div', 'volume-panel');
  volumePanel.id = 'musicdock-volume'; volumePanel.hidden = true;
  volumePanel.setAttribute('role', 'group'); volumePanel.setAttribute('aria-label', '音量設定');
  const soundToggle = button('音量調整', 'sound', () => setVolumeOpen(volumePanel.hidden !== false));
  soundToggle.setAttribute('aria-controls', volumePanel.id);
  soundToggle.setAttribute('aria-expanded', 'false');
  const mute = button('ミュート', 'sound', () => { adapter.mute(); render(); });
  const volume = el('input', 'volume');
  volume.type = 'range'; volume.min = '0'; volume.max = '1'; volume.step = '.05';
  volume.setAttribute('aria-label', '音量');
  volume.addEventListener('input', () => { adapter.volume(Number(volume.value)); render(); });
  volumePanel.append(mute, volume);
  sound.append(soundToggle, volumePanel);
  controls.append(transport, sound);
  shell.append(header, track, progress, controls, status);
  doc.body.append(shell);

  function setVolumeOpen(open: boolean) {
    volumePanel.hidden = !open;
    soundToggle.setAttribute('aria-expanded', String(open));
  }
  doc.addEventListener('click', event => { if (!event.composedPath().includes(sound)) setVolumeOpen(false); });
  seek.addEventListener('input', () => {
    if (!dragging) scrubTrackKey = displayedTrackKey;
    dragging = true;
    current.textContent = formatTime(Number(seek.value));
    seek.style.setProperty('--fill', `${Number(seek.value) / Number(seek.max) * 100}%`);
  });
  seek.addEventListener('change', () => {
    if (!adapter.seek(Number(seek.value), scrubTrackKey)) report('この再生位置へ移動できません');
    dragging = false; scrubTrackKey = ''; render();
  });
  seek.addEventListener('blur', () => { dragging = false; });
  doc.addEventListener('keydown', event => {
    if (event.code === 'Escape' && !volumePanel.hidden) {
      event.preventDefault(); setVolumeOpen(false); soundToggle.focus(); return;
    }
    if (event.target instanceof win.HTMLInputElement || event.target instanceof win.HTMLButtonElement) return;
    if (event.code === 'Space') { event.preventDefault(); act('toggle'); }
    else if (event.code === 'ArrowRight') { event.preventDefault(); const s=adapter.snapshot(); adapter.seek(s.current+5,s.trackKey); }
    else if (event.code === 'ArrowLeft') { event.preventDefault(); const s=adapter.snapshot(); adapter.seek(s.current-5,s.trackKey); }
    else if (event.code === 'Escape') win.close();
  });

  function render() {
    const state = adapter.snapshot();
    if (displayedTrackKey !== state.trackKey) { dragging = false; }
    displayedTrackKey = state.trackKey;
    title.textContent = state.title || '曲を選んでください'; title.title = state.title;
    artist.textContent = state.artist || 'YouTube Music'; artist.title = state.artist;
    // Reuse the loaded artwork, crop centrally, never read back pixels or fetch again.
    const source = adapter.coverElement();
    if (state.cover !== drawnCover) { cover.getContext('2d')?.clearRect(0, 0, 160, 160); cover.removeAttribute('data-ready'); drawnCover = ''; }
    if (state.cover && state.cover !== drawnCover && source?.complete && source.naturalWidth) {
      try {
        const side = Math.min(source.naturalWidth, source.naturalHeight);
        cover.getContext('2d')?.drawImage(source, (source.naturalWidth - side) / 2, (source.naturalHeight - side) / 2, side, side, 0, 0, 160, 160);
        drawnCover = state.cover; cover.setAttribute('data-ready', 'true');
      } catch { /* Neutral artwork placeholder remains available. */ }
    }
    icon(toggle, state.playing ? 'pause' : 'play');
    const playLabel = state.playing ? '一時停止' : '再生';
    toggle.setAttribute('aria-label', playLabel); toggle.title = playLabel;
    prev.disabled = !adapter.available('previous'); toggle.disabled = !adapter.available('toggle'); next.disabled = !adapter.available('next');
    current.textContent = dragging ? formatTime(Number(seek.value)) : formatTime(state.current);
    duration.textContent = formatTime(state.duration);
    seek.disabled = !state.canSeek;
    seek.max = String(Number.isFinite(state.duration) ? state.duration : 100);
    if (!dragging) seek.value = String(Number.isFinite(state.current) ? Math.min(state.current, Number(seek.max)) : 0);
    seek.style.setProperty('--fill', `${Number(seek.value) / Number(seek.max) * 100}%`);
    mute.disabled = volume.disabled = soundToggle.disabled = !state.hasMedia;
    icon(mute, state.muted ? 'muted' : 'sound'); icon(soundToggle, state.muted ? 'muted' : 'sound');
    mute.setAttribute('aria-label', state.muted ? 'ミュート解除' : 'ミュート'); mute.title = state.muted ? 'ミュート解除' : 'ミュート';
    mute.setAttribute('aria-pressed', String(state.muted));
    if (doc.activeElement !== volume) volume.value = String(state.volume);
    volume.style.setProperty('--fill', `${state.volume * 100}%`);
    // Ordinary playback is already conveyed by the play/pause button. Reserve text for actionable states.
    status.textContent = Date.now() < messageUntil ? message : ['再生中', '一時停止'].includes(state.status) ? '' : state.status;
    status.title = status.textContent;
  }
  render();
  return {render, report};
}
