import {MusicAdapter, formatTime, type Action} from './adapter';
export const playerCSS = `
:root{color-scheme:dark;font-family:system-ui,'Segoe UI',sans-serif;background:#101514;color:#eff4f0}*{box-sizing:border-box}
html,body{margin:0;min-width:0;width:100%;overflow:hidden}button,input{font:inherit}
button{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;cursor:pointer;color:inherit;border:1px solid #33413c;background:transparent;border-radius:9px;width:36px;height:36px;padding:0}
button:hover{background:#26372e}button:focus-visible,input:focus-visible{outline:2px solid #c3f2cd;outline-offset:2px}button:disabled,input:disabled{opacity:.35;cursor:default}
.shell{display:flex;flex-direction:column;gap:10px;width:100%;max-width:640px;min-width:0;margin:0 auto;padding:12px 15px}
.header{display:flex;align-items:center;gap:7px;min-width:0;height:26px}.brand{font-size:9px;letter-spacing:.12em;color:#c3edcf;margin-right:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.header button{width:26px;height:26px;min-width:26px;border-radius:6px;font-size:13px}
.track{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;align-items:center;width:100%;min-width:0}
.art,.cover{display:block;width:64px;height:64px;border-radius:6px;background:#26312c;overflow:hidden;flex-shrink:0}.cover:not([data-ready]){visibility:hidden}
.meta{min-width:0;width:100%;max-width:100%;overflow:hidden}.title{font-size:16px;line-height:1.4;font-weight:650;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.artist{font-size:12px;color:#a7b8ac;line-height:1.5;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-top:3px}
.progress{display:grid;grid-template-columns:minmax(28px,auto) minmax(0,1fr) minmax(28px,auto);gap:8px;align-items:center;min-width:0;width:100%}
.time{font-size:10px;white-space:nowrap;color:#a6b5ad;font-variant-numeric:tabular-nums}input{accent-color:#bff0c7}
input[type=range]{min-width:0;height:22px;margin:0;cursor:pointer}.seek{width:100%}
.controls{display:flex;align-items:center;justify-content:center;gap:9px;min-width:0;width:100%}
.primary{width:44px;height:44px;border:0;border-radius:50%;background:#bff0c7;color:#142218;font-size:19px}.primary:hover{background:#d2f6d8}
.mute{margin-left:auto}.volume{flex:0 1 72px;min-width:38px;max-width:72px}
.status{font-size:10px;line-height:1.4;color:#abbcb0;margin:0;min-height:0}.status:empty{display:none}
@media(max-width:330px){.shell{padding:10px;gap:8px}.track{grid-template-columns:55px minmax(0,1fr);gap:9px}.art,.cover{width:55px;height:55px}.controls{gap:6px}.volume{max-width:42px}.brand{letter-spacing:0}}
@media(max-width:265px){.volume{display:none}.controls{justify-content:space-around}}
@media(prefers-reduced-motion:no-preference){button{transition:background .14s}}
`;
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
  const controls=el('nav','controls'), prev=button('前の曲','⏮',()=>act('previous')), toggle=button('再生','▶',()=>act('toggle'),'primary'), next=button('次の曲','⏭',()=>act('next'));
  const mute=button('ミュート','♪',()=>{adapter.mute();render();},'mute'),volume=el('input','volume');volume.type='range';volume.min='0';volume.max='1';volume.step='.05';volume.setAttribute('aria-label','音量');volume.addEventListener('input',()=>adapter.volume(Number(volume.value)));
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
    mute.disabled=volume.disabled=!s.hasMedia;mute.textContent=s.muted?'×':'♪';mute.setAttribute('aria-label',s.muted?'ミュート解除':'ミュート');mute.setAttribute('aria-pressed',String(s.muted));if(doc.activeElement!==volume)volume.value=String(s.volume);
    status.textContent=Date.now()<messageUntil?message:((s.status==='再生中'||s.status==='一時停止')?'':s.status);
  }
  render();return {render,report};
}

