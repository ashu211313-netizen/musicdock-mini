import {build} from 'esbuild';
import {mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
const version=JSON.parse(await readFile('package.json','utf8')).version;
const manifest=JSON.parse(await readFile('apps/extension/manifest.json','utf8'));
const website=await readFile('apps/website/index.html','utf8');
if(manifest.version!==version || !website.includes(`musicdock-mini-${version}.zip`) || !(await readFile('docs/INSTALL.md','utf8')).includes(version)) throw new Error('Release version mismatch across package/manifest/website/install guide');
await rm('dist',{recursive:true,force:true});
await mkdir('dist/extension',{recursive:true});
await build({entryPoints:['apps/extension/src/content.ts'],bundle:true,loader:{'.woff2':'binary'},format:'iife',target:'chrome116',outfile:'dist/extension/content.js',legalComments:'none'});
await cp('apps/extension/manifest.json','dist/extension/manifest.json');
await cp('apps/extension/fonts/OFL.txt','dist/extension/Inter-OFL.txt');
await cp('apps/extension/icons','dist/extension/icons',{recursive:true});
await cp('apps/website','dist/website',{recursive:true});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(const [source,target,title] of [['INSTALL.md','install.html','導入ガイド'],['PRIVACY.md','privacy.html','プライバシーポリシー']]) {
  const text=await readFile(`docs/${source}`,'utf8');
  const body=text.split(/\r?\n\r?\n/).map(p=>p.startsWith('# ')?`<h1>${escape(p.slice(2))}</h1>`:`<p>${escape(p).replaceAll('\n','<br>')}</p>`).join('\n');
  await writeFile(`dist/website/${target}`,`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — MusicDock Mini</title><link rel="icon" href="./favicon.svg"><link rel="stylesheet" href="./style.css"></head><body><main class="doc wrap"><a href="./index.html">← MusicDock Mini に戻る</a>${body}</main></body></html>`);
}
await cp('docs/INSTALL.md','dist/extension/導入ガイド.txt');
await cp('docs/PRIVACY.md','dist/extension/プライバシー.txt');
await writeFile('dist/website/.nojekyll','');
await writeFile('dist/website/version.json',JSON.stringify({version:JSON.parse(await readFile('package.json','utf8')).version}));
// Test harness bundles the exact production player; it is never packaged with the extension/site.
await build({stdin:{contents:`import {mountPlayer} from './apps/extension/src/player'; import {MusicAdapter} from './apps/extension/src/adapter'; export function mount(){ return mountPlayer(window,new MusicAdapter(document),()=>{}); }`,resolveDir:process.cwd(),loader:'ts'},bundle:true,loader:{'.woff2':'binary'},format:'iife',globalName:'MusicDockLayout',outfile:'dist/layout-harness.js',target:'chrome116'});
console.log('Built extension and subpath-safe static website. Run scripts/package.ps1 to attach the extension ZIP.');
