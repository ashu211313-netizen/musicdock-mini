// Own the local server lifecycle explicitly, including Windows process cleanup.
import {spawn} from 'node:child_process';
import net from 'node:net';
const probe=net.createServer();
await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});
const port=probe.address().port;
await new Promise(resolve=>probe.close(resolve));
const env={...process.env,MUSICDOCK_PORT:String(port),MUSICDOCK_EXTERNAL_SERVER:'1'};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env,stdio:['ignore','pipe','inherit'],windowsHide:true});
try {
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('Local test server did not become ready')),10000);
    server.once('error',reject);
    server.once('exit',code=>reject(new Error(`Local server exited: ${code}`)));
    server.stdout.once('data',()=>{clearTimeout(timeout);resolve();});
  });
  const test=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test',...process.argv.slice(2)],{env,stdio:'inherit',windowsHide:true});
  process.exitCode=await new Promise((resolve,reject)=>{test.once('error',reject);test.once('exit',code=>resolve(code??1));});
} finally {
  server.kill();
  await new Promise(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',resolve);});
}
