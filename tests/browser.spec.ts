import {test,expect,chromium,type BrowserContext,type Route} from '@playwright/test';
import {readFile,mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const code=await readFile('dist/extension/content.js','utf8');
const fixture=`<!doctype html><html><head><title>Mock music page</title></head><body><ytmusic-player-bar><span class="title">Fixture song</span><span class="byline">Fixture artist</span><div id="thumbnail"><img src="https://i.ytimg.com/fixture.png"></div><button class="previous-button" onclick="document.querySelector('.title').textContent='Previous song'">Previous</button><button class="play-pause-button" onclick="const m=document.querySelector('video');m.paused?m.play():m.pause()">Play</button><button class="next-button" onclick="document.querySelector('.title').textContent='Next song'">Next</button></ytmusic-player-bar><div id="movie_player"><video src="https://music.youtube.com/fixture.wav" preload="auto"></video></div></body></html>`;
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
  const dir=await mkdtemp(path.join(os.tmpdir(),'musicdock-test-'));let context:BrowserContext|undefined;
  try{
    context=await chromium.launchPersistentContext(dir,{headless:true,channel:'chromium',args:[`--disable-extensions-except=${path.resolve('dist/extension')}`,`--load-extension=${path.resolve('dist/extension')}`]});
    const icon=await readFile('apps/extension/icons/icon128.png');
    await context.route('https://i.ytimg.com/**',route=>route.fulfill({contentType:'image/png',body:icon}));
    await context.route('https://music.youtube.com/**',route=>route.request().url().endsWith('fixture.wav')?serveAudio(route):route.fulfill({contentType:'text/html',body:fixture}));
    const page=await context.newPage();await page.goto('https://music.youtube.com/');await expect(page.locator('#musicdock-host')).toBeAttached();
    // Closed shadow root deliberately uses a coordinate click on its observed host bounds.
    const bounds=await page.locator('#musicdock-host').boundingBox();expect(bounds).toBeTruthy();
    const pipEvent=context.waitForEvent('page');await page.mouse.click(bounds!.x+bounds!.width/2,bounds!.y+bounds!.height/2);const pip=await pipEvent;await pip.waitForLoadState();
    await expect(pip.getByText('Fixture song',{exact:true})).toBeVisible();await expect(pip.getByText('Fixture artist',{exact:true})).toBeVisible();
    await pip.getByRole('button',{name:'再生',exact:true}).click();await expect(pip.getByRole('button',{name:'一時停止',exact:true})).toBeVisible();
    await pip.waitForTimeout(300);await pip.getByRole('button',{name:'一時停止',exact:true}).click();await expect(pip.getByRole('button',{name:'再生',exact:true})).toBeVisible();
    await expect(pip.getByRole('img',{name:'アルバムジャケット'})).toHaveAttribute('data-ready','true');
    await page.mouse.click(bounds!.x+bounds!.width/2,bounds!.y+bounds!.height/2);expect(context.pages().filter(p=>p!==page&&p.url()==='about:blank').length).toBeLessThanOrEqual(2);
    await pip.waitForTimeout(300);await pip.getByRole('button',{name:'次の曲',exact:true}).click();await expect(pip.getByText('Next song',{exact:true})).toBeVisible();
    await pip.waitForTimeout(300);await pip.getByRole('button',{name:'前の曲',exact:true}).click();await expect(pip.getByText('Previous song',{exact:true})).toBeVisible();
    await pip.getByRole('slider',{name:'再生位置',exact:true}).fill('45');await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBe(45);
    await pip.getByRole('button',{name:'ミュート',exact:true}).click();await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.muted)).toBe(true);
    await pip.setViewportSize({width:370,height:240});await pip.screenshot({path:'docs/player-fixture.png'});
    await pip.getByRole('button',{name:'閉じる',exact:true}).click();await expect.poll(()=>pip.isClosed()).toBe(true);await expect(page.locator('.title')).toHaveText('Previous song');
    await page.mouse.click(bounds!.x+bounds!.width/2,bounds!.y+bounds!.height/2);await expect.poll(()=>context!.pages().length).toBe(3); // initial blank, source, PiP
    await page.reload();await expect(page.locator('#musicdock-host')).toBeAttached();
  }finally{await context?.close();await rm(dir,{recursive:true,force:true});}
});
test('unsupported PiP does not damage source controls',async({page})=>{await page.route('https://music.youtube.com/**',r=>r.fulfill({contentType:'audio/wav',body:wav}));await page.route('https://i.ytimg.com/**',r=>r.abort());await page.goto('/dist/website/');await page.setContent(fixture);await page.evaluate(()=>Object.defineProperty(window,'documentPictureInPicture',{value:undefined,configurable:true}));await page.addScriptTag({content:code});const b=await page.locator('#musicdock-host').boundingBox();await page.mouse.click(b!.x+b!.width/2,b!.y+b!.height/2);await expect(page.locator('ytmusic-player-bar')).toBeVisible();await expect(page.locator('#musicdock-host')).toBeAttached();});
