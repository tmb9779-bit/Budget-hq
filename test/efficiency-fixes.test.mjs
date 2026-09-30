import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {jsonBody} from '../server/owner-auth.mjs';
import {PrivateStore} from '../server/private-store.mjs';
import {BudgetService,backupsToPrune,withHistory} from '../server/service.mjs';
import {PlaidWebhooks,MAX_WEBHOOK_ATTEMPTS} from '../server/plaid-webhooks.mjs';
import {fresh,occurrences,addDays} from '../server/model.mjs';
import {applyPlaidProducts} from '../server/plaid-ledger.mjs';

async function service(t){const dir=await mkdtemp(join(tmpdir(),'budget-fix-'));t.after(()=>rm(dir,{recursive:true,force:true}));const store=new PrivateStore(dir);return {store,s:await new BudgetService(store,async()=>fresh()).init()};}
const save=(s,id,buffer)=>s.write({revision:s.read().book.revision,operationId:id,action:'settings',data:{buffer,planningConfirmed:true}});

test('request bodies keep accented characters and emoji split across network chunks',async()=>{
 const raw=Buffer.from(JSON.stringify({note:'café 🎉 niño'}));
 async function* chunks(){for(let i=0;i<raw.length;i+=3)yield raw.subarray(i,i+3);}
 assert.deepEqual(await jsonBody(chunks()),{note:'café 🎉 niño'});
 async function* big(){yield Buffer.alloc(30,'a');}
 await assert.rejects(jsonBody(big(),20),/too large/);
});

test('only the newest history entry keeps a full budget copy, and undo still works',async t=>{
 const {s,store}=await service(t);
 for(let i=0;i<5;i++)await save(s,'op'+i,100+i);
 const saved=await store.get('budget');
 assert.equal(saved.history.length,5);assert.ok(saved.history[0].before);
 assert.ok(saved.history.slice(1).every(h=>!('before' in h)&&h.id&&h.action&&h.date));
 const preview=await s.preview({kind:'undo',id:s.history()[0].id});const undone=await s.restore({token:preview.token});
 assert.equal(undone.book.settings.buffer,103);
});

test('older saved budgets are slimmed on startup without losing the undo copy',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'budget-fix-'));t.after(()=>rm(dir,{recursive:true,force:true}));const store=new PrivateStore(dir);
 const book=fresh(),old=fresh();await store.put('budget',{book,history:[1,2,3].map(n=>({id:'h'+n,action:'x',date:new Date().toISOString(),before:old}))});
 await new BudgetService(store,async()=>fresh()).init();const saved=await store.get('budget');
 assert.ok(saved.history[0].before);assert.ok(saved.history.slice(1).every(h=>!h.before));
 assert.deepEqual(withHistory({id:'n',before:book},saved.history).map(h=>'before' in h),[true,false,false,false]);
});

test('automatic backups are pruned; manual backups are kept',()=>{
 const daily=Array.from({length:60},(_,i)=>'backup-'+addDays('2026-07-01',i)),manual=['backup-1758000000000-abcd1234'],safety=Array.from({length:13},(_,i)=>'backup-before-restore-'+(1758000000000+i));
 const pruned=new Set(backupsToPrune([...daily,...manual,...safety]));
 for(const n of daily.slice(-14))assert.ok(!pruned.has(n),'recent daily kept '+n);
 for(const month of ['2026-07','2026-08'])assert.ok(daily.some(n=>n.startsWith('backup-'+month)&&!pruned.has(n)),'one copy per month kept');
 assert.ok(!pruned.has(manual[0]));
 assert.deepEqual([...pruned].filter(n=>n.startsWith('backup-before-restore-')).sort(),safety.slice(0,3));
 assert.equal(backupsToPrune(daily.slice(0,5)).length,0);
});

test('budget reads reuse one calculation until the budget or the date changes',async t=>{
 const {s}=await service(t);const first=s.computed();assert.equal(s.computed(),first);
 assert.deepEqual(s.revision(),{revision:s.read().book.revision,asOf:s.read().summary.asOf});
 await save(s,'change',250);assert.notEqual(s.computed(),first);assert.equal(s.read().summary.cash.bufferTarget,250);
 assert.equal('transactions' in s.read().summary,false,'transactions are sent once, in the budget');
});

test('recurring dates are the same when counted from a very old anchor',()=>{
 assert.deepEqual(occurrences('2016-01-31','Monthly','2026-02-01','2026-04-30'),['2026-02-28','2026-03-31','2026-04-30']);
 assert.deepEqual(occurrences('2019-09-06','Biweekly','2026-09-01','2026-09-30'),['2026-09-11','2026-09-25']);
 assert.deepEqual(occurrences('2020-02-29','Yearly','2024-01-01','2025-12-31'),['2024-02-29','2025-02-28']);
});

test('large bank imports finish quickly and still flag possible duplicates',()=>{
 const b=fresh();b.accounts=[{id:'c',kind:'cash',active:true,plaid:{accountId:'pc'}}];
 for(let i=0;i<6000;i++)b.transactions.push({id:'m'+i,accountId:'c',amount:1000+i,direction:'Outflow',date:addDays('2025-01-01',i%500)});
 const txs=Array.from({length:6000},(_,i)=>({transaction_id:'t'+i,account_id:'pc',amount:20000+i,date:addDays('2025-01-01',i%500),iso_currency_code:'USD',name:'Shop'}));
 txs.push({transaction_id:'dup',account_id:'pc',amount:1000,date:'2025-01-02',iso_currency_code:'USD',name:'Maybe same'});
 const started=performance.now();applyPlaidProducts(b,[{id:'it',name:'Bank',transactions:txs}],[],'2026-09-19');
 assert.ok(performance.now()-started<1500,'import took '+(performance.now()-started)+' ms');
 assert.equal(b.reviewTransactions.length,1);assert.equal(b.reviewTransactions[0].plaidTransactionId,'dup');
});

const now=Date.now(),{publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'P-256'}),key={...publicKey.export({format:'jwk'}),kid:'key',alg:'ES256',expired_at:null};
function signed(raw){const h=Buffer.from(JSON.stringify({alg:'ES256',kid:'key'})).toString('base64url'),p=Buffer.from(JSON.stringify({iat:Math.floor(now/1000),request_body_sha256:createHash('sha256').update(raw).digest('hex')})).toString('base64url');return h+'.'+p+'.'+sign('sha256',Buffer.from(h+'.'+p),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');}
function hooks(options={}){const data=new Map(),store={get:async(k,d)=>structuredClone(data.get(k)??d),put:async(k,v)=>data.set(k,structuredClone(v))};let clock=now;const h=new PlaidWebhooks({store,getKey:async()=>key,knownItem:async id=>id==='bank',refresh:async()=>{},now:()=>clock,...options});return {h,data,advance:ms=>{clock+=ms;}};}
const raw=Buffer.from(JSON.stringify({item_id:'bank',webhook_type:'TRANSACTIONS',webhook_code:'SYNC_UPDATES_AVAILABLE'}));

test('unsigned webhook spam cannot use up the limit for real Plaid notifications',async()=>{
 const {h,data}=hooks();for(let i=0;i<200;i++)await assert.rejects(h.accept(raw,'bad.token.value'));
 assert.equal((await h.accept(raw,signed(raw))).queued,true);assert.equal(data.get('webhook-queue').length,1);
});

test('webhooks are answered while a bank sync is running, and are not lost',async()=>{
 let release;const gate=new Promise(r=>release=r);let calls=0;
 const {h,data}=hooks({refresh:async()=>{calls++;await gate;}});
 await h.accept(raw,signed(raw));const syncing=h.tick();await new Promise(r=>setImmediate(r));
 const answered=await Promise.race([h.accept(raw,signed(raw)),new Promise(r=>setTimeout(()=>r('blocked'),200))]);
 assert.equal(answered.queued,true,'accept returned while sync was in progress');
 release();await syncing;assert.equal(calls,1);
 assert.equal(data.get('webhook-queue').length,1,'the notification received mid-sync stays queued');
 await h.tick();assert.equal(data.get('webhook-queue').length,0);assert.equal(calls,2);
});

test('failed bank updates stop retrying eventually, and removed banks are dropped',async()=>{
 const {h,data,advance}=hooks({refresh:async()=>{throw Error('offline');}});await h.accept(raw,signed(raw));
 for(let i=0;i<MAX_WEBHOOK_ATTEMPTS;i++){await h.tick();advance(3600000);}
 assert.equal(data.get('webhook-queue').length,0);assert.match(data.get('webhook-dropped')[0].reason,/Gave up/);
 const gone=hooks();await gone.h.accept(raw,signed(raw));gone.h.knownItem=async()=>false;await gone.h.tick();
 assert.equal(gone.data.get('webhook-queue').length,0);assert.match(gone.data.get('webhook-dropped')[0].reason,/no longer exists/);
});
