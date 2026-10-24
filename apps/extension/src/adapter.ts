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
  const parts = value.split(':').map(Number);
  return parts.slice(1).some(x => x >= 60) ? null : parts.reduce((a,b) => a*60+b,0);
}
export type Action = 'previous' | 'toggle' | 'next';
type Timing = {current:number; duration:number};
type Resource = {src:string; epoch:number; id:number};
type Binding = {key:string; media:HTMLMediaElement; src:string; epoch:number; token:string};

/** DOM adapter: visible bar is the clock authority; native media is an optional, verified control target. */
export class MusicAdapter {
  private resources = new WeakMap<HTMLMediaElement,Resource>();
  private binding: Binding | null = null;
  private pendingSignature = '';
  private pendingSince = 0;
  private transitionUntil = 0;
  private serial = 0;
  constructor(private doc:Document, private settleMs = 200) {}
  bar() {
    return [...this.doc.querySelectorAll('ytmusic-player-bar')].find(bar => !bar.closest('[inert], [hidden], [aria-hidden="true"]')) ?? null;
  }
  coverElement() { return this.bar()?.querySelector<HTMLImageElement>('#thumbnail img, img.image') ?? null; }
  artistName() {
    const byline = this.bar()?.querySelector('.byline, .subtitle');
    if (!byline) return '';
    const artists = [...byline.querySelectorAll('a[href*="/channel/"], a[href^="channel/"]')].map(a => clean(a.textContent)).filter(Boolean);
    return artists.length ? [...new Set(artists)].join(' / ') : clean(byline.querySelector('a')?.textContent || byline.textContent?.split(/[•·]/)[0]);
  }
  barTiming(bar = this.bar()): Timing | null {
    const raw = clean(bar?.querySelector('.time-info')?.textContent);
    const parts = raw.match(/^(\d{1,3}:\d{2}(?::\d{2})?)\s*\/\s*(\d{1,3}:\d{2}(?::\d{2})?)$/);
    if (!parts) return null;
    const current = parseClock(parts[1]), duration = parseClock(parts[2]);
    return current === null || duration === null || duration <= 0 || current > duration ? null : {current,duration};
  }
  button(action:Action): HTMLElement | null {
    const names = {previous:'.previous-button, #previous-button',toggle:'.play-pause-button, #play-pause-button',next:'.next-button, #next-button'};
    const wrapper = this.bar()?.querySelector<HTMLElement>(names[action]);
    return wrapper?.querySelector<HTMLElement>('button') ?? wrapper ?? null;
  }
  available(action:Action) {
    const bar = this.bar(), button = this.button(action);
    return !!bar && !!clean(bar.querySelector('.title, #title')?.textContent) && !!button && !button.closest('[disabled], [aria-disabled="true"], [inert], [hidden]');
  }
  private resource(media:HTMLMediaElement) {
    let record = this.resources.get(media);
    const src = media.currentSrc || media.getAttribute('src') || '';
    if (!record) {
      record = {src,epoch:0,id:++this.serial};
      this.resources.set(media,record);
      for (const event of ['loadstart','emptied','loadedmetadata']) media.addEventListener(event,()=>{
        const state = this.resources.get(media);
        if (state) { state.epoch++; state.src = media.currentSrc || media.getAttribute('src') || ''; }
      });
    } else if (record.src !== src) { record.src = src; record.epoch++; }
    return record;
  }
  private resolve() {
    const bar = this.bar(), timing = this.barTiming(bar);
    const title = clean(bar?.querySelector('.title, #title')?.textContent);
    const image = this.coverElement();
    const cover = safeCover(image?.currentSrc || image?.src || '');
    // Artwork/artist presentation can hydrate independently of the playing resource.
    const href = bar?.querySelector<HTMLAnchorElement>('.title a[href], a.title[href]')?.getAttribute('href');
    let videoId = ''; try { videoId = href ? new URL(href,'https://music.youtube.com').searchParams.get('v') || '' : ''; } catch { /* Title remains the fallback identity. */ }
    const key = JSON.stringify([title,videoId || this.artistName()]);
    const fail = (reason:string) => {return {bar,timing,title,cover,key,media:null as HTMLMediaElement|null,token:'',reason};};
    if (!bar) return fail('YouTube Musicの再生バーを確認してください');
    if (!title) return fail('YouTube Musicで曲を選んでください');
    if (!timing) return fail('再生時間を取得できません');
    if (Date.now() < this.transitionUntil) return fail('曲を切り替えています…');
    // Cross-check the progress widget when present. Never combine two inconsistent bar snapshots.
    const slider = bar.querySelector('#progress-bar');
    const now = slider?.getAttribute('aria-valuenow'), max = slider?.getAttribute('aria-valuemax');
    if (now !== null && now !== undefined && max !== null && max !== undefined &&
        (!Number.isFinite(Number(now)) || !Number.isFinite(Number(max)) || Math.abs(Number(now)-timing.current)>1.5 || Math.abs(Number(max)-timing.duration)>1.5)) return fail('再生情報の更新を待っています…');
    const candidates = [...this.doc.querySelectorAll<HTMLMediaElement>('#movie_player video, #movie_player audio')];
    const matching = candidates.filter(media => {
      const resource = this.resource(media);
      return media.isConnected && !media.closest('[hidden], [inert], [aria-hidden="true"], .ad-showing, .ad-interrupting') &&
        !!resource.src && !media.error && media.readyState >= 1 && Number.isFinite(media.duration) && Number.isFinite(media.currentTime) &&
        Math.abs(media.duration-timing.duration)<=1.5 && Math.abs(media.currentTime-timing.current)<=1.5;
    });
    if (matching.length !== 1) return fail(matching.length ? '操作対象を特定できません' : '再生情報の同期を確認中…');
    const media = matching[0], resource = this.resource(media);
    const old = this.binding;
    // A title change alone cannot rebind an unchanged resource, even for equal-length songs.
    if (old && old.key !== key && old.media === media && old.src === resource.src && old.epoch === resource.epoch) return fail('曲と音声の更新を待っています…');
    const signature = JSON.stringify([key,resource.id,resource.src,resource.epoch]);
    if (this.pendingSignature !== signature) { this.pendingSignature=signature; this.pendingSince=Date.now(); }
    if (Date.now()-this.pendingSince < this.settleMs) return {bar,timing,title,cover,key,media:null,token:'',reason:'再生情報の同期を確認中…'};
    if (!old || old.key !== key || old.media !== media || old.src !== resource.src || old.epoch !== resource.epoch) {
      this.binding={key,media,src:resource.src,epoch:resource.epoch,token:String(++this.serial)};
    }
    return {bar,timing,title,cover,key,media,token:this.binding!.token,reason:''};
  }
  /** Update on relevant DOM/media events; polling remains a recovery fallback. */
  watch(update:()=>void) {
    let queued:ReturnType<typeof setTimeout>|undefined;
    const schedule=()=>{ if(queued===undefined) queued=setTimeout(()=>{queued=undefined;update();},50); };
    const observer=new MutationObserver(records=>{
      if(records.some(r=>{const el=r.target instanceof Element?r.target:r.target.parentElement;return !!el?.closest('ytmusic-player-bar, #movie_player') || [...r.addedNodes].some(n=>n instanceof Element && (n.matches('ytmusic-player-bar, #movie_player')||!!n.querySelector('ytmusic-player-bar, #movie_player')));})) schedule();
    });
    observer.observe(this.doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['href','src','aria-valuenow','aria-valuemax','aria-label','disabled','title']});
    const events=['timeupdate','durationchange','loadedmetadata','play','pause','seeking','seeked','volumechange','emptied'];
    const onMedia=(event:Event)=>{if(event.target instanceof HTMLMediaElement && event.target.closest('#movie_player'))schedule();};
    for(const event of events)this.doc.addEventListener(event,onMedia,true);
    return ()=>{observer.disconnect();clearTimeout(queued);for(const event of events)this.doc.removeEventListener(event,onMedia,true);};
  }
  media() { return this.resolve().media; }
  snapshot() {
    const state = this.resolve(), media = state.media;
    const button = this.button('toggle');
    const label = `${button?.getAttribute('aria-label') || ''} ${button?.getAttribute('title') || ''} ${button?.parentElement?.getAttribute('title') || ''}`;
    const playing = /pause|一時停止/i.test(label) ? true : /play|再生/i.test(label) ? false : !!media && !media.paused && !media.ended;
    const hasRange=!!media && Array.from({length:media.seekable.length},(_,i)=>media.seekable.end(i)>media.seekable.start(i)).some(Boolean);
    const displayTiming=this.binding && this.binding.key!==state.key ? null : state.timing;
    const slider = state.bar?.querySelector('#progress-bar');
    return {title:state.title,artist:this.artistName(),cover:state.cover,current:displayTiming?.current ?? NaN,duration:displayTiming?.duration ?? NaN,
      playing,status:state.reason || (media && !media.paused && media.readyState<3 ? '読み込み中…' : playing?'再生中':'一時停止'),
      volume:media?.volume ?? 1,muted:media?.muted ?? false,hasMedia:!!media,canSeek:hasRange && slider?.getAttribute('aria-disabled')!=='true' && !slider?.hasAttribute('hidden'),trackKey:state.token};
  }
  act(action:Action) {
    if (!this.available(action)) return false;
    if (action !== 'toggle') { this.transitionUntil=Date.now()+150; this.pendingSignature=''; }
    this.button(action)!.click(); return true;
  }
  seek(value:number, expectedTrackKey?:string) {
    const state = this.resolve(), media = state.media;
    const target = clampSeek(value,Math.min(state.timing?.duration ?? NaN,media?.duration ?? NaN));
    if (!media || !state.token || (expectedTrackKey !== undefined && expectedTrackKey !== state.token) || target === null || !this.snapshot().canSeek) return false;
    for (let i=0;i<media.seekable.length;i++) if (target>=media.seekable.start(i) && target<=Math.min(media.seekable.end(i),media.duration)) {
      try {media.currentTime=target;return true;} catch {return false;}
    }
    return false;
  }
  volume(value:number) {const media=this.media();if(!media||!Number.isFinite(value))return false;media.volume=Math.max(0,Math.min(1,value));return true;}
  mute() {const media=this.media();if(!media)return false;media.muted=!media.muted;return true;}
}
