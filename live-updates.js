// Live updates in the browser. Keeps one connection open to the local Budget HQ server and:
//  - swaps in changed style sheets instantly, without reloading;
//  - reloads the page when app code changes (waiting while a dialog or Design Mode is open);
//  - refreshes the budget immediately when it changes elsewhere (another tab, a bank sync).

// Decides what to do with one server event. Pure, so it can be tested without a browser.
export function decideUpdate(event,pageAssets){
 if(!event||typeof event!=='object')return {action:'none'};
 if(event.type==='hello')return event.assets&&pageAssets&&event.assets!==pageAssets?{action:'reload'}:{action:'budget'};
 if(event.type==='budget')return {action:'budget'};
 if(event.type==='assets'){const files=Array.isArray(event.files)?event.files:[];return files.length&&files.every(f=>f.endsWith('.css'))?{action:'styles',files,version:event.version}:{action:'reload'};}
 return {action:'none'};
}

// Reads newline-separated JSON events from a streaming response.
export async function readEvents(body,onEvent){
 const reader=body.getReader(),decoder=new TextDecoder();let buffer='';
 for(;;){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let i;
  while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i).trim();buffer=buffer.slice(i+1);if(!line)continue;let event;try{event=JSON.parse(line);}catch{continue;}onEvent(event);}}
}

// Points each matching <link rel="stylesheet"> at a fresh copy of its file.
export function swapStyles(files,doc=document){
 const stamp=Date.now();
 for(const link of doc.querySelectorAll('link[rel="stylesheet"]')){const url=new URL(link.getAttribute('href'),location.href);if(files.includes(url.pathname.replace(/^\//,'')))link.setAttribute('href',url.pathname+'?v='+stamp);}
}

export function connectLive({pageAssets,onBudget,canReload,onWaiting,reload=()=>location.reload(),styles=swapStyles,fetchLive=()=>fetch('/api/live',{headers:{'X-Budget-HQ':'1'},cache:'no-store'})}){
 if(typeof location==='undefined'||!/^https?:$/.test(location.protocol||'')||typeof fetch!=='function')return {stop(){}};
 let stopped=false,delay=1000,waiting=null;
 const reloadWhenReady=()=>{if(waiting)return;const attempt=()=>{if(canReload()){reload();return;}onWaiting?.();waiting=setTimeout(()=>{waiting=null;attempt();},1500);};attempt();};
 const handle=event=>{const d=decideUpdate(event,pageAssets);
  if(d.action==='reload')reloadWhenReady();
  else if(d.action==='styles'){styles(d.files);if(d.version)pageAssets=d.version;}
  else if(d.action==='budget')onBudget(event);};
 (async function run(){
  while(!stopped){
   try{const response=await fetchLive();if(response.status===401){location.assign('/login');return;}if(!response.ok||!response.body)throw Error('Live updates unavailable');delay=1000;await readEvents(response.body,handle);}catch{}
   // The connection drops while the server restarts for an update; reconnect and compare versions.
   if(!stopped)await new Promise(r=>setTimeout(r,delay));delay=Math.min(5000,delay*1.5);
  }
 })();
 return {stop(){stopped=true;clearTimeout(waiting);}};
}
