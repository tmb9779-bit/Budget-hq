import {calendarView} from './calendar-view.mjs';
import {PlaidWebhooks,webhookURL} from './plaid-webhooks.mjs';
import {PlaidSchedule} from './plaid-schedule.mjs';
import {PlaidConnection} from './plaid-connection.mjs';
import {networkPolicy} from './network-policy.mjs';
import {deliverMonthlyReview,deliverYearlyReview,validateMail,sendTestMail} from './review-mail.mjs';
import {productPhoto} from './product-photo.mjs';
import {LiveHub,watchAppFiles,serverModules} from './live-updates.mjs';
import {remotePolicy,remoteConfigLoader} from './remote-access.mjs';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {createStore} from './store-factory.mjs';
import {createOwnerGate,jsonBody} from './owner-auth.mjs';
import {BudgetService} from './service.mjs';
import {migrate} from './migrate.mjs';
import {fresh,eventsFor,incomeEvents,dateValid} from './model.mjs';
import {fullSampleBudget as sampleBudget} from './sample.mjs';
import {configDir,timeZone,storeNames,port} from './config.mjs';import {bringOverTrips} from './legacy-trips.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url))),sampleMode=process.argv.includes('--sample'),store=createStore(sampleMode?storeNames.sampleBudget:storeNames.budget);
const runningVersion=JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;
const service=await new BudgetService(store,async()=>{if(sampleMode)return sampleBudget();const book=fresh();book.settings.buffer=0;return book;}).init();
const bankWebhookURL=webhookURL(process.env.BUDGET_HQ_PLAID_WEBHOOK_URL);
const plaid=new PlaidConnection(createStore(sampleMode?storeNames.samplePlaid:storeNames.plaid),{sample:sampleMode,webhook:bankWebhookURL});
async function syncAccounts(action,body={}){const startedAt=Date.now(),result=await plaid[action](body);const report=await service.syncPlaidAccounts((await plaid.snapshots()).filter(i=>action==='refresh'||action==='check'&&i.id===body.id||action==='finish'&&(Date.parse(i.checkedAt)>=startedAt||i.error)));await store.put('account-sync-report',report);return {...result,accountSync:report};}
const bankSchedule=new PlaidSchedule({store,refresh:()=>syncAccounts('refresh'),connected:async()=>{const s=await plaid.status();return s.configured&&s.items.length>0;},timeZone});
const network=networkPolicy();
// Phone access from anywhere via Tailscale (see remote-access.mjs). Off until setup-phone.mjs turns it on.
const remote=remotePolicy(remoteConfigLoader(configDir)),originAllowed=req=>remote.isRemote(req)?remote.originAllowed(req):network.originAllowed(req);
// Sign-ins are kept (encrypted) across server restarts, so an automatic update does not sign you out.
const gate=createOwnerGate({originAllowed,secure:remote.secure,sessionStore:createStore('owner-sessions')});
const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/styles.css':'styles.css','/trip-planner.js':'trip-planner.js','/scenario.js':'scenario.js','/workflow.js':'workflow.js','/login':'login.html','/login.js':'login.js'};
files['/bank-matches.js']='bank-matches.js';files['/section-state.js']='section-state.js';files['/mobile.css']='mobile.css';
files['/desktop-theme.css']='desktop-theme.css';files['/refined-expenses.css']='refined-expenses.css';
files['/refinement-086.css']='refinement-086.css';files['/refinement-085.css']='refinement-085.css';files['/refinement-083.css']='refinement-083.css';files['/refinement-082.css']='refinement-082.css';files['/palette.css']='palette.css';files['/refinements.css']='refinements.css';for(const name of ['tools.css','tools-ui.js','tools-data.js','tools-reference.css'])files['/'+name]=name;
files['/plan-view.js']='plan-view.js';files['/analysis.js']='analysis.js';files['/income-source.js']='income-source.js';files['/financial-goals.js']='financial-goals.js';files['/schedule.js']='schedule.js';files['/categories.js']='categories.js';files['/live-updates.js']='live-updates.js';files['/manifest.webmanifest']='manifest.webmanifest';for(const size of [180,192,512])files['/public/app-icon-'+size+'.png']='public/app-icon-'+size+'.png';
for(const name of ['design-render.js','design-editor.js','design-schema.js','design-editor.css','design-styles.js','design-elements.js'])files['/'+name]=name;
for(const name of ['bill-review.js','need-matches.js','icon-catalog.js','priority-allocation.js','recommended-goals.js','budget-updates.css'])files['/'+name]=name;
files['/public/app-icon.svg']='public/app-icon.svg';files['/public/fallback-meme.svg']='public/fallback-meme.svg';
files['/service-worker.js']='service-worker.js';files['/offline.html']='offline.html';files['/pwa-register.js']='pwa-register.js';
// App files are read once per server start. Browsers revalidate with ETag and reuse their copy when nothing changed.
const assets=new Map(),appFiles=new Set(Object.values(files));
async function staticAsset(name){let asset=assets.get(name);if(!asset){let content=await readFile(join(root,name));if(name==='index.html')content=Buffer.from(String(content).replace('</head>','<meta name="budget-hq-assets" content="'+assetsVersion+'"></head>'));asset={content,etag:'"'+createHash('sha256').update(content).digest('base64url').slice(0,27)+'"',type:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.png')?'image/png':name.endsWith('.webmanifest')?'application/manifest+json':'text/html'};assets.set(name,asset);}return asset;}

// Live updates. assetsVersion fingerprints every browser file; each page carries the value it was built with,
// so a tab can tell when it is out of date. Changed files are announced to open tabs straight away.
const live=new LiveHub(),supervised=process.env.BUDGET_HQ_SUPERVISED==='1';let assetsVersion=await fingerprint();
async function fingerprint(){const hash=createHash('sha256');for(const name of [...appFiles].sort()){hash.update(name);try{hash.update(await readFile(join(root,name)));}catch{hash.update('missing');}}return hash.digest('base64url').slice(0,16);}
const stopWatching=watchAppFiles(root,async paths=>{
 const changed=paths.filter(p=>appFiles.has(p));if(!changed.length)return;
 assetsVersion=await fingerprint();for(const name of changed)assets.delete(name);assets.delete('index.html');
 // Under the launcher, server code changes restart this process; the new process tells the tabs to reload.
 if(supervised){const restartFiles=serverModules(root);if(changed.some(p=>restartFiles.has(p)))return;}
 live.send({type:'assets',files:changed,version:assetsVersion});
});
service.onChange(book=>live.send({type:'budget',revision:book.revision}));
const server=createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'");
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 try{
  if(remote.isRemote(req)){const why=remote.refusal(req);if(why){send(403,{error:why});return;}}
  else if(!network.hostAllowed(req.headers.host)||!network.peerAllowed(req.socket.remoteAddress)){send(403,{error:'Open http://localhost:'+port});return;}
  const url=new URL(req.url,'http://localhost:4173');if(!await gate(req,res,url))return;
  if(url.pathname.startsWith('/api/')){
   if(req.headers['x-budget-hq']!=='1'||!originAllowed(req)||req.headers['sec-fetch-site']==='cross-site'){send(403,{error:'Open Budget HQ directly.'});return;}
   if(req.method==='GET'){
    if(url.pathname==='/api/mail/status')return send(200,{configured:!!(await createStore('private-mail').get('smtp'))});
    if(url.pathname==='/api/plaid/status')return send(200,{...await plaid.status(),webhook:{enabled:!!bankWebhookURL&&!sampleMode,pending:(await store.get('webhook-queue',[])).length,dropped:(await store.get('webhook-dropped',[])).slice(0,5)},schedule:await bankSchedule.status(),accountSync:await store.get('account-sync-report')});
    if(url.pathname==='/api/revision')return send(200,service.revision());
    if(url.pathname==='/api/live')return live.connect(req,res,{version:runningVersion,assets:assetsVersion,...service.revision()});
    if(url.pathname==='/api/budget')return send(200,{...service.read(),appVersion:runningVersion});
    if(url.pathname==='/api/calendar'){const start=url.searchParams.get('start'),end=url.searchParams.get('end');if(!dateValid(start)||!dateValid(end)||end<start||Date.parse(end)-Date.parse(start)>370*86400000)throw Error('Choose a valid calendar range.');const snapshot=service.read(),book=snapshot.book,asOf=snapshot.summary.asOf,current=url.searchParams.get('revision')===book.revision&&url.searchParams.get('asOf')===asOf;return send(200,{...calendarView(book,start,end,asOf,snapshot.summary),...(current?{}:{budget:snapshot})});}
    if(url.pathname==='/api/history')return send(200,{history:service.history(),backups:await service.backups()});
    if(url.pathname==='/api/export'){res.setHeader('Content-Disposition','attachment; filename="Budget-HQ-backup.json"');return send(200,service.read().book);}
   }
   if(req.method==='POST'){
    const body=await jsonBody(req,250000);
    const bankActions={'/api/plaid/configure':'configure','/api/plaid/start':'start','/api/plaid/finish':'finish','/api/plaid/check':'check','/api/plaid/disconnect':'disconnect','/api/plaid/refresh':'refresh'};
    if(bankActions[url.pathname]){const action=bankActions[url.pathname];return send(200,['finish','check','refresh'].includes(action)?await syncAccounts(action,body):await plaid[action](body));}
    if(url.pathname==='/api/mail/test'){if(sampleMode)throw Error('Test email is unavailable in sample mode.');const config=await createStore('private-mail').get('smtp');if(!config)throw Error('Set up email sending first.');const recipient=String(body.email||service.envelope.book.settings.reviewEmail?.email||'').trim();await sendTestMail(config,recipient);return send(200,{accepted:true,recipient});}
    if(url.pathname==='/api/mail/configure'){const config=validateMail(body);await createStore('private-mail').put('smtp',{host:config.host,from:config.from,user:config.user,password:config.password});service.mailStatus='SMTP configured · email reports follow your saved preferences';return send(200,{configured:true});}
    if(url.pathname==='/api/product-photo')return send(200,await productPhoto(String(body.url||'')));
    if(url.pathname==='/api/write')return send(200,await service.write(body));
    if(url.pathname==='/api/backup')return send(200,await service.backup());
    if(url.pathname==='/api/preview')return send(200,await service.preview(body));
    if(url.pathname==='/api/restore')return send(200,await service.restore(body));
   }
   return send(404,{error:'This action is not available.'});
  }
  if(req.method!=='GET'||!files[url.pathname])return send(404,{error:'Not found.'});
  const asset=await staticAsset(files[url.pathname]);res.setHeader('Cache-Control','no-cache');if(url.pathname==='/service-worker.js')res.setHeader('Service-Worker-Allowed','/');res.setHeader('ETag',asset.etag);if(req.headers['if-none-match']===asset.etag){res.writeHead(304);res.end();return;}res.writeHead(200,{'Content-Type':asset.type});res.end(asset.content);
 }catch(e){send(400,{error:e.message||'The change could not be saved.'});}
});
server.listen(port,network.bind,()=>{console.log('Budget HQ Independent: http://localhost:'+port+' — Plaid account balances enabled; no spreadsheet dependency.');if(network.phone){console.log('Phone preview: sample budget only. Use trusted private Wi-Fi; keep this window open.');for(const ip of network.addresses)console.log('Open on your phone: http://'+ip+':'+port);if(!network.addresses.length)console.log('No private IPv4 address found. Connect the PC to your home Wi-Fi and restart.');}});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port '+port+' is in use. Stop the old Budget HQ server first.':e.message);process.exitCode=1;});
async function dailyTasks(){await service.daily();const config=await createStore('private-mail').get('smtp'),book=service.envelope.book,data=service.read().summary;service.mailStatus='Monthly: '+await deliverMonthlyReview(store,book,data,config)+' · Yearly: '+await deliverYearlyReview(store,book,data,config);}
const timer=setInterval(()=>dailyTasks().catch(()=>{service.mailStatus='Daily tasks failed; check local storage.';}),3600000);timer.unref();
dailyTasks().catch(()=>{service.mailStatus='Daily tasks failed; check local storage.';});

const plaidTimer=setInterval(()=>bankSchedule.tick().catch(()=>{}),30000);plaidTimer.unref();bankSchedule.tick().catch(()=>{});

// Optional public HTTPS ingress forwards ONLY /plaid/webhook to localhost:4174.
let receiver=null;
if(bankWebhookURL&&!sampleMode){
 const hooks=new PlaidWebhooks({store,getKey:k=>plaid.verificationKey(k),knownItem:async id=>(await plaid.status()).items.some(i=>i.id===id),refresh:async(id,event)=>{await plaid.noteWebhook(id,event);const result=await syncAccounts('check',{id});const i=result.items.find(i=>i.id===id);if(i?.error||i?.transactionsError)throw Error('Bank update incomplete.');}});
 receiver=createServer(async(req,res)=>{if(req.method!=='POST'||req.url!=='/plaid/webhook'){res.writeHead(404);res.end();return;}try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)throw Error('Too large');chunks.push(chunk);}await hooks.accept(Buffer.concat(chunks),req.headers['plaid-verification']);res.writeHead(200);res.end('{}');}catch{res.writeHead(400);res.end('{}');}});receiver.requestTimeout=10000;receiver.headersTimeout=10000;receiver.listen(4174,'127.0.0.1');receiver.on('error',()=>console.error('Plaid webhook receiver could not start on localhost:4174.'));
 const hookTimer=setInterval(()=>hooks.tick().catch(()=>{}),30000);hookTimer.unref();hooks.tick().catch(()=>{});
}

// Clean shutdown (requested by the launcher before a restart, or Ctrl+C): stop accepting requests,
// close live connections, let pending saves finish, then exit.
let shuttingDown=false;
async function shutdown(){
 if(shuttingDown)return;shuttingDown=true;const force=setTimeout(()=>process.exit(0),4000);force.unref();
 stopWatching();live.close();server.close();server.closeAllConnections?.();receiver?.close();
 try{await service.serial(async()=>{});}catch{}
 process.exit(0);
}
process.on('message',m=>{if(m?.type==='shutdown')shutdown();});
process.on('disconnect',shutdown);
for(const signal of ['SIGINT','SIGTERM','SIGBREAK'])process.on(signal,shutdown);
