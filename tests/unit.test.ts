import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
import {MusicAdapter,formatTime,clampSeek,safeCover,parseClock} from '../apps/extension/src/adapter';
let adapter:MusicAdapter;
function media(current=26,duration=150,src='https://media.invalid/a') {
 const m=document.createElement('video');m.src=src;
 Object.defineProperties(m,{currentTime:{value:current,writable:true,configurable:true},duration:{value:duration,configurable:true},readyState:{value:4,configurable:true},paused:{value:true,configurable:true},seekable:{value:{length:1,start:()=>0,end:()=>duration},configurable:true}});
 document.getElementById('movie_player')!.append(m);return m;
}
function settle() {adapter.snapshot();vi.advanceTimersByTime(650);return adapter.snapshot();}
beforeEach(()=>{
 vi.useFakeTimers();
 document.body.innerHTML='<ytmusic-player-bar><span class="title">All I Need</span><span class="byline"><a href="channel/artist">Kohjiya</a> • TIMELESS • 2026年</span><span class="time-info">0:26 / 2:30</span><div id="thumbnail"><img src="https://lh3.googleusercontent.com/cover"></div><yt-icon-button class="previous-button"><button></button></yt-icon-button><yt-icon-button class="play-pause-button" title="一時停止"><button aria-label="一時停止"></button></yt-icon-button><yt-icon-button class="next-button"><button></button></yt-icon-button><div id="progress-bar" aria-valuenow="26" aria-valuemax="150"></div></ytmusic-player-bar><div id="movie_player"></div>';
 adapter=new MusicAdapter(document);
});
afterEach(()=>vi.useRealTimers());
describe('coherent DOM adapter',()=>{
 it('reproduces the exact stale 3:25/4:18 bug without copying stale values',()=>{
  const stale=media(205,258);const s=settle();expect(s.current).toBe(26);expect(s.duration).toBe(150);expect(s.hasMedia).toBe(false);expect(s.canSeek).toBe(false);expect(adapter.seek(30)).toBe(false);expect(stale.currentTime).toBe(205);
 });
 it('chooses a unique matching current resource, not the first media element',()=>{
  const stale=media(205,258),active=media();const s=settle();expect(adapter.media()).toBe(active);expect(s.canSeek).toBe(true);expect(adapter.seek(30,s.trackKey)).toBe(true);expect(active.currentTime).toBe(30);expect(stale.currentTime).toBe(205);
 });
 it('rejects a stale candidate with equal duration but the wrong position',()=>{
  media(100,150);media(26,150,'https://media.invalid/b');expect(settle().hasMedia).toBe(true);expect(adapter.media()!.currentTime).toBe(26);
 });
 it('disables rather than sorts ambiguous matching candidates',()=>{media();media(26,150,'https://media.invalid/b');expect(settle().hasMedia).toBe(false);expect(adapter.volume(.5)).toBe(false);expect(adapter.mute()).toBe(false);});
 it('never falls back to media when the time bar disappears',()=>{media();settle();document.querySelector('.time-info')!.remove();expect(Number.isNaN(adapter.snapshot().duration)).toBe(true);expect(adapter.seek(20)).toBe(false);expect(adapter.media()).toBeNull();});
 it('rejects contradictory clock and slider values',()=>{media();document.getElementById('progress-bar')!.setAttribute('aria-valuenow','80');expect(settle().hasMedia).toBe(false);});
 it('accepts the observed service rounding (3:41 bar vs 220 media seconds)',()=>{
  media(57.64,220);document.querySelector('.time-info')!.textContent='0:57 / 3:41';document.getElementById('progress-bar')!.setAttribute('aria-valuenow','57');document.getElementById('progress-bar')!.setAttribute('aria-valuemax','221');const state=settle();expect(state.hasMedia).toBe(true);expect(adapter.seek(221,state.trackKey)).toBe(true);
 });
 it('requires stable identity and a resource event after a title switch',()=>{
  const m=media();const before=settle();document.querySelector('.title')!.textContent='Another song with equal timing';
  vi.advanceTimersByTime(2000);expect(adapter.snapshot().hasMedia).toBe(false);expect(Number.isNaN(adapter.snapshot().current)).toBe(true);
  m.dispatchEvent(new Event('loadedmetadata'));expect(settle().hasMedia).toBe(true);expect(adapter.seek(40,before.trackKey)).toBe(false);expect(m.currentTime).toBe(26);
 });
 it('recovers when SPA replaces the active native element',()=>{const old=media();settle();old.remove();media(26,150,'https://media.invalid/b');expect(adapter.snapshot().hasMedia).toBe(false);expect(settle().hasMedia).toBe(true);});
 it('ignores hidden and advertising containers',()=>{const ad=media();document.getElementById('movie_player')!.classList.add('ad-showing');expect(settle().hasMedia).toBe(false);expect(adapter.seek(1)).toBe(false);expect(ad.currentTime).toBe(26);});
 it('honors wrapper and inner-button disabled/inert state',()=>{expect(adapter.available('next')).toBe(true);document.querySelector('.next-button button')!.setAttribute('disabled','');expect(adapter.act('next')).toBe(false);document.querySelector('ytmusic-player-bar')!.setAttribute('inert','');expect(adapter.bar()).toBeNull();});
 it('extracts relative channel links and keeps album/year out',()=>{expect(adapter.snapshot().artist).toBe('Kohjiya');document.querySelector('.byline')!.innerHTML='<a href="/channel/a">Artist A</a> &amp; <a href="channel/b">Artist B</a> • <a href="browse/album">Album</a> • 2026';expect(adapter.snapshot().artist).toBe('Artist A / Artist B');});
 it('blocks direct operations while the binding is settling',()=>{media();expect(adapter.snapshot().canSeek).toBe(false);expect(adapter.seek(4)).toBe(false);expect(adapter.volume(.3)).toBe(false);expect(settle().canSeek).toBe(true);expect(adapter.volume(.3)).toBe(true);});
 it('invalidates native controls immediately after next/previous',()=>{media();settle();const spy=vi.spyOn(adapter.button('next')!,'click');expect(adapter.act('next')).toBe(true);expect(spy).toHaveBeenCalledOnce();expect(adapter.snapshot().canSeek).toBe(false);});
 it('uses fresh targets and refuses non-seekable gaps and out of range values',()=>{const m=media();Object.defineProperty(m,'seekable',{value:{length:1,start:()=>10,end:()=>90}});const s=settle();expect(adapter.seek(0,s.trackKey)).toBe(false);expect(adapter.seek(NaN,s.trackKey)).toBe(false);expect(adapter.seek(30,s.trackKey)).toBe(true);});
 it('keeps title and cover; never selects previews outside #movie_player',()=>{const other=document.createElement('video');document.body.append(other);expect(adapter.snapshot().title).toBe('All I Need');expect(adapter.snapshot().cover).toContain('googleusercontent.com');expect(adapter.media()).toBeNull();});
 it('supports mute and finite volume on a matched resource',()=>{const m=media();settle();expect(adapter.mute()).toBe(true);expect(m.muted).toBe(true);expect(adapter.volume(2)).toBe(true);expect(m.volume).toBe(1);expect(adapter.volume(NaN)).toBe(false);});
});
describe('numeric and URL boundaries',()=>{
 it.each([[0,'0:00'],[65,'1:05'],[3661,'1:01:01'],[NaN,'—:—'],[Infinity,'—:—'],[-1,'—:—']])('formats %s',(value,result)=>expect(formatTime(value as number)).toBe(result));
 it.each([['2:30',150],['1:02:03',3723],['1:99',null],['LIVE',null],['Infinity',null]])('parses %s',(value,result)=>expect(parseClock(value as string)).toBe(result));
 it('clamps finite seek positions',()=>{expect(clampSeek(-3,100)).toBe(0);expect(clampSeek(200,100)).toBe(100);expect(clampSeek(NaN,100)).toBeNull();expect(clampSeek(1,Infinity)).toBeNull();});
 it('rejects unsafe artwork schemes and deceptive hosts',()=>{for(const u of ['javascript:alert(1)','http://i.ytimg.com/a','https://ytimg.com.evil.test/a','https://evil.test/a',''])expect(safeCover(u)).toBe('');});
});

// Latency regressions retain conservative resource/clock matching.
describe('synchronization latency',()=>{
 it('binds a fresh coherent source within 200ms',()=>{media();expect(adapter.snapshot().hasMedia).toBe(false);vi.advanceTimersByTime(199);expect(adapter.snapshot().hasMedia).toBe(false);vi.advanceTimersByTime(1);expect(adapter.snapshot().canSeek).toBe(true);});
 it('does not restart settling after a short clock mismatch',()=>{const m=media();adapter.snapshot();vi.advanceTimersByTime(150);m.currentTime=30;expect(adapter.snapshot().hasMedia).toBe(false);vi.advanceTimersByTime(50);m.currentTime=26;expect(adapter.snapshot().canSeek).toBe(true);});
 it('keeps a verified binding while cover and artist metadata hydrate',()=>{media();document.querySelector('.title')!.innerHTML='<a href="/watch?v=stable">All I Need</a>';const before=settle();document.querySelector('#thumbnail img')!.setAttribute('src','https://lh3.googleusercontent.com/new-cover');document.querySelector('.byline a')!.textContent='Updated artist credit';const after=adapter.snapshot();expect(after.canSeek).toBe(true);expect(after.trackKey).toBe(before.trackKey);expect(after.artist).toBe('Updated artist credit');});
 it('still requires a new resource event for a different video with the same title',()=>{const m=media();document.querySelector('.title')!.innerHTML='<a href="/watch?v=first">All I Need</a>';const before=settle();document.querySelector('.title a')!.setAttribute('href','/watch?v=second');expect(adapter.snapshot().canSeek).toBe(false);m.dispatchEvent(new Event('loadedmetadata'));expect(settle().canSeek).toBe(true);expect(adapter.seek(30,before.trackKey)).toBe(false);});
 it('signals source media events within 50ms and detaches on close',async()=>{const m=media();const update=vi.fn();const stop=adapter.watch(update);m.dispatchEvent(new Event('timeupdate',{bubbles:false}));vi.advanceTimersByTime(49);expect(update).not.toHaveBeenCalled();vi.advanceTimersByTime(1);expect(update).toHaveBeenCalledOnce();stop();m.dispatchEvent(new Event('timeupdate'));vi.advanceTimersByTime(500);expect(update).toHaveBeenCalledOnce();});
});
