// Budget HQ launcher: runs the server and restarts it automatically when an update changes server code.
// Browser files (pages, styles) are refreshed live by the server itself and do not need a restart.
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {watchAppFiles,serverModules} from './live-updates.mjs';

const root=dirname(dirname(fileURLToPath(import.meta.url))),serverFile=join(root,'server','server.mjs'),args=process.argv.slice(2);
const OWN_FILES=new Set(['server/supervisor.mjs','server/live-updates.mjs']);
let child=null,stopping=false,restarting=false,modules=serverModules(root),failures=0,retryTimer=null;
const log=message=>console.log('[Budget HQ] '+message);

function start(){
 clearTimeout(retryTimer);modules=serverModules(root);
 child=spawn(process.execPath,[serverFile,...args],{cwd:root,stdio:['inherit','inherit','inherit','ipc'],env:{...process.env,BUDGET_HQ_SUPERVISED:'1'}});
 const started=Date.now(),current=child;
 current.on('exit',code=>{
  if(current!==child)return;child=null;
  if(stopping){process.exit(0);}
  if(restarting){restarting=false;start();return;}
  // Unexpected stop (for example a half-copied update). Try again; a later file change also restarts it.
  failures=Date.now()-started<10000?failures+1:0;const wait=Math.min(30000,2000*2**Math.min(failures,4));
  log(`Server stopped (code ${code}). Trying again in ${Math.round(wait/1000)} s — or as soon as updated files arrive.`);
  retryTimer=setTimeout(start,wait);
 });
}

// Ask the server to finish pending saves and exit; force it after 5 seconds.
function stopChild(){if(!child)return;const current=child;try{current.send({type:'shutdown'});}catch{current.kill();}const force=setTimeout(()=>current.kill(),5000);force.unref();}

watchAppFiles(root,paths=>{
 if(paths.some(p=>OWN_FILES.has(p)))log('The launcher was updated. It keeps working; close this window and start Budget HQ again when convenient to use the new launcher.');
 const changed=paths.filter(p=>modules.has(p));if(!changed.length)return;
 log('Update detected ('+changed.slice(0,3).join(', ')+(changed.length>3?', …':'')+'). Restarting the server…');
 if(child){restarting=true;stopChild();}else start();
});

for(const signal of ['SIGINT','SIGTERM','SIGBREAK','SIGHUP'])process.on(signal,()=>{if(stopping)return;stopping=true;if(child)stopChild();else process.exit(0);});
log('Live updates on: extract a new version over this folder and open pages update by themselves.');
start();
