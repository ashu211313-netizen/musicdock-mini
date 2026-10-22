export const clean = (text: string | null | undefined) => (text || '').replace(/\s+/g, ' ').trim();
export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—:—';
  const s = Math.floor(seconds);
  return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2,'0')}`;
}
export function clampSeek(value: number, duration: number) {
  return Number.isFinite(value) && Number.isFinite(duration) && duration > 0 ? Math.max(0,Math.min(value,duration)) : null;
}
export function safeCover(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && /(^|\.)(ytimg\.com|googleusercontent\.com|ggpht\.com)$/.test(url.hostname) ? url.href : ''; } catch { return ''; }
}
export type Action = 'previous' | 'toggle' | 'next';
export class MusicAdapter {
  constructor(private doc: Document) {}
  bar() { return this.doc.querySelector('ytmusic-player-bar'); }
  coverElement() { return this.bar()?.querySelector<HTMLImageElement>('#thumbnail img, img.image') ?? null; }
  media(): HTMLMediaElement | null {
    // Prefer the main player, never a preview video elsewhere on the page.
    return this.doc.querySelector<HTMLMediaElement>('#movie_player video, #player video, ytmusic-player video, ytmusic-player audio');
  }
  button(action: Action) {
    const selectors = {previous: '.previous-button, #previous-button',toggle: '.play-pause-button, #play-pause-button',next: '.next-button, #next-button'};
    return this.bar()?.querySelector<HTMLButtonElement>(selectors[action]) ?? null;
  }
  available(action: Action) {
    const b = this.button(action);
    return !!b && !b.disabled && !b.hasAttribute('disabled') && b.getAttribute('aria-disabled') !== 'true';
  }
  snapshot() {
    const bar = this.bar(), media = this.media();
    const image = this.coverElement();
    const title = clean(bar?.querySelector('.title, #title')?.textContent);
    const label = `${this.button('toggle')?.getAttribute('aria-label') || ''} ${this.button('toggle')?.title || ''}`;
    const duration = media && Number.isFinite(media.duration) && media.duration > 0 ? media.duration : NaN;
    const current = media && Number.isFinite(media.currentTime) ? Math.max(0,media.currentTime) : NaN;
    const playing = media ? !media.paused && !media.ended : /pause|一時停止/i.test(label);
    const status = !bar ? '操作対象が見つかりません。元タブを確認してください' : media?.error ? '再生エラー。元タブで再試行してください' : !title ? 'YouTube Musicで曲を選んでください' : media && !media.paused && media.readyState < 3 ? '読み込み中…' : playing ? '再生中' : '一時停止';
    const hasSeekRange=!!media && Array.from({length:media.seekable.length},(_,i)=>media.seekable.end(i)>media.seekable.start(i)).some(Boolean);
    return {title,artist:clean(bar?.querySelector('.byline, .subtitle')?.textContent),cover:safeCover(image?.currentSrc || image?.src || ''),duration,current,playing,status,volume:media?.volume ?? 1,muted:media?.muted ?? false,hasMedia:!!media,canSeek:!!media && !media.error && Number.isFinite(duration) && hasSeekRange};
  }
  act(action: Action) { if (!this.available(action)) return false; this.button(action)!.click(); return true; }
  seek(value: number) {
    const media = this.media(), target = clampSeek(value,media?.duration ?? NaN);
    if (!media || target === null || media.error || !media.seekable.length) return false;
    // Clamp to a real seekable interval (live streams and ads may have gaps).
    for (let i = 0; i < media.seekable.length; i++) if (target >= media.seekable.start(i) && target <= media.seekable.end(i)) {
      try { media.currentTime = target; return true; } catch { return false; }
    }
    return false;
  }
  volume(value: number) { const m = this.media(); if (!m || !Number.isFinite(value)) return false; m.volume = Math.max(0,Math.min(1,value)); return true; }
  mute() { const m = this.media(); if (!m) return false; m.muted = !m.muted; return true; }
}
