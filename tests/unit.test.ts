import {beforeEach,describe,expect,it,vi} from 'vitest';
import {MusicAdapter,formatTime,clampSeek,safeCover,parseClock} from '../apps/extension/src/adapter';
let adapter:MusicAdapter;
beforeEach(()=>{document.body.innerHTML='<ytmusic-player-bar><span class="title"> A  Song </span><span class="byline">Artist</span><div id="thumbnail"><img src="https://lh3.googleusercontent.com/cover"></div><button class="previous-button"></button><button class="play-pause-button" aria-label="Pause"></button><button class="next-button"></button></ytmusic-player-bar><div id="movie_player"><video></video></div>';adapter=new MusicAdapter(document);});
describe('media and DOM adapter',()=>{
  it('extracts current track and validated artwork',()=>{const s=adapter.snapshot();expect(s.title).toBe('A Song');expect(s.artist).toBe('Artist');expect(s.cover).toContain('googleusercontent.com');});
  it('uses media state over translated labels',()=>{expect(adapter.snapshot().playing).toBe(false);Object.defineProperty(adapter.media(),'paused',{value:false});Object.defineProperty(adapter.media(),'ended',{value:false});expect(adapter.snapshot().playing).toBe(true);});
  it('uses label only when media is absent',()=>{adapter.media()!.remove();expect(adapter.snapshot().playing).toBe(true);});
  it('does not operate when DOM is absent',()=>{document.body.replaceChildren();expect(adapter.act('next')).toBe(false);expect(adapter.seek(4)).toBe(false);expect(adapter.snapshot().status).toContain('見つかりません');});
  it('supports fallback selectors',()=>{document.querySelector('.title')!.className='';document.querySelector('span')!.id='title';document.querySelector('.next-button')!.id='next-button';document.querySelector('.next-button')!.className='';expect(adapter.snapshot().title).toBe('A Song');expect(adapter.available('next')).toBe(true);});
  it('honors disabled actions',()=>{adapter.button('next')!.setAttribute('aria-disabled','true');const click=vi.spyOn(adapter.button('next')!,'click');expect(adapter.act('next')).toBe(false);expect(click).not.toHaveBeenCalled();});
  it('calls real button once',()=>{const click=vi.spyOn(adapter.button('toggle')!,'click');expect(adapter.act('toggle')).toBe(true);expect(click).toHaveBeenCalledTimes(1);});
  it('does not pick unrelated preview media',()=>{document.getElementById('movie_player')!.remove();document.body.append(document.createElement('video'));expect(adapter.media()).toBeNull();});
  it('ignores stale video timing and uses the visible player bar',()=>{
    const bar=document.querySelector('ytmusic-player-bar')!;
    bar.insertAdjacentHTML('beforeend','<span class="time-info">0:26 / 2:30</span>');
    bar.querySelector('.byline')!.textContent='Kohjiya • TIMELESS • 2026年';
    const stale=document.querySelector('video')!;
    Object.defineProperty(stale,'duration',{value:258,configurable:true});
    Object.defineProperty(stale,'currentTime',{value:205,configurable:true});
    expect(adapter.media()).toBeNull();
    const snap=adapter.snapshot();
    expect(snap.current).toBe(26);expect(snap.duration).toBe(150);
    expect(snap.artist).toBe('Kohjiya');expect(snap.canSeek).toBe(false);
    expect(adapter.seek(30)).toBe(false);
  });
  it('parses progress time safely',()=>{
    expect(parseClock('2:30')).toBe(150);expect(parseClock('1:02:03')).toBe(3723);
    expect(parseClock('1:99')).toBeNull();expect(parseClock('LIVE')).toBeNull();
  });
  it('handles unknown duration',()=>{expect(Number.isNaN(adapter.snapshot().duration)).toBe(true);expect(adapter.snapshot().canSeek).toBe(false);});
  it('seeks only within available intervals',()=>{const m=adapter.media()!;Object.defineProperty(m,'duration',{value:100});Object.defineProperty(m,'seekable',{value:{length:1,start:()=>10,end:()=>90}});expect(adapter.seek(30)).toBe(true);expect(m.currentTime).toBe(30);expect(adapter.seek(0)).toBe(false);expect(adapter.seek(NaN)).toBe(false);});
  it('controls volume and mute with finite values',()=>{expect(adapter.volume(2)).toBe(true);expect(adapter.media()!.volume).toBe(1);expect(adapter.volume(NaN)).toBe(false);adapter.mute();expect(adapter.media()!.muted).toBe(true);});
  it('recovers after SPA replaces player bar',()=>{document.querySelector('.title')!.textContent='Second';expect(adapter.snapshot().title).toBe('Second');document.querySelector('ytmusic-player-bar')!.remove();expect(adapter.available('toggle')).toBe(false);});
});
describe('numeric and URL boundaries',()=>{
  it.each([[0,'0:00'],[65,'1:05'],[3661,'1:01:01'],[NaN,'—:—'],[Infinity,'—:—'],[-1,'—:—']])('formats %s',(value,result)=>expect(formatTime(value as number)).toBe(result));
  it('clamps finite seek positions',()=>{expect(clampSeek(-3,100)).toBe(0);expect(clampSeek(200,100)).toBe(100);expect(clampSeek(NaN,100)).toBeNull();expect(clampSeek(1,Infinity)).toBeNull();});
  it('rejects unsafe artwork schemes and deceptive hosts',()=>{for(const u of ['javascript:alert(1)','http://i.ytimg.com/a','https://ytimg.com.evil.test/a','https://evil.test/a',''])expect(safeCover(u)).toBe('');});
});
