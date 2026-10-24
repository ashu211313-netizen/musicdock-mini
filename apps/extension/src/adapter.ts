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
export function parseClock(value: string): number | null {
  if (!/^\d{1,3}:\d{2}(?::\d{2})?$/.test(value)) return null;
  const parts=value.split(':').map(Number);
  if(parts.slice(1).some(x=>x>=60))return null;
  return parts.reduce((a,b)=>a*60+b,0);
}
export type Action = 'previous' | 'toggle' | 'next';
export class MusicAdapter {
  constructor(private doc: Document) {}
  bar() { return this.doc.querySelector('ytmusic-player-bar'); }
  coverElement() { return this.bar()?.querySelector<HTMLImageElement>('#thumbnail img, img.image') ?? null; }
  barTiming() {
    const raw=clean(this.bar()?.querySelector('.time-info')?.textContent);
    const parts=raw.match(/(\d{1,3}:\d{2}(?::\d{2})?)\s*\/\s*(\d{1,3}:\d{2}(?::\d{2})?)/);
    if(!parts)return null;
    const current=parseClock(parts[1]),duration=parseClock(parts[2]);
    return current===null||duration===null||duration<=0?null:{current,duration};
  }
  media(): HTMLMediaElement | null {
    const candidates=Array.from(this.doc.querySelectorAll<HTMLMediaElement>('#movie_player video, #player video, ytmusic-player video, ytmusic-player audio'));
    const timing=this.barTiming();
    if(!timing)return candidates.find(m=>!m.paused&&Number.isFinite(m.duration))??candidates[0]??null;
    // A stale video may continue to expose an unrelated track's duration.
    return candidates.filter(m=>Number.isFinite(m.duration)&&Math.abs(m.duration-timing.duration)<=1.5)
      .sort((a,b)=>Math.abs(a.currentTime-timing.current)-Math.abs(b.currentTime-timing.current))[0]??null;
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
    const bar = this.bar(), timing = this.barTiming(), media = this.media();
    const image = this.coverElement();
    const title = clean(bar?.querySelector('.title, #title')?.textContent);
    const label = `${this.button('toggle')?.getAttribute('aria-label') || ''} ${this.button('toggle')?.title || ''}`;
    const duration=timing?.duration??(media&&Number.isFinite(media.duration)&&media.duration>0?media.duration:NaN);
    const current=timing?.current??(media&&Number.isFinite(media.currentTime)?Math.max(0,media.currentTime):NaN);
    const pauseLabel=/pause|一時停止/i.test(label),playLabel=/play|再生/i.test(label);
    const playing=timing?(pauseLabel?true:playLabel?false:!!media&&!media.paused&&!media.ended)
      :(media?!media.paused&&!media.ended:pauseLabel);
    const status = !bar ? '操作対象が見つかりません。元タブを確認してください' : media?.error ? '再生エラー。元タブで再試行してください' : !title ? 'YouTube Musicで曲を選んでください' : media && !media.paused && media.readyState < 3 ? '読み込み中…' : playing ? '再生中' : '一時停止';
    const hasSeekRange=!!media && Array.from({length:media.seekable.length},(_,i)=>media.seekable.end(i)>media.seekable.start(i)).some(Boolean);
    return {title,artist:clean(bar?.querySelector('.byline, .subtitle')?.textContent).split(/\s*[•·]\s*/)[0],cover:safeCover(image?.currentSrc || image?.src || ''),duration,current,playing,status,volume:media?.volume ?? 1,muted:media?.muted ?? false,hasMedia:!!media,canSeek:!!media && !media.error && Number.isFinite(duration) && hasSeekRange};
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
