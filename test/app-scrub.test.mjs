import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Readable} from 'node:stream';
import vm from 'node:vm';
import {createOwnerGate,hashPassword} from '../server/owner-auth.mjs';

const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('PWA registration persists and its offline Retry works under the server CSP',async()=>{
 const app=source('app.js'),register=source('pwa-register.js'),offline=source('offline.html'),worker=source('service-worker.js');
 assert.doesNotMatch(app,/serviceWorker\.getRegistrations\(|\.unregister\(\)/);
 assert.match(offline,/<a href="\/">Try again<\/a>/);assert.doesNotMatch(offline,/onclick=|<script/);
 assert.match(worker,/event\.request\.mode !== 'navigate'/);assert.match(worker,/caches\.match\('\/offline\.html'\)/);
 let load,registered='',scope='';const context={navigator:{serviceWorker:{register:async(url,options)=>{registered=url;scope=options.scope;}}},window:{isSecureContext:true,addEventListener:(name,fn)=>{if(name==='load')load=fn;}}};
 vm.runInNewContext(register,context);assert.equal(typeof load,'function');load();await new Promise(resolve=>setImmediate(resolve));assert.equal(registered,'/service-worker.js');assert.equal(scope,'/');
});

test('password changes invalidate saved and live sessions while an ordinary restart preserves them',async()=>{
 let password='first-long-password',owner={salt:'test-salt',hash:hashPassword(password,'test-salt')};
 const data=new Map(),sessionStore={get:async key=>structuredClone(data.get(key)||{}),put:async(key,value)=>data.set(key,structuredClone(value))};
 const make=()=>createOwnerGate({load:async()=>owner,sessionStore,now:()=>1000});
 const request=async(gate,path,{cookie='',login=false}={})=>{
  const req=login?Readable.from([JSON.stringify({password})]):Readable.from([]);req.method=login?'POST':'GET';req.headers={cookie,'x-budget-hq':'1',host:'localhost:4173'};
  const result={};const res={setHeader:(name,value)=>{result[name]=value;},writeHead:status=>{result.status=status;},end:()=>{}};
  result.allowed=await gate(req,res,new URL('http://localhost:4173'+path));return result;
 };
 let gate=make(),signed=await request(gate,'/api/owner/login',{login:true});assert.equal(signed.status,200);const cookie=signed['Set-Cookie'].split(';')[0];
 assert.equal((await request(gate,'/api/budget',{cookie})).allowed,true);
 gate=make();assert.equal((await request(gate,'/api/budget',{cookie})).allowed,true);
 password='second-long-password';owner={salt:'new-salt',hash:hashPassword(password,'new-salt')};
 assert.equal((await request(gate,'/api/budget',{cookie})).status,401);
 gate=make();assert.equal((await request(gate,'/api/budget',{cookie})).status,401);
 assert.equal((await request(gate,'/api/owner/login',{login:true})).status,200);
});
