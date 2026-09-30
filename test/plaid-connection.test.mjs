import test from 'node:test';import assert from 'node:assert/strict';
import {PlaidConnection} from '../server/plaid-connection.mjs';
function fixture({sample=true}={}){const records=new Map(),calls=[],store={get:async(k,d)=>structuredClone(records.get(k)||d),put:async(k,v)=>records.set(k,structuredClone(v))};let fail=false;
 const bank=new PlaidConnection(store,{sample,now:()=>Date.parse('2026-09-16T12:00:00Z'),fetchImpl:async(url,options)=>{const path=new URL(url).pathname,body=JSON.parse(options.body);calls.push({path,body});const payload={
 '/link/token/create':{link_token:'link-test',expiration:'2026-09-16T12:30:00Z',hosted_link_url:'https://secure.plaid.com/hl/test'},
 '/link/token/get':{link_sessions:[{results:{item_add_results:[{public_token:'public-test',institution:{name:'Test Bank'}}]}}]},
 '/item/public_token/exchange':{item_id:'item-test',access_token:'private-access-token'},
 '/accounts/get':{accounts:[{account_id:'account-test',name:'Checking',mask:'1234',type:'depository',balances:{current:999}}]},
 '/transactions/sync':{added:[],modified:[],removed:[],next_cursor:'cursor',has_more:false},'/liabilities/get':{liabilities:{}},'/item/remove':{removed:true}}[path];if(!payload)throw Error('Unexpected endpoint '+path);return {ok:!fail,json:async()=>fail?{error_code:'ITEM_LOGIN_REQUIRED'}:payload};}});
 return {bank,records,calls,setFailure:v=>fail=v};}
const config={clientId:'test-client',secret:'private-secret',environment:'sandbox'};
test('Plaid is unconfigured by default and has no background network calls',async()=>{const f=fixture(),status=await f.bank.status();assert.equal(status.configured,false);assert.equal(status.importsPaused,false);assert.equal(f.calls.length,0);await assert.rejects(f.bank.start(),/Set up/);await assert.rejects(f.bank.configure({...config,environment:'production'}),/Sandbox/);});
test('hosted connection finishes once and public status contains no credentials or bank balances',async()=>{const f=fixture();await f.bank.configure(config);const session=await f.bank.start();assert.equal(session.url,'https://secure.plaid.com/hl/test');const result=await f.bank.finish({id:session.id});assert.equal(result.finished,true);assert.equal(result.items[0].name,'Test Bank');assert.equal(result.items[0].accounts.length,1);await f.bank.finish({id:session.id});assert.equal(f.calls.filter(c=>c.path==='/item/public_token/exchange').length,1);assert.equal((await f.bank.status()).items.length,1);assert.doesNotMatch(JSON.stringify(result),/private-secret|private-access-token|current|999|public-test|link-test/);assert.deepEqual([...f.records.keys()],['connection']);});
test('reconnect uses the existing token, exposes bank errors, and does not request a fresh Item',async()=>{const f=fixture();await f.bank.configure(config);const s=await f.bank.start();await f.bank.finish({id:s.id});const update=await f.bank.start({itemId:'item-test'});const request=f.calls.at(-1);assert.equal(request.body.access_token,'private-access-token');assert.equal(request.body.products,undefined);f.setFailure(true);let result=await f.bank.finish({id:update.id});assert.equal(result.finished,false);assert.match(result.items[0].error,/ITEM_LOGIN_REQUIRED/);f.setFailure(false);result=await f.bank.finish({id:update.id});assert.equal(result.finished,true);assert.equal(result.items.length,1);});
test('failed disconnect preserves the connection for retry; success revokes and removes it',async()=>{const f=fixture();await f.bank.configure(config);const s=await f.bank.start();await f.bank.finish({id:s.id});f.setFailure(true);await assert.rejects(f.bank.disconnect({id:'item-test'}),/Plaid/);assert.equal((await f.bank.status()).items.length,1);f.setFailure(false);await f.bank.disconnect({id:'item-test'});assert.equal((await f.bank.status()).items.length,0);});
test('active connections prevent an accidental change of Plaid client or environment',async()=>{const f=fixture({sample:false});await f.bank.configure(config);const s=await f.bank.start();await f.bank.finish({id:s.id});await assert.rejects(f.bank.configure({...config,environment:'production'}),/Disconnect/);});

test('bank update timestamp is distinct from app check and metadata failures retain the earlier timestamp',async()=>{const records=new Map(),store={get:async(k,d)=>structuredClone(records.get(k)||d),put:async(k,v)=>records.set(k,structuredClone(v))};let metadataFail=false;const b=new PlaidConnection(store,{now:()=>Date.parse('2026-09-18T12:00:00Z'),fetchImpl:async(url)=>{const path=new URL(url).pathname;const data=path==='/accounts/get'?{accounts:[{account_id:'a',name:'Checking',type:'depository',subtype:'checking',balances:{current:100,iso_currency_code:'USD'}}],item:{}}:path==='/item/get'?metadataFail?{error_code:'TEST_ERROR'}:{status:{transactions:{last_successful_update:'2026-09-15T12:00:00Z'}},item:{consent_expiration_time:'2026-10-01T00:00:00Z'}}:{added:[],modified:[],removed:[],next_cursor:'c',has_more:false};return {ok:!data.error_code,json:async()=>data};}});await store.put('connection',{config:{environment:'sandbox',clientId:'id',secret:'secret'},items:[{id:'i',name:'Bank',accessToken:'token'}],sessions:[]});let status=await b.check({id:'i'});assert.equal(status.items[0].checkedAt,'2026-09-18T12:00:00.000Z');assert.equal(status.items[0].bankUpdatedAt,'2026-09-15T12:00:00Z');metadataFail=true;status=await b.check({id:'i'});assert.equal(status.items[0].bankUpdatedAt,'2026-09-15T12:00:00Z');assert.match(status.items[0].metadataError,/TEST_ERROR/);assert.doesNotMatch(JSON.stringify(status),/secret|token/);});

test('failed refresh records a new attempt without advancing the last successful check',async()=>{
 const f=fixture();await f.bank.configure(config);const session=await f.bank.start();await f.bank.finish({id:session.id});
 const previous=(await f.bank.status()).items[0].checkedAt;
 f.bank.now=()=>Date.parse('2026-09-19T12:00:00Z');f.setFailure(true);
 const result=await f.bank.refresh(),item=result.items[0];
 assert.equal(item.attemptedAt,'2026-09-19T12:00:00.000Z');assert.equal(item.checkedAt,previous);assert.match(item.error,/ITEM_LOGIN_REQUIRED/);
 const snapshot=(await f.bank.snapshots())[0];assert.equal(snapshot.attemptedAt,item.attemptedAt);assert.equal(snapshot.checkedAt,previous);
 f.setFailure(false);await f.bank.refresh();assert.equal((await f.bank.status()).items[0].checkedAt,item.attemptedAt);
});
test('multi-bank refresh saves the first bank before waiting on the next',async()=>{
 const records=new Map(),writes=[],store={get:async(k,d)=>structuredClone(records.get(k)||d),put:async(k,v)=>{writes.push(structuredClone(v));records.set(k,structuredClone(v));}};
 await store.put('connection',{config:{environment:'sandbox',clientId:'id',secret:'secret'},items:[{id:'first',name:'First'},{id:'second',name:'Second'}],sessions:[]});writes.length=0;
 let releaseSecond,secondStarted;const started=new Promise(resolve=>secondStarted=resolve),blocked=new Promise(resolve=>releaseSecond=resolve);
 const bank=new PlaidConnection(store);bank.checkItem=async(_state,item)=>{if(item.id==='second'){secondStarted();await blocked;}item.checkedAt=item.id+'-done';};
 const running=bank.refresh();await started;
 assert.equal(records.get('connection').items[0].checkedAt,'first-done');assert.equal(records.get('connection').items[1].checkedAt,undefined);
 releaseSecond();await running;assert.equal(writes.length,2);assert.equal(records.get('connection').items[1].checkedAt,'second-done');
});

test('fresh request runs before sync, reuses the token, and ordinary sync does not request the add-on',async()=>{
 const f=fixture();await f.bank.configure(config);const session=await f.bank.start();await f.bank.finish({id:session.id});
 const original=f.bank.call.bind(f.bank),steps=[];
 f.bank.call=async(c,path,body)=>{steps.push(path);if(path==='/transactions/refresh'){assert.equal(body.access_token,'private-access-token');return {request_id:'fresh'};}return original(c,path,body);};
 await f.bank.refresh();assert.ok(!steps.includes('/transactions/refresh'));steps.length=0;
 const r=await f.bank.check({id:'item-test',fresh:true});assert.ok(steps.indexOf('/transactions/refresh')<steps.indexOf('/transactions/sync'));assert.equal(r.items[0].freshRefresh.status,'completed');assert.equal(r.items.length,1);assert.ok(!steps.includes('/link/token/create'));assert.equal((await f.bank.snapshots())[0].freshRefresh.status,'completed');
});
test('fresh request failure still syncs available transactions and remains visible',async()=>{
 const f=fixture();await f.bank.configure(config);const session=await f.bank.start();await f.bank.finish({id:session.id});
 const original=f.bank.call.bind(f.bank);f.bank.call=async(c,path,body)=>{if(path==='/transactions/refresh')throw Error('Plaid: PRODUCT_NOT_ENABLED');return original(c,path,body);};
 const r=await f.bank.refresh({fresh:true});assert.equal(r.items[0].freshRefresh.status,'failed');assert.match(r.items[0].freshRefresh.error,/PRODUCT_NOT_ENABLED/);assert.equal(r.items[0].transactionsError,'');assert.equal(r.items[0].error,'');
});
test('Capital One card-only fresh requests are skipped without skipping data sync',async()=>{
 const f=fixture();await f.bank.configure(config);const session=await f.bank.start();await f.bank.finish({id:session.id});
 const state=f.records.get('connection');state.items[0].institutionId='ins_128026';state.items[0].accounts=[{type:'credit'}];
 const r=await f.bank.refresh({fresh:true});assert.equal(r.items[0].freshRefresh.status,'unavailable');assert.ok(!f.calls.some(c=>c.path==='/transactions/refresh'));assert.equal(r.items[0].transactionsError,'');
});

test('fresh balances replace cached balances and reach cash planning without counting pending twice',async()=>{
 const {applyPlaidAccounts}=await import('../server/plaid-accounts.mjs');const {fresh,summary}=await import('../server/model.mjs');
 const f=fixture();await f.bank.configure(config);const session=await f.bank.start();await f.bank.finish({id:session.id});
 const original=f.bank.call.bind(f.bank),paths=[];
 f.bank.call=async(c,path,body)=>{paths.push(path);assert.equal(body.access_token,'private-access-token');
  if(path==='/transactions/refresh')return {request_id:'fresh'};
  if(path==='/accounts/balance/get')return {accounts:[{account_id:'account-test',name:'Checking',type:'depository',balances:{current:1000,available:850,iso_currency_code:'USD'}}]};
  if(path==='/transactions/sync')return {added:[{transaction_id:'pending',account_id:'account-test',pending:true,date:'2026-09-16',amount:150,iso_currency_code:'USD'}],modified:[],removed:[],next_cursor:'new',has_more:false};
  return original(c,path,body);
 };
 const r=await f.bank.refresh({fresh:true});assert.equal(r.items[0].freshBalance.status,'completed');assert.ok(!paths.includes('/accounts/get'));assert.equal(paths.filter(p=>p==='/accounts/balance/get').length,1);
 const snapshot=await f.bank.snapshots();assert.equal(snapshot[0].accounts[0].available,850);assert.equal(snapshot[0].freshBalance.status,'completed');
 const book=applyPlaidAccounts(fresh(),snapshot,'2026-09-16').book,data=summary(book,'2026-09-16');
 assert.equal(data.cash.balance,850);assert.equal(data.cash.postedBalance,1000);assert.equal(data.cash.pendingAdjustment,150);
 assert.equal(summary(applyPlaidAccounts(book,snapshot,'2026-09-16').book,'2026-09-16').cash.balance,850);
 paths.length=0;await f.bank.refresh();assert.ok(!paths.includes('/accounts/balance/get'));assert.ok(!paths.includes('/transactions/refresh'));
});
test('fresh balance denial falls back with a separate error and retains transaction sync',async()=>{
 const f=fixture();await f.bank.configure(config);const session=await f.bank.start();await f.bank.finish({id:session.id});
 const original=f.bank.call.bind(f.bank);f.bank.call=async(c,path,body)=>{
  if(path==='/transactions/refresh')return {};
  if(path==='/accounts/balance/get')throw Error('Plaid: PRODUCT_NOT_ENABLED');
  return original(c,path,body);
 };
 const r=await f.bank.check({id:'item-test',fresh:true});assert.equal(r.items[0].freshBalance.status,'failed');assert.match(r.items[0].freshBalance.error,/PRODUCT_NOT_ENABLED/);assert.equal(r.items[0].error,'');assert.equal(r.items[0].transactionsError,'');assert.equal((await f.bank.snapshots())[0].accounts[0].current,999);
});
