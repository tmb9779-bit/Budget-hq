import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,chmod,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {spawn,execFile} from 'node:child_process';import {once} from 'node:events';import {scryptSync} from 'node:crypto';import http from 'node:http';
import {remotePolicy} from '../server/remote-access.mjs';

const HOST='budget-pc.tail1234.ts.net',LOGIN='me@example.com',appRoot=new URL('..',import.meta.url).pathname;
const req=(headers,remoteAddress='127.0.0.1')=>({headers:{host:HOST,...headers},socket:{remoteAddress}});

test('remote requests must come through Tailscale, from your own account, never from the public internet',()=>{
 const p=remotePolicy(()=>({host:HOST,login:LOGIN}));
 assert.equal(p.refusal(req({'tailscale-user-login':LOGIN})),'');
 assert.equal(p.refusal(req({'tailscale-user-login':'ME@EXAMPLE.COM'})),'','login match ignores case');
 assert.match(p.refusal(req({})),/Sign in to Tailscale/);
 assert.match(p.refusal(req({'tailscale-user-login':'someone@else.com'})),/not allowed/);
 assert.match(p.refusal(req({'tailscale-user-login':LOGIN,'tailscale-funnel-request':'?1'})),/public internet/);
 assert.match(p.refusal(req({'tailscale-user-login':LOGIN},'192.168.1.20')),/through Tailscale/,'direct network connections are refused');
 assert.equal(p.originAllowed(req({origin:'https://'+HOST})),true);
 assert.equal(p.originAllowed(req({origin:'http://'+HOST})),false);
 assert.equal(p.originAllowed(req({origin:'https://evil.example'})),false);
 assert.equal(p.isRemote(req({})),true);assert.equal(p.isRemote({headers:{host:'localhost:4173'},socket:{}}),false);
 const off=remotePolicy(()=>null);assert.equal(off.isRemote(req({})),false);
});

async function fakeTailscale(dir,{dnsName=HOST+'.',running=true,serveFails=false}={}){
 const log=join(dir,'tailscale-calls.log'),script=join(dir,'tailscale');
 await writeFile(script,`#!/usr/bin/env node
const fs=require('fs');const a=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(log)},a.join(' ')+'\\n');
if(a[0]==='version'){console.log('1.80.0');process.exit(0);}
if(a[0]==='status')console.log(JSON.stringify({BackendState:${JSON.stringify(running?'Running':'NeedsLogin')},Self:{DNSName:${JSON.stringify(dnsName)},UserID:42},User:{'42':{LoginName:${JSON.stringify(LOGIN)}}}}));
if(a[0]==='serve'&&${serveFails}){console.error('HTTPS is not enabled for your tailnet');process.exit(1);}
`);await chmod(script,0o755);return {script,log};
}
const runSetup=(env,args=[])=>new Promise(r=>execFile(process.execPath,['server/setup-phone.mjs',...args],{cwd:appRoot,env:{...process.env,...env}},(e,out,err)=>r({code:e?.code??0,out:out+err})));

test('setup turns phone access on through Tailscale, and off again',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'budget-phone-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await mkdir(join(dir,'BudgetHQ'),{recursive:true});await writeFile(join(dir,'BudgetHQ','owner.json'),'{}');
 const {script,log}=await fakeTailscale(dir),env={BUDGET_HQ_DATA_HOME:dir,BUDGET_HQ_TAILSCALE:script};
 const on=await runSetup(env);assert.equal(on.code,0,on.out);assert.match(on.out,new RegExp('https://'+HOST.replace(/\./g,'\\.')));
 assert.deepEqual(JSON.parse(await readFile(join(dir,'BudgetHQ','remote-access.json'),'utf8')),{...JSON.parse(await readFile(join(dir,'BudgetHQ','remote-access.json'),'utf8')),enabled:true,host:HOST,login:LOGIN});
 const calls=await readFile(log,'utf8');assert.match(calls,/^serve --bg http:\/\/127\.0\.0\.1:4173$/m);assert.doesNotMatch(calls,/funnel/,'never publishes to the internet');
 const off=await runSetup(env,['--off']);assert.equal(off.code,0);assert.equal(JSON.parse(await readFile(join(dir,'BudgetHQ','remote-access.json'),'utf8')).enabled,false);
 assert.match(await readFile(log,'utf8'),/serve --https=443 off/);
 assert.match((await runSetup(env,['--status'])).out,/OFF/);
});

test('setup explains what to fix when Tailscale is not ready',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'budget-phone-'));t.after(()=>rm(dir,{recursive:true,force:true}));await mkdir(join(dir,'BudgetHQ'),{recursive:true});
 assert.match((await runSetup({BUDGET_HQ_DATA_HOME:dir,BUDGET_HQ_TAILSCALE:join(dir,'none')})).out,/password first/);
 await writeFile(join(dir,'BudgetHQ','owner.json'),'{}');
 const missing=await runSetup({BUDGET_HQ_DATA_HOME:dir,BUDGET_HQ_TAILSCALE:join(dir,'none'),PATH:'/nonexistent'});assert.equal(missing.code,1);assert.match(missing.out,/not installed/);
 const signedOut=await fakeTailscale(dir,{running:false});assert.match((await runSetup({BUDGET_HQ_DATA_HOME:dir,BUDGET_HQ_TAILSCALE:signedOut.script})).out,/not signed in/);
 const noDns=await fakeTailscale(dir,{dnsName:''});assert.match((await runSetup({BUDGET_HQ_DATA_HOME:dir,BUDGET_HQ_TAILSCALE:noDns.script})).out,/MagicDNS/);
 const noHttps=await fakeTailscale(dir,{serveFails:true});const r=await runSetup({BUDGET_HQ_DATA_HOME:dir,BUDGET_HQ_TAILSCALE:noHttps.script});assert.equal(r.code,1);assert.match(r.out,/HTTPS/);
 await assert.rejects(readFile(join(dir,'BudgetHQ','remote-access.json')),'access stays off when setup fails');
});

test('running server: your phone can sign in through Tailscale; everything else is refused',{timeout:30000},async t=>{
 const dir=await mkdtemp(join(tmpdir(),'budget-phone-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const cfg=join(dir,'BudgetHQ'),password='phone-test-password';await mkdir(cfg,{recursive:true});
 await writeFile(join(cfg,'owner.json'),JSON.stringify({salt:'s',hash:scryptSync(password,'s',64).toString('hex')}));
 await writeFile(join(cfg,'remote-access.json'),JSON.stringify({enabled:true,host:HOST,login:LOGIN}));
 const server=spawn(process.execPath,['server/server.mjs'],{cwd:appRoot,env:{...process.env,BUDGET_HQ_DATA_HOME:dir,BUDGET_HQ_PORT:'4185'},stdio:['ignore','pipe','pipe']});
 let output='';server.stdout.on('data',b=>output+=b);server.stderr.on('data',b=>output+=b);
 t.after(async()=>{if(server.exitCode===null){const e=once(server,'exit');server.kill('SIGTERM');await e;}});
 for(let i=0;i<100&&!output.includes('Budget HQ Independent');i++)await new Promise(r=>setTimeout(r,100));
 const call=(path,{method='GET',headers={},body}={})=>new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port:4185,path,method,headers},res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:data}));});r.on('error',reject);if(body)r.write(body);r.end();});
 const phone={host:HOST,'tailscale-user-login':LOGIN};
 assert.equal((await call('/',{headers:{host:HOST}})).status,403,'no Tailscale identity');
 assert.equal((await call('/',{headers:{...phone,'tailscale-funnel-request':'?1'}})).status,403,'public internet');
 assert.equal((await call('/',{headers:{...phone,'tailscale-user-login':'other@example.com'}})).status,403,'another account');
 assert.equal((await call('/',{headers:{host:'evil.example'}})).status,403,'unknown address');
 assert.equal((await call('/',{headers:phone})).status,303,'your phone is sent to the password page');
 assert.equal((await call('/api/budget',{headers:{...phone,'x-budget-hq':'1'}})).status,401,'password still required');
 assert.equal((await call('/public/app-icon-180.png',{headers:phone})).headers['content-type'],'image/png','home-screen icon loads before sign-in');
 const wrongScheme=await call('/api/owner/login',{method:'POST',headers:{...phone,'x-budget-hq':'1','content-type':'application/json',origin:'http://'+HOST},body:JSON.stringify({password})});
 assert.equal(wrongScheme.status,403);
 const login=await call('/api/owner/login',{method:'POST',headers:{...phone,'x-budget-hq':'1','content-type':'application/json',origin:'https://'+HOST},body:JSON.stringify({password})});
 assert.equal(login.status,200,login.body);const setCookie=String(login.headers['set-cookie']);assert.match(setCookie,/; Secure/);assert.match(setCookie,/HttpOnly/);
 const cookie=setCookie.split(';')[0];
 const budget=await call('/api/budget',{headers:{...phone,'x-budget-hq':'1',cookie}});assert.equal(budget.status,200);assert.ok(JSON.parse(budget.body).book);
 const page=await call('/',{headers:{...phone,cookie}});assert.equal(page.status,200);assert.match(page.body,/rel="manifest"/);
 assert.equal((await call('/',{headers:{host:'localhost:4185'}})).status,303,'the PC itself still works as before');
 // Turning access off takes effect within a few seconds, even for a signed-in phone.
 await writeFile(join(cfg,'remote-access.json'),JSON.stringify({enabled:false,host:HOST,login:LOGIN}));await new Promise(r=>setTimeout(r,3300));
 assert.equal((await call('/api/budget',{headers:{...phone,'x-budget-hq':'1',cookie}})).status,403);
});
