// Live updates: watch the app folder for new files and tell open browser tabs about changes.
// Used by the server (browser files, budget changes) and by the launcher (server code restarts).
import {watch,readFileSync,existsSync} from 'node:fs';
import {join,dirname,relative,normalize} from 'node:path';
import {randomUUID} from 'node:crypto';

const IGNORED=/(^|\/)(\.git|node_modules)(\/|$)|\.tmp$|~$|\.swp$|(^|\/)\.DS_Store$|(^|\/)Thumbs\.db$/i;

// Calls onChange(paths) once a burst of file changes settles (an unzip touches many files at once).
// Paths are relative to root and use forward slashes. Returns a function that stops watching.
export function watchAppFiles(root,onChange,{settle=400,retry=2000}={}){
 let watcher=null,timer=null,retryTimer=null,stopped=false;const pending=new Set();
 const flush=()=>{timer=null;const paths=[...pending];pending.clear();if(paths.length)onChange(paths);};
 const start=()=>{
  if(stopped)return;
  try{
   watcher=watch(root,{recursive:true},(_event,name)=>{
    if(!name)return;const path=String(name).replace(/\\/g,'/');if(IGNORED.test(path))return;
    pending.add(path);clearTimeout(timer);timer=setTimeout(flush,settle);timer.unref?.();
   });
   // If the folder is briefly removed or locked during an update, start watching again.
   watcher.on('error',()=>{watcher?.close();watcher=null;retryTimer=setTimeout(start,retry);retryTimer.unref?.();});
  }catch{retryTimer=setTimeout(start,retry);retryTimer.unref?.();}
 };
 start();
 return ()=>{stopped=true;clearTimeout(timer);clearTimeout(retryTimer);watcher?.close();};
}

// Every file the server process loads, found by following relative imports from server/server.mjs.
// A change to any of these (or package.json) needs a server restart; other files do not.
export function serverModules(root,entry='server/server.mjs'){
 const seen=new Set(['package.json']),queue=[entry];
 while(queue.length){
  const file=queue.pop();if(seen.has(file))continue;const full=join(root,file);if(!existsSync(full))continue;seen.add(file);
  const source=readFileSync(full,'utf8');
  for(const m of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.{1,2}\/[^'"]+)['"]/g)){
   const target=relative(root,normalize(join(dirname(full),m[1]))).replace(/\\/g,'/');
   if(!target.startsWith('..'))queue.push(target);
  }
 }
 return seen;
}

// Keeps the open live-update connections and sends each event to all of them as one JSON line.
export class LiveHub{
 constructor({heartbeat=20000}={}){this.clients=new Set();this.boot=randomUUID();this.timer=setInterval(()=>{for(const res of this.clients)res.write('\n');},heartbeat);this.timer.unref?.();}
 connect(req,res,hello){
  res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no'});
  res.write(JSON.stringify({type:'hello',boot:this.boot,...hello})+'\n');
  this.clients.add(res);const drop=()=>this.clients.delete(res);req.on('close',drop);res.on('close',drop);
 }
 send(event){const line=JSON.stringify(event)+'\n';for(const res of this.clients)res.write(line);}
 close(){clearInterval(this.timer);for(const res of this.clients)res.end();this.clients.clear();}
}
