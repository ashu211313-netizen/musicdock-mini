import {test,expect,chromium,type BrowserContext,type Route} from '@playwright/test';
import {readFile,mkdtemp,rm,writeFile} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const code=await readFile('dist/extension/content.js','utf8');
const fixture=`<!doctype html><html><head><title>Mock music page</title></head><body><ytmusic-player-bar><span class="title">Fixture song</span><span class="byline">Fixture artist</span><span class="time-info">0:00 / 3:00</span><div id="progress-bar" aria-valuenow="0" aria-valuemax="180"></div><div id="thumbnail"><img src="https://i.ytimg.com/fixture.png"></div><button class="previous-button" onclick="document.querySelector('.title').textContent='Previous song';document.querySelector('video').dispatchEvent(new Event('loadedmetadata'))">Previous</button><button class="play-pause-button" onclick="const m=document.querySelector('video');m.paused?m.play():m.pause()">Play</button><button class="next-button" onclick="document.querySelector('.title').textContent='Next song';document.querySelector('video').dispatchEvent(new Event('loadedmetadata'))">Next</button></ytmusic-player-bar><div id="movie_player"><video src="https://music.youtube.com/fixture.wav" preload="auto"></video></div><script>setInterval(()=>{const m=document.querySelector('video'),c=Math.floor(m.currentTime||0),d=Math.ceil(m.duration||180);document.querySelector('.time-info').textContent=Math.floor(c/60)+':'+String(c%60).padStart(2,'0')+' / '+Math.floor(d/60)+':'+String(d%60).padStart(2,'0');document.getElementById('progress-bar').setAttribute('aria-valuenow',c);document.getElementById('progress-bar').setAttribute('aria-valuemax',d);document.querySelector('.play-pause-button').setAttribute('aria-label',m.paused?'再生':'一時停止');},100);</script></body></html>`;
// Generated silent PCM exercises native media properties across isolated worlds.
const wav=Buffer.alloc(44+8000*180,128);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(8000,28);wav.writeUInt16LE(1,32);wav.writeUInt16LE(8,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
function serveAudio(route:Route){const range=route.request().headers()['range'];const match=/bytes=(\d+)-(\d*)/.exec(range||'');const start=match?Number(match[1]):0,end=match?.[2]?Math.min(Number(match[2]),wav.length-1):wav.length-1;return route.fulfill({status:match?206:200,contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Content-Length':String(end-start+1),...(match?{'Content-Range':`bytes ${start}-${end}/${wav.length}`}:{})},body:wav.subarray(start,end+1)});}
test('website demo, internal links, downloads and mobile layout',async({page,request})=>{
  await page.goto('/dist/website/');await page.getByRole('button',{name:'デモを再生',exact:true}).click();await expect(page.getByRole('button',{name:'デモを一時停止'})).toBeVisible();await page.getByRole('button',{name:'デモの次の曲'}).click();await expect(page.locator('#song')).toHaveText('Quiet Signals');await page.getByRole('button',{name:'デモの前の曲'}).click();await expect(page.locator('#song')).toHaveText('Midnight Walk');
  await page.locator('#seek').fill('80');await expect(page.locator('#elapsed')).toHaveText('1:20');
  for(const href of await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')!))){if(href.startsWith('#'))await expect(page.locator(href)).toHaveCount(1);else expect((await request.get('/dist/website/'+href.replace('./',''))).ok()).toBe(true);}
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'docs/website-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1100});await page.screenshot({path:'docs/website-desktop.png',fullPage:true});
});
test('real extension loads in isolated world; real Document PiP lifecycle on fixture',async()=>{
  test.setTimeout(60000);
  const dir=await mkdtemp(path.join(os.tmpdir(),'musicdock-test-'));let context:BrowserContext|undefined;
  try{
    context=await chromium.launchPersistentContext(dir,{headless:true,viewport:null,channel:'chromium',args:[`--disable-extensions-except=${path.resolve('dist/extension')}`,`--load-extension=${path.resolve('dist/extension')}`]});
    const icon=await readFile('apps/extension/icons/icon128.png');
    await context.route('https://i.ytimg.com/**',route=>route.fulfill({contentType:'image/png',body:icon}));
    await context.route('https://music.youtube.com/**',route=>route.request().url().endsWith('fixture.wav')?serveAudio(route):route.fulfill({contentType:'text/html',body:fixture}));
    const page=await context.newPage();await page.goto('https://music.youtube.com/');await expect(page.locator('#musicdock-host')).toBeAttached();
    // Closed shadow root deliberately uses a coordinate click on its observed host bounds.
    const bounds=await page.locator('#musicdock-host').boundingBox();expect(bounds).toBeTruthy();
    const pipEvent=context.waitForEvent('page');await page.mouse.click(bounds!.x+bounds!.width/2,bounds!.y+bounds!.height/2);const pip=await pipEvent;await pip.waitForLoadState();
    await expect(pip.getByText('Fixture song',{exact:true})).toBeVisible();await expect(pip.getByText('Fixture artist',{exact:true})).toBeVisible();await expect(pip.getByRole('slider',{name:'再生位置',exact:true})).toBeEnabled();
    await pip.getByRole('button',{name:'再生',exact:true}).click();await expect(pip.getByRole('button',{name:'一時停止',exact:true})).toBeVisible();
    await pip.waitForTimeout(300);await pip.getByRole('button',{name:'一時停止',exact:true}).click();await expect(pip.getByRole('button',{name:'再生',exact:true})).toBeVisible();
    await expect(pip.getByRole('img',{name:'アルバムジャケット'})).toHaveAttribute('data-ready','true');
    await page.mouse.click(bounds!.x+bounds!.width/2,bounds!.y+bounds!.height/2);expect(context.pages().filter(p=>p!==page&&p.url()==='about:blank').length).toBeLessThanOrEqual(2);
    await pip.waitForTimeout(300);await pip.getByRole('button',{name:'次の曲',exact:true}).click();await expect(pip.getByText('Next song',{exact:true})).toBeVisible();
    await pip.waitForTimeout(300);await pip.getByRole('button',{name:'前の曲',exact:true}).click();await expect(pip.getByText('Previous song',{exact:true})).toBeVisible();
    await pip.getByRole('slider',{name:'再生位置',exact:true}).fill('45');await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBe(45);
    await pip.getByRole('button',{name:'音量調整',exact:true}).click();await pip.getByRole('button',{name:'ミュート',exact:true}).click();await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.muted)).toBe(true);
    await pip.getByRole('button',{name:'音量調整',exact:true}).click();await pip.evaluate(()=>{const b=document.createElement('button');b.id='minimum-probe';b.setAttribute('aria-label','test minimum size');b.textContent='min';b.onclick=()=>{window.resizeTo(1,1);b.remove();};document.body.prepend(b);});
    await pip.getByRole('button',{name:'test minimum size'}).click();await pip.waitForTimeout(250);
    const minimum=await pip.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}));
    await writeFile('docs/browser-minimum.json',JSON.stringify({environment:'Chromium for Testing / headless; not a Windows manual resize certification',requestOuterSize:[1,1],observed:minimum},null,2));
    expect(minimum.scrollWidth).toBeLessThanOrEqual(minimum.width);expect(minimum.scrollHeight).toBeLessThanOrEqual(minimum.height);
    await pip.screenshot({path:'../musicdock-2.0.1-native-minimum.png'});
    await pip.getByRole('button',{name:'再生',exact:true}).scrollIntoViewIfNeeded();await expect(pip.getByRole('button',{name:'再生',exact:true})).toBeVisible();
    await pip.setViewportSize({width:370,height:240});await pip.screenshot({path:'docs/player-fixture.png'});
    expect(pip.isClosed()).toBe(false);await pip.getByRole('button',{name:'閉じる',exact:true}).click().catch(error=>{if(!pip.isClosed())throw error;});await expect.poll(()=>pip.isClosed()).toBe(true);await expect(page.locator('.title')).toHaveText('Previous song');
    await page.mouse.click(bounds!.x+bounds!.width/2,bounds!.y+bounds!.height/2);await expect.poll(()=>context!.pages().length).toBe(3); // initial blank, source, PiP
    await page.reload();await expect(page.locator('#musicdock-host')).toBeAttached();
  }finally{await context?.close();await rm(dir,{recursive:true,force:true});}
});
test('unsupported PiP does not damage source controls',async({page})=>{await page.route('https://music.youtube.com/**',r=>r.fulfill({contentType:'audio/wav',body:wav}));await page.route('https://i.ytimg.com/**',r=>r.abort());await page.goto('/dist/website/');await page.setContent(fixture);await page.evaluate(()=>Object.defineProperty(window,'documentPictureInPicture',{value:undefined,configurable:true}));await page.addScriptTag({content:code});const b=await page.locator('#musicdock-host').boundingBox();await page.mouse.click(b!.x+b!.width/2,b!.y+b!.height/2);await expect(page.locator('ytmusic-player-bar')).toBeVisible();await expect(page.locator('#musicdock-host')).toBeAttached();});


// Layout regression uses the actual production renderer, not a separately drawn mock.
test('v2 layout: long metadata, centered transport and compact windows', async ({page}) => {
  const harness = await readFile('dist/layout-harness.js', 'utf8');
  await page.route('https://music.youtube.com/**', serveAudio);
  await page.route('https://i.ytimg.com/**', route => route.fulfill({contentType:'image/svg+xml',body:coverArt}));
  await page.goto('/dist/website/');
  await page.setContent(fixture);
  await page.addStyleTag({content:'ytmusic-player-bar,#movie_player{display:none}'});
  await page.locator('ytmusic-player-bar .title').evaluate(node => node.textContent = '夜の余白 / After Hours');
  await page.locator('.byline').evaluate(node => {
    node.replaceChildren();
    const artist=document.createElement('a');artist.href='/channel/demo';artist.textContent='MusicDock Sessions';
    node.append(artist,document.createTextNode(' • A Quiet Place • 2026'));
  });
  await page.addScriptTag({content:harness});
  await page.evaluate(() => { (window as any).layoutUI=(window as any).MusicDockLayout.mount(); setInterval(()=>(window as any).layoutUI.render(),100); });
  await expect(page.locator('main .artist')).toHaveText('MusicDock Sessions');
  await expect(page.locator('canvas.cover')).toHaveAttribute('data-ready','true');
  await expect(page.getByRole('slider',{name:'再生位置',exact:true})).toBeEnabled();
  await page.setViewportSize({width:370,height:240});
  await page.locator('video').evaluate((media:HTMLVideoElement)=>media.currentTime=84);
  await page.evaluate(()=>(window as any).layoutUI.render());
  await expect(page.locator('main .current')).toHaveText('1:24');
  await expect(page.getByRole('slider',{name:'再生位置',exact:true})).toBeEnabled();
  await page.screenshot({path:'../musicdock-2.0.1-finished.png'});
  await page.screenshot({path:'docs/player-v2.png'});
  await page.getByRole('button',{name:'音量調整',exact:true}).click();
  await expect(page.getByRole('slider',{name:'音量',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'ミュート',exact:true}).click();
  await expect(page.getByRole('group',{name:'音量設定'})).toBeVisible();
  await page.getByRole('button',{name:'ミュート解除',exact:true}).click();
  await page.getByRole('slider',{name:'音量',exact:true}).fill('0.35');
  await expect.poll(() => page.locator('video').evaluate((m:HTMLVideoElement)=>m.volume)).toBe(.35);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('group',{name:'音量設定'})).toBeHidden();
  // Use complete, deliberately hostile metadata strings (CJK, Latin, no spaces).
  const longTitle='文字が見切れない長い曲名テスト / ExtremelyLongTitleWithoutBreaks'.repeat(4);
  const longArtist='VeryLongArtistNameWithoutSpaces日本語の長いアーティスト名'.repeat(4);
  await page.locator('ytmusic-player-bar .title').evaluate((node,text)=>node.textContent=text,longTitle);
  await page.locator('.byline a').evaluate((node,text)=>node.textContent=text,longArtist);
  await page.evaluate(()=>(window as any).layoutUI.render());
  await page.locator('video').evaluate(m=>m.dispatchEvent(new Event('loadedmetadata')));
  await page.evaluate(()=>(window as any).layoutUI.render());
  await expect(page.getByRole('slider',{name:'再生位置',exact:true})).toBeEnabled();
  for(const [width,height] of [[370,240],[320,220],[270,195],[240,170],[220,160],[244,57],[520,280]]) {
    await page.setViewportSize({width,height});
    const geometry=await page.evaluate(()=>{
      const q=(s:string)=>document.querySelector<HTMLElement>(s)!;
      const shell=q('.shell').getBoundingClientRect(),primary=q('.primary').getBoundingClientRect();
      const title=q('main .title'),artist=q('main .artist');
      const controls=[...document.querySelectorAll<HTMLElement>('.header button,.transport button,.sound > button')].map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
      return {horizontal:document.documentElement.scrollWidth<=innerWidth,vertical:document.documentElement.scrollHeight<=innerHeight,
        center:Math.abs(primary.left+primary.width/2-innerWidth/2),controls,
        titleOverflow:getComputedStyle(title).textOverflow,artistOverflow:getComputedStyle(artist).textOverflow,
        titleTruncated:title.scrollWidth>title.clientWidth,artistTruncated:artist.scrollWidth>artist.clientWidth,
        titleBox:title.getBoundingClientRect().height,titleLine:parseFloat(getComputedStyle(title).lineHeight),shellWidth:shell.width};
    });
    expect(geometry.horizontal,`${width} horizontal`).toBe(true);
    expect(geometry.vertical,`${width}x${height} vertical`).toBe(true);
    if(height>100) expect(geometry.center,`${width} play centered`).toBeLessThanOrEqual(1);
    expect(geometry.titleOverflow).toBe('ellipsis');expect(geometry.artistOverflow).toBe('ellipsis');
    expect(geometry.titleTruncated).toBe(true);expect(geometry.artistTruncated).toBe(true);
    expect(geometry.titleBox).toBeGreaterThanOrEqual(geometry.titleLine-1);
    for(const rect of geometry.controls){expect(rect.left).toBeGreaterThanOrEqual(0);expect(rect.right).toBeLessThanOrEqual(width);expect(rect.bottom).toBeLessThanOrEqual(height);}
    await page.getByRole('button',{name:'音量調整',exact:true}).click();
    const volumeBox=await page.getByRole('group',{name:'音量設定'}).boundingBox();
    expect(volumeBox!.x).toBeGreaterThanOrEqual(0);expect(volumeBox!.x+volumeBox!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    if(width===270)await page.screenshot({path:'../musicdock-2.0.1-compact-long-text.png'});
    if(width===370)await page.screenshot({path:'../musicdock-2.0.1-long-text.png'});
  }
  await page.setViewportSize({width:280,height:220});
  await page.evaluate(()=>(window as any).layoutUI.report('読み込みに失敗しました。元タブの通信状態と再生設定を確認してください。'.repeat(3)));
  const errorBounds=await page.getByRole('status').boundingBox();
  expect(errorBounds!.width).toBeLessThanOrEqual(256);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('status').scrollIntoViewIfNeeded();await expect(page.getByRole('status')).toBeVisible();
});

const coverArt=`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="#26372e"/><path d="M0 248 320 113v207H0z" fill="#748e72"/><path d="M0 288 320 153v167H0z" fill="#15261d"/><circle cx="230" cy="88" r="40" fill="#c5d3ab"/><path d="M0 267 320 132" stroke="#c5d3ab" stroke-width="2"/><text x="24" y="40" fill="#c5d3ab" font-size="13" font-family="sans-serif" letter-spacing="3">AFTER HOURS</text></svg>`;


test('regression: stale 3:25/4:18 cannot overwrite All I Need 0:26/2:30 or receive a seek',async({page})=>{
 await page.route('https://music.youtube.com/**',serveAudio);await page.route('https://i.ytimg.com/**',r=>r.abort());
 await page.goto('/dist/website/');await page.setContent(fixture.replace(/<script>[\s\S]*?<\/script>/,''));
 await page.addStyleTag({content:'ytmusic-player-bar,#movie_player{display:none}'});
 await page.evaluate(()=>{
  document.querySelector('.title')!.textContent='All I Need';document.querySelector('.time-info')!.textContent='0:26 / 2:30';
  document.getElementById('progress-bar')!.setAttribute('aria-valuenow','26');document.getElementById('progress-bar')!.setAttribute('aria-valuemax','150');
  const stale=document.querySelector('video')!;stale.id='stale';Object.defineProperties(stale,{duration:{value:258,configurable:true},currentTime:{value:205,writable:true,configurable:true},readyState:{value:4}});
 });
 await page.addScriptTag({content:await readFile('dist/layout-harness.js','utf8')});
 await page.evaluate(()=>{(window as any).ui=(window as any).MusicDockLayout.mount();setInterval(()=>(window as any).ui.render(),100);});
 await expect(page.locator('main .current')).toHaveText('0:26');await expect(page.locator('main .time').last()).toHaveText('2:30');await expect(page.getByRole('slider',{name:'再生位置',exact:true})).toBeDisabled();
 await page.evaluate(()=>{
  const active=document.createElement('video');active.id='active';active.setAttribute('src','https://music.youtube.com/fixture.wav?active');
  Object.defineProperties(active,{duration:{value:150,configurable:true},currentTime:{value:26,writable:true,configurable:true},readyState:{value:4},seekable:{value:{length:1,start:()=>0,end:()=>150}}});document.getElementById('movie_player')!.append(active);
 });
 await expect(page.getByRole('slider',{name:'再生位置',exact:true})).toBeEnabled();
 await page.getByRole('slider',{name:'再生位置',exact:true}).fill('40');
 await expect.poll(()=>page.locator('#active').evaluate((m:HTMLMediaElement)=>m.currentTime)).toBe(40);
 expect(await page.locator('#stale').evaluate((m:HTMLMediaElement)=>m.currentTime)).toBe(205);
 await page.evaluate(()=>{
  const slider=document.querySelector<HTMLInputElement>('main .seek')!;slider.value='50';slider.dispatchEvent(new Event('input',{bubbles:true}));
  document.querySelector('.title')!.textContent='Next song';document.querySelector('.time-info')!.textContent='0:00 / 2:30';document.getElementById('progress-bar')!.setAttribute('aria-valuenow','0');
  (window as any).ui.render();slider.dispatchEvent(new Event('change',{bubbles:true}));
 });
 expect(await page.locator('#active').evaluate((m:HTMLMediaElement)=>m.currentTime)).toBe(40);
 await expect(page.getByRole('slider',{name:'再生位置',exact:true})).toBeDisabled();
});
