import {pullTransactions,liabilityFields} from './plaid-products.mjs';
import {randomUUID} from 'node:crypto';
// Connection management is intentionally independent of the budget ledger.
// Imported data is committed separately through the budget service.
export class PlaidConnection {
 constructor(store,{sample=false,fetchImpl=(...args)=>fetch(...args),now=Date.now,webhook='' }={}){this.store=store;this.sample=sample;this.fetch=fetchImpl;this.now=now;this.webhook=webhook;this.tail=Promise.resolve();}
 serial(fn){const work=this.tail.then(fn);this.tail=work.catch(()=>{});return work;}
 async state(){return await this.store.get('connection',{items:[],sessions:[],userId:randomUUID()});}
 async status(){const state=await this.state();return {configured:!!state.config,environment:state.config?.environment||'sandbox',sample:this.sample,importsPaused:false,items:state.items.map(({id,name,accounts=[],attemptedAt,checkedAt,freshRefresh,freshBalance,error,transactionsError,liabilitiesError,bankUpdatedAt,metadataError,consentExpiresAt,webhookNotice})=>({id,name,accounts:accounts.map(({id,name,mask,type,balanceUpdatedAt})=>({id,name,mask,type,balanceUpdatedAt})),attemptedAt,checkedAt,freshRefresh,freshBalance,error,transactionsError,liabilitiesError,bankUpdatedAt,metadataError,consentExpiresAt,webhookNotice})),sessions:state.sessions.filter(s=>s.expires>this.now()&&!s.done).map(({id,url,itemId})=>({id,url,itemId}))};}
 async call(config,path,payload){
  let response,data;try{response=await this.fetch('https://'+config.environment+'.plaid.com'+path,{method:'POST',headers:{'Content-Type':'application/json','Plaid-Version':'2020-09-14'},body:JSON.stringify({client_id:config.clientId,secret:config.secret,...payload}),signal:AbortSignal.timeout(['/transactions/refresh','/accounts/balance/get'].includes(path)?60000:25000)});data=await response.json();}catch{throw Error('Plaid could not be reached. Check your connection and try again.');}
  if(!response.ok||data.error_code){const code=String(data.error_code||'REQUEST_FAILED').replace(/[^A-Z0-9_]/g,'').slice(0,80);throw Error('Plaid: '+code+'. '+({INVALID_API_KEYS:'Check the Client ID, secret and environment.',ITEM_LOGIN_REQUIRED:'Reconnect this bank.',NO_ACCOUNTS:'The bank did not provide any eligible accounts. Check its permissions.',INVALID_LINK_TOKEN:'Start a new connection session.'}[code]||'The request failed; check your Plaid setup or reconnect this bank.'));}
  return data;
 }
 async configure({clientId,secret,environment}){return this.serial(async()=>{
  if(!['sandbox','production'].includes(environment)||this.sample&&environment!=='sandbox')throw Error('The sample budget supports Sandbox connections only.');
  if(typeof clientId!=='string'||!clientId.trim()||clientId.length>200||typeof secret!=='string'||!secret.trim()||secret.length>500)throw Error('Enter your Plaid Client ID and secret.');
  const state=await this.state();if(state.items.length&&(state.config.clientId!==clientId.trim()||state.config.environment!==environment))throw Error('Disconnect your existing bank connections before changing the Client ID or environment.');
  state.config={clientId:clientId.trim(),secret:secret.trim(),environment};state.sessions=[];await this.store.put('connection',state);return this.status();
 });}
 async start({itemId}={}){return this.serial(async()=>{
  const state=await this.state();if(!state.config)throw Error('Set up Plaid before connecting a bank.');
  const item=itemId?state.items.find(x=>x.id===itemId):null;if(itemId&&!item)throw Error('Bank connection not found.');
  const result=await this.call(state.config,'/link/token/create',{client_name:'Budget HQ',country_codes:['US'],language:'en',user:{client_user_id:state.userId},hosted_link:{},...(this.webhook?{webhook:this.webhook}:{}),additional_consented_products:['liabilities'],...(item?{access_token:item.accessToken,...(item.webhookNotice==='NEW_ACCOUNTS_AVAILABLE'?{update:{account_selection_enabled:true}}:{})}:{products:['transactions']})});
  const url=new URL(result.hosted_link_url);if(url.protocol!=='https:'||url.hostname!=='secure.plaid.com'||url.username||url.password)throw Error('Plaid returned an unexpected connection address.');
  const session={id:randomUUID(),url:url.href,linkToken:result.link_token,itemId:item?.id||'',expires:Math.min(Date.parse(result.expiration)||this.now()+1800000,this.now()+1800000)};
  state.sessions=state.sessions.filter(s=>s.expires>this.now()).slice(-9);state.sessions.push(session);await this.store.put('connection',state);return {id:session.id,url:session.url};
 });}
 async checkItem(state,item,{freshBalance=false}={}){
  item.attemptedAt=new Date(this.now()).toISOString();
  try{
   let result;
   if(freshBalance){
    item.freshBalance={requestedAt:new Date(this.now()).toISOString(),status:'requested',error:''};
    try{
     result=await this.call(state.config,'/accounts/balance/get',{access_token:item.accessToken});
     if(result.item?.error)throw Error('Plaid: '+String(result.item.error.error_code||'CONNECTION_ERROR'));
     if(!Array.isArray(result.accounts)||!result.accounts.length)throw Error('The bank returned no accounts.');
     item.freshBalance.status='completed';item.freshBalance.completedAt=new Date(this.now()).toISOString();
    }catch(e){
     item.freshBalance.status='failed';item.freshBalance.error='Fresh balances unavailable. '+e.message+' Using available Plaid data instead.';result=null;
    }
   }
   if(!result)result=await this.call(state.config,'/accounts/get',{access_token:item.accessToken});
   if(result.item?.error)throw Error('Plaid: '+String(result.item.error.error_code||'CONNECTION_ERROR')+'. Reconnect this bank.');
   if(!result.accounts?.length)throw Error('Plaid: NO_ACCOUNTS. This bank returned no eligible accounts.');
   item.institutionId=result.item?.institution_id||item.institutionId||'';item.accounts=result.accounts.map(a=>({id:a.account_id,name:String(a.name||'Account').slice(0,150),mask:String(a.mask||'').slice(-4),type:a.type,subtype:a.subtype||'',persistentId:a.persistent_account_id||'',current:a.balances?.current??null,available:a.balances?.available??null,limit:a.balances?.limit??null,currency:a.balances?.iso_currency_code||'',balanceUpdatedAt:a.balances?.last_updated_datetime||null}));item.error='';item.checkedAt=new Date(this.now()).toISOString();
   item.bankUpdatedAt??=null;
   try{const meta=await this.call(state.config,'/item/get',{access_token:item.accessToken});item.bankUpdatedAt=meta.status?.transactions?.last_successful_update||null;item.consentExpiresAt=meta.item?.consent_expiration_time||null;item.metadataError='';if(meta.item?.error)item.error='Plaid: '+meta.item.error.error_code+'. Reconnect this bank.';}catch(e){item.metadataError=e.message;}
   if(this.webhook&&item.webhookRegistered!==this.webhook)try{await this.call(state.config,'/item/webhook/update',{access_token:item.accessToken,webhook:this.webhook});item.webhookRegistered=this.webhook;}catch(e){item.metadataError=e.message;}
   try{Object.assign(item,await pullTransactions((path,body)=>this.call(state.config,path,body),item));item.transactionsError='';}catch(e){item.transactionsError=e.message;}
   if(item.accounts.some(a=>a.type==='credit'||a.subtype==='student'||a.subtype==='mortgage'))try{const data=await this.call(state.config,'/liabilities/get',{access_token:item.accessToken});item.liabilities=liabilityFields(data.liabilities);item.liabilitiesError='';}catch(e){item.liabilitiesError=e.message;}
  }catch(e){item.error=e.message;}
 }
 async finish({id}){return this.serial(async()=>{
  const state=await this.state(),session=state.sessions.find(s=>s.id===id);if(!session||session.expires<=this.now())throw Error('Connection session expired. Start a new one.');
  if(session.done)return {...await this.status(),finished:true};
  if(session.itemId){const item=state.items.find(x=>x.id===session.itemId);if(!item)throw Error('Connection was removed.');await this.checkItem(state,item);session.done=!item.error;if(session.done)item.webhookNotice='';await this.store.put('connection',state);return {...await this.status(),finished:session.done};}
  const result=await this.call(state.config,'/link/token/get',{link_token:session.linkToken});
  const added=(result.link_sessions||[]).flatMap(s=>s.results?.item_add_results?.length?s.results.item_add_results:s.on_success?.public_token?[{public_token:s.on_success.public_token,...s.on_success.metadata}]:[]);
  for(const add of added){
   if(!add.public_token)continue;session.exchanged??={};let itemId=session.exchanged[add.public_token];
   if(!itemId){const exchange=await this.call(state.config,'/item/public_token/exchange',{public_token:add.public_token});itemId=exchange.item_id;const old=state.items.find(x=>x.id===itemId),item={id:itemId,accessToken:exchange.access_token,name:String(add.institution?.name||'Connected Bank').slice(0,150),accounts:[]};if(old)Object.assign(old,item);else state.items.push(item);session.exchanged[add.public_token]=itemId;await this.store.put('connection',state);}
   const item=state.items.find(x=>x.id===itemId);await this.checkItem(state,item);
  }
  session.done=added.length>0;await this.store.put('connection',state);return {...await this.status(),finished:session.done};
 });}
 async requestFreshTransactions(state,item){
  const requestedAt=new Date(this.now()).toISOString();
  item.freshRefresh={requestedAt,status:'requested',error:''};
  if(item.institutionId==='ins_128026'&&item.accounts?.length&&!item.accounts.some(a=>a.type==='depository')){
   item.freshRefresh.status='unavailable';item.freshRefresh.error='Capital One does not support on-demand transaction refresh for credit-card-only connections. Retrieving the latest available data instead.';return;
  }
  try{
   await this.call(state.config,'/transactions/refresh',{access_token:item.accessToken});
   item.freshRefresh.status='completed';item.freshRefresh.completedAt=new Date(this.now()).toISOString();
  }catch(e){item.freshRefresh.status='failed';item.freshRefresh.error='Fresh bank update was not confirmed. '+e.message+' Transactions Refresh requires separate Plaid access; existing data will still be retrieved.';}
 }
 async check({id,fresh=false}){return this.serial(async()=>{const state=await this.state(),item=state.items.find(x=>x.id===id);if(!item)throw Error('Bank connection not found.');if(fresh===true)await this.requestFreshTransactions(state,item);await this.checkItem(state,item,{freshBalance:fresh===true});await this.store.put('connection',state);return this.status();});}
 async verificationKey(key_id){const state=await this.state();if(!state.config)throw Error('Plaid is not configured.');return (await this.call(state.config,'/webhook_verification_key/get',{key_id})).key;}
 async noteWebhook(id,event){return this.serial(async()=>{const state=await this.state(),item=state.items.find(i=>i.id===id);if(item){item.webhookNotice=['PENDING_DISCONNECT','PENDING_EXPIRATION','NEW_ACCOUNTS_AVAILABLE'].includes(event)?event:event==='LOGIN_REPAIRED'?'':item.webhookNotice;await this.store.put('connection',state);}});}
 async snapshots(){const state=await this.state();return state.items.map(({id,name,institutionId,accounts,attemptedAt,checkedAt,freshRefresh,freshBalance,error,transactions,transactionsError,liabilities,liabilitiesError})=>({id,name,institutionId,accounts,attemptedAt,checkedAt,freshRefresh,freshBalance,error,transactions,transactionsError,liabilities,liabilitiesError}));}
 async refresh({fresh=false}={}){return this.serial(async()=>{const state=await this.state();for(const item of state.items){if(fresh===true)await this.requestFreshTransactions(state,item);await this.checkItem(state,item,{freshBalance:fresh===true});await this.store.put('connection',state);}return this.status();});}
 async disconnect({id}){return this.serial(async()=>{const state=await this.state(),item=state.items.find(x=>x.id===id);if(!item)return this.status();await this.call(state.config,'/item/remove',{access_token:item.accessToken});state.items=state.items.filter(x=>x.id!==id);state.sessions=[];await this.store.put('connection',state);return this.status();});}
}
