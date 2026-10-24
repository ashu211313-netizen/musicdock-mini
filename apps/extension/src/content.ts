import {MusicAdapter} from './adapter';
import {mountPlayer} from './player';
declare global {interface Window {documentPictureInPicture?: {requestWindow(options:{width:number;height:number;disallowReturnToOpener:boolean}):Promise<Window>};HTMLInputElement:typeof HTMLInputElement;HTMLButtonElement:typeof HTMLButtonElement;}}
if(window.top===window && !document.getElementById('musicdock-host')) install();
window.addEventListener('pageshow',event=>{if(event.persisted && window.top===window && !document.getElementById('musicdock-host'))install();});
function install(){
  const adapter=new MusicAdapter(document);let pip:Window|null=null,opening=false,stopWatching:(()=>void)|undefined,timer:ReturnType<typeof setInterval>|undefined;
  const host=document.createElement('div');host.id='musicdock-host';host.style.cssText='position:fixed;right:22px;bottom:98px;z-index:2147483647';
  const shadow=host.attachShadow({mode:'closed'}),style=document.createElement('style');style.textContent='button{font:600 12px system-ui;padding:12px 18px;border:1px solid #63796a;border-radius:30px;background:#1b2620;color:#d9f9df;cursor:pointer}button:focus-visible{outline:3px solid #b8efbf}p{max-width:260px;font:12px system-ui;color:#fff;background:#242b26;padding:8px;border-radius:8px}p:empty{display:none}';
  const launch=document.createElement('button'),notice=document.createElement('p');launch.type='button';launch.textContent='♫ MINI を開く';launch.setAttribute('aria-label','ミニプレイヤーを開く');notice.setAttribute('role','status');shadow.append(style,launch,notice);
  const attach=()=>{if(!host.isConnected)document.body?.append(host);};attach();
  const observer=new MutationObserver(attach);observer.observe(document.documentElement,{childList:true,subtree:true});
  launch.addEventListener('click',async()=>{
    if(opening)return;if(pip&&!pip.closed){pip.focus();return;}
    if(!isSecureContext||!window.documentPictureInPicture?.requestWindow){notice.textContent='このブラウザでは利用できません。最新のデスクトップ版Chrome / Edgeで開いてください。';return;}
    opening=true;launch.disabled=true;notice.textContent='';
    try{
      // No asynchronous work before requestWindow: preserve transient activation.
      const win=await window.documentPictureInPicture.requestWindow({width:370,height:240,disallowReturnToOpener:false});pip=win;
      const ui=mountPlayer(win,adapter,()=>{window.focus();win.close();});launch.textContent='♫ MINI 表示中';
      const refresh=()=>{try{ui.render();}catch{ui.report('情報を取得できません。元タブを確認してください');}};
      stopWatching=adapter.watch(refresh);
      timer=setInterval(refresh,250);
      win.addEventListener('pagehide',()=>{if(pip===win){clearInterval(timer);stopWatching?.();stopWatching=undefined;timer=undefined;pip=null;launch.textContent='♫ MINI を開く';}},{once:true});
    }catch{pip?.close();pip=null;notice.textContent='開けませんでした。ブラウザのPiP設定を確認し、もう一度クリックしてください。';}
    finally{opening=false;launch.disabled=false;}
  });
  window.addEventListener('pagehide',()=>{observer.disconnect();clearInterval(timer);stopWatching?.();stopWatching=undefined;pip?.close();host.remove();},{once:true});
}
