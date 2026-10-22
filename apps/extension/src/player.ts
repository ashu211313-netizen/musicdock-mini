import {MusicAdapter, formatTime, type Action} from './adapter';
export const playerCSS = `
:root{color-scheme:dark;font-family:system-ui,'Segoe UI',sans-serif;background:#141719;color:#f3f5f4}*{box-sizing:border-box}body{margin:0}button,input{font:inherit}button{cursor:pointer;color:inherit;border:1px solid #38413e;background:#202724;border-radius:50%;min-width:36px;min-height:36px}button:hover{background:#36463e}button:focus-visible,input:focus-visible{outline:2px solid #b8efbf;outline-offset:3px}button:disabled,input:disabled{opacity:.35;cursor:default}.shell{padding:12px 16px;max-width:640px;margin:auto}.header{display:flex;align-items:center;gap:8px;margin-bottom:10px}.brand{font-size:9px;letter-spacing:.14em;color:#b8efbf;margin-right:auto}.header button{font-size:12px;min-height:24px;min-width:24px;border-radius:6px}.track{display:flex;gap:13px;align-items:center}.cover{width:58px;height:58px;object-fit:cover;border-radius:8px;background:#2c3932}.cover:not([data-ready]){visibility:hidden}.art{background:#25342b;border-radius:8px;flex-shrink:0;width:58px;height:58px}.meta{min-width:0}.title{font-size:15px;font-weight:650;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.artist{font-size:12px;color:#abb5af;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-top:5px}.progress{display:flex;gap:9px;align-items:center;margin-top:12px}.time{font-size:10px;color:#acb7b0;font-variant-numeric:tabular-nums}input{accent-color:#b8efbf}input[type=range]{min-width:0;height:20px;margin:0}.seek{flex:1}.controls{display:flex;gap:12px;align-items:center;justify-content:center;margin-top:5px}.primary:hover{background:#d0f6d5}.primary{background:#b8efbf;color:#122018;width:42px;height:42px;font-size:19px;border:0}.volume{width:60px}.status{font-size:10px;color:#a4b6ab;margin:7px 0 0;min-height:14px} @media(max-width:310px){.shell{padding:9px}.volume{width:40px}.controls{gap:7px}.track{gap:9px}.brand{letter-spacing:0}}@media(prefers-reduced-motion:no-preference){button{transition:background .15s}}`;
export function mountPlayer(win: Window, adapter: MusicAdapter, onReturn: () => void) {
  const doc = win.document;
  doc.documentElement.lang = 'ja'; doc.title = 'MusicDock Mini';
  const style = doc.createElement('style'); style.textContent = playerCSS; doc.head.append(style);
  function el<K extends keyof HTMLElementTagNameMap>(tag:K, className='', text='') {const node=doc.createElement(tag);node.className=className;node.textContent=text;return node;}
  function button(label:string,text:string,run:()=>void,className='') {const b=el('button',className,text);b.type='button';b.setAttribute('aria-label',label);b.title=label;b.addEventListener('click',run);return b;}
  const shell=el('main','shell'), header=el('header','header'), track=el('section','track'), art=el('div','art'), cover=el('canvas','cover'), meta=el('div','meta'), title=el('div','title'), artist=el('div','artist');
  shell.setAttribute('aria-label','MusicDock Mini プレイヤー');
  header.append(el('span','brand','MUSICDOCK / MINI'),button('YouTube Musicに戻る','↗',onReturn),button('閉じる','×',()=>win.close()));
  let drawnCover='';
  cover.width=cover.height=160;cover.setAttribute('role','img');cover.setAttribute('aria-label','アルバムジャケット');art.append(cover);meta.append(title,artist);track.append(art,meta);
  const progress=el('section','progress'), current=el('span','time'), duration=el('span','time'), seek=el('input','seek');seek.type='range';seek.min='0';seek.step='1';seek.setAttribute('aria-label','再生位置');progress.append(current,seek,duration);
  let dragging=false, cooldown=0, message='', messageUntil=0;
  const status=el('p','status');status.setAttribute('role','status');
  const report=(text:string)=>{message=text;messageUntil=Date.now()+3000;status.textContent=text;};
  function act(action:Action){if(Date.now()<cooldown)return;cooldown=Date.now()+250;if(!adapter.act(action))report('この操作は現在利用できません');render();}
  const controls=el('nav','controls'), prev=button('前の曲','Ⅰ◀',()=>act('previous')), toggle=button('再生','▶',()=>act('toggle'),'primary'), next=button('次の曲','▶Ⅰ',()=>act('next'));
  const mute=button('ミュート','音',()=>{adapter.mute();render();}),volume=el('input','volume');volume.type='range';volume.min='0';volume.max='1';volume.step='.05';volume.setAttribute('aria-label','音量');volume.addEventListener('input',()=>adapter.volume(Number(volume.value)));
  controls.setAttribute('aria-label','再生操作');controls.append(prev,toggle,next,mute,volume);shell.append(header,track,progress,controls,status);doc.body.append(shell);
  seek.addEventListener('input',()=>{dragging=true;current.textContent=formatTime(Number(seek.value));});
  seek.addEventListener('change',()=>{if(!adapter.seek(Number(seek.value)))report('この再生位置へ移動できません');dragging=false;render();});
  seek.addEventListener('blur',()=>{dragging=false;});
  doc.addEventListener('keydown',e=>{if(e.target instanceof win.HTMLInputElement || e.target instanceof win.HTMLButtonElement)return;if(e.code==='Space'){e.preventDefault();act('toggle');}else if(e.code==='ArrowRight'){e.preventDefault();adapter.seek(adapter.snapshot().current+5);}else if(e.code==='ArrowLeft'){e.preventDefault();adapter.seek(adapter.snapshot().current-5);}else if(e.code==='Escape')win.close();});
  function render(){
    const s=adapter.snapshot();title.textContent=s.title||'曲を選んでください';title.title=s.title;artist.textContent=s.artist||'YouTube Music';
    // Draw the already loaded page image; no duplicate image request or pixel readback.
    const source=adapter.coverElement();
    if(s.cover!==drawnCover){cover.getContext('2d')?.clearRect(0,0,160,160);cover.removeAttribute('data-ready');drawnCover='';}
    if(s.cover && s.cover!==drawnCover && source?.complete && source.naturalWidth){try{cover.getContext('2d')?.drawImage(source,0,0,160,160);drawnCover=s.cover;cover.setAttribute('data-ready','true');}catch{/* keep a neutral placeholder */}}
    toggle.textContent=s.playing?'Ⅱ':'▶';toggle.setAttribute('aria-label',s.playing?'一時停止':'再生');toggle.title=s.playing?'一時停止':'再生';
    prev.disabled=!adapter.available('previous');toggle.disabled=!adapter.available('toggle');next.disabled=!adapter.available('next');
    current.textContent=dragging?formatTime(Number(seek.value)):formatTime(s.current);duration.textContent=formatTime(s.duration);seek.disabled=!s.canSeek;seek.max=String(Number.isFinite(s.duration)?s.duration:100);if(!dragging)seek.value=String(Math.min(s.current||0,s.duration||0));
    mute.disabled=volume.disabled=!s.hasMedia;mute.textContent=s.muted?'消':'音';mute.setAttribute('aria-label',s.muted?'ミュート解除':'ミュート');mute.setAttribute('aria-pressed',String(s.muted));if(doc.activeElement!==volume)volume.value=String(s.volume);
    status.textContent=Date.now()<messageUntil?message:s.status;
  }
  render();return {render,report};
}

