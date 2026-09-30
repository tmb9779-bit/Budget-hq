import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,appendFile,cp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {spawn} from 'node:child_process';import {once} from 'node:events';import {scryptSync} from 'node:crypto';
import {decideUpdate,readEvents} from '../live-updates.js';
import {serverModules} from '../server/live-updates.mjs';
import {createOwnerGate} from '../server/owner-auth.mjs';

const appRoot=new URL('..',import.meta.url).pathname;
const wait=ms=>new Promise(r=>setTimeout(r,ms));

test('browser decides between style swap, reload and budget refresh',()=>{
 assert.deepEqual(decideUpdate({type:'assets',files:['styles.css','palette.css'],version:'v2'},'v1'),{action:'styles',files:['styles.css','palette.css'],version:'v2'});
 assert.equal(decideUpdate({type:'assets',files:['styles.css','app.js']},'v1').action,'reload');
 assert.equal(decideUpdate({type:'hello',assets:'v2'},'v1').action,'reload','page built from older files reloads');
 assert.equal(decideUpdate({type:'hello',assets:'v1'},'v1').action,'budget','same files: just check for budget changes');
 assert.equal(decideUpdate({type:'budget',revision:'r'},'v1').action,'budget');
 assert.equal(decideUpdate({type:'unknown'},'v1').action,'none');
});

test('event stream parser handles lines split across chunks and heartbeats',async()=>{
 const text='{"type":"hello","assets":"a"}\n\n{"type":"bud'+'get","revision":"r"}\nnot json\n';
 const bytes=new TextEncoder().encode(text);let i=0;
 const body={getReader:()=>({read:async()=>i<bytes.length?{value:bytes.subarray(i,i+=7),done:false}:{done:true}})};
 const events=[];await readEvents(body,e=>events.push(e));
 assert.deepEqual(events.map(e=>e.type),['hello','budget']);
});

test('only files the server loads trigger a restart',()=>{
 const files=serverModules(appRoot);
 for(const f of ['package.json','server/server.mjs','server/model.mjs','schedule.js','analysis.js','server/live-updates.mjs'])assert.ok(files.has(f),f);
 for(const f of ['app.js','styles.css','index.html','live-updates.js','design-editor.js'])assert.ok(!files.has(f),f);
});

test('sign-ins survive a server restart when a session store is provided',async()=>{
 const saved=new Map(),sessionStore={get:async(k,d)=>structuredClone(saved.get(k)??d),put:async(k,v)=>saved.set(k,structuredClone(v))};
 const salt='s',password='pw-long-enough',load=async()=>({salt,hash:scryptSync(password,salt,64).toString('hex')});
 const call=async(gate,path,method='GET',cookie='',body)=>{const headers={'x-budget-hq':'1',cookie};const req=(async function*(){if(body)yield Buffer.from(JSON.stringify(body));})();Object.assign(req,{method,headers});const res={headers:{},status:0,setHeader(k,v){this.headers[k]=v;},writeHead(s){this.status=s;},end(){}};const passed=await gate(req,res,new URL('http://localhost:4173'+path));return {passed,res};};
 const first=createOwnerGate({load,sessionStore});const login=await call(first,'/api/owner/login','POST','',{password});
 const cookie=login.res.headers['Set-Cookie'].split(';')[0];assert.equal(login.res.status,200);
 assert.ok(!JSON.stringify([...saved.values()]).includes(cookie.split('=')[1]),'raw token is never stored');
 const restarted=createOwnerGate({load,sessionStore});assert.equal((await call(restarted,'/api/budget','GET',cookie)).passed,true);
 await call(restarted,'/api/owner/logout','POST',cookie);
 assert.equal((await call(createOwnerGate({load,sessionStore}),'/api/budget','GET',cookie)).passed,false,'sign-out also survives restarts');
});

test('end to end: styles, app code, budget changes and server code updates reach an open page',{timeout:60000},async t=>{
 const dir=await mkdtemp(join(tmpdir(),'budget-live-')),app=join(dir,'app'),data=join(dir,'data');
 t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(appRoot,app,{recursive:true,filter:src=>!/[\\/](\.git|test)([\\/]|$)/.test(src.slice(appRoot.length-1))});
 await mkdir(join(data,'BudgetHQ'),{recursive:true});const salt='live-salt',password='live-test-password';
 await writeFile(join(data,'BudgetHQ','owner.json'),JSON.stringify({salt,hash:scryptSync(password,salt,64).toString('hex')}));
 const launcher=spawn(process.execPath,['server/supervisor.mjs'],{cwd:app,env:{...process.env,BUDGET_HQ_DATA_HOME:data,BUDGET_HQ_PORT:'4183'},stdio:['ignore','pipe','pipe']});
 let output='';launcher.stdout.on('data',b=>output+=b);launcher.stderr.on('data',b=>output+=b);
 t.after(async()=>{if(launcher.exitCode===null){const exited=once(launcher,'exit');launcher.kill('SIGTERM');await exited;}});
 const until=async(check,label,ms=15000)=>{const end=Date.now()+ms;while(Date.now()<end){const v=await check();if(v)return v;await wait(100);}throw Error('Timed out waiting for '+label+'\n'+output);};
 await until(()=>output.includes('Budget HQ Independent:'),'server start');
 const base='http://127.0.0.1:4183',H={'X-Budget-HQ':'1','Content-Type':'application/json'};
 const login=await fetch(base+'/api/owner/login',{method:'POST',headers:H,body:JSON.stringify({password})});const Cookie=login.headers.get('set-cookie').split(';')[0],headers={...H,Cookie};
 const page=await (await fetch(base+'/',{headers:{Cookie}})).text();const pageAssets=page.match(/name="budget-hq-assets" content="([^"]+)"/)[1];
 // Open the live connection the way the browser does and record every event.
 const events=[];let streams=0;
 const listen=async()=>{for(;;){try{const r=await fetch(base+'/api/live',{headers});if(r.status!==200)throw Error(String(r.status));streams++;await readEvents(r.body,e=>events.push(e));}catch{}if(launcher.exitCode!==null)return;await wait(300);}};
 listen();
 const hello=await until(()=>events.find(e=>e.type==='hello'),'hello');assert.equal(hello.assets,pageAssets);assert.equal(decideUpdate(hello,pageAssets).action,'budget');

 await appendFile(join(app,'palette.css'),'\n/* live style test */\n');
 const styles=await until(()=>events.find(e=>e.type==='assets'),'style change');
 assert.deepEqual(styles.files,['palette.css']);assert.equal(decideUpdate(styles,pageAssets).action,'styles');
 assert.match(await (await fetch(base+'/palette.css',{headers:{Cookie}})).text(),/live style test/,'server serves the new file without restarting');

 await appendFile(join(app,'app.js'),'\n// live code test\n');
 const code=await until(()=>events.filter(e=>e.type==='assets').find(e=>e.files.includes('app.js')),'app code change');assert.equal(decideUpdate(code,pageAssets).action,'reload');

 const budget=await (await fetch(base+'/api/budget',{headers})).json();
 await fetch(base+'/api/write',{method:'POST',headers,body:JSON.stringify({revision:budget.book.revision,operationId:'live-1',action:'decision',data:{name:'Live',notes:'test'}})});
 const change=await until(()=>events.find(e=>e.type==='budget'),'budget change');assert.notEqual(change.revision,budget.book.revision);

 // Server code update: the launcher restarts the server, the page reconnects, and the sign-in still works.
 const bootBefore=hello.boot;await appendFile(join(app,'server','config.mjs'),'\n// live restart test\n');
 const again=await until(()=>events.filter(e=>e.type==='hello').find(e=>e.boot!==bootBefore),'restart',25000);
 assert.ok(streams>=2);assert.match(output,/Restarting the server/);
 assert.equal((await fetch(base+'/api/revision',{headers})).status,200,'still signed in after the restart');
 assert.equal(decideUpdate(again,pageAssets).action,'reload','page built before the updates reloads');

 const exited=once(launcher,'exit');launcher.kill('SIGTERM');const [codeOnExit]=await exited;assert.equal(codeOnExit,0);
});
