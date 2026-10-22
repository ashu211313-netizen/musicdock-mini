import {build} from 'esbuild';
import {mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/extension',{recursive:true});
await build({entryPoints:['apps/extension/src/content.ts'],bundle:true,format:'iife',target:'chrome116',outfile:'dist/extension/content.js',legalComments:'none'});
await cp('apps/extension/manifest.json','dist/extension/manifest.json');
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
console.log('Built extension and subpath-safe static website. Run scripts/package.ps1 to attach the extension ZIP.');
