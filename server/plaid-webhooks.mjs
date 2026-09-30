import {createHash,createPublicKey,verify,timingSafeEqual} from 'node:crypto';
// Dedicated receiver: expose only this port/path through HTTPS, never the app port.
export function webhookURL(value){if(!value)return '';const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/plaid/webhook')throw Error('BUDGET_HQ_PLAID_WEBHOOK_URL must be an HTTPS URL ending in /plaid/webhook.');return u.href;}
export const MAX_WEBHOOK_ATTEMPTS=24;
export class PlaidWebhooks{
 constructor({store,getKey,refresh,knownItem,now=Date.now}){Object.assign(this,{store,getKey,refresh,knownItem,now});this.tail=Promise.resolve();this.keys=new Map();this.processing=null;}
 // The lock only guards short queue reads/writes. Bank syncs run outside it so new webhooks are answered immediately.
 serial(fn){const work=this.tail.then(fn);this.tail=work.catch(()=>{});return work;}
 limit(name,max){const w=this[name]||(this[name]={at:0,count:0});if(this.now()-w.at>=60000){w.at=this.now();w.count=0;}if(++w.count>max)throw Error('Too many webhook requests. Retry later.');}
 async verify(raw,token){
  if(!Buffer.isBuffer(raw)||raw.length>65536||typeof token!=='string'||token.length>8192)throw Error('Invalid webhook.');
  const parts=token.split('.');if(parts.length!==3)throw Error('Invalid signature.');const header=JSON.parse(Buffer.from(parts[0],'base64url')),claims=JSON.parse(Buffer.from(parts[1],'base64url'));
  if(header.alg!=='ES256'||typeof header.kid!=='string'||header.kid.length>200||!Number.isFinite(claims.iat)||claims.iat*1000<this.now()-300000||claims.iat*1000>this.now()+30000)throw Error('Invalid signature or expired webhook.');
  let key=this.keys.get(header.kid);if(!key){this.limit('keyWindow',10);key=await this.getKey(header.kid);if(this.keys.size>=64)this.keys.clear();this.keys.set(header.kid,key);}
  if(!key||key.kid!==header.kid||key.alg!=='ES256'||key.crv!=='P-256'||key.kty!=='EC'||key.expired_at!=null)throw Error('Invalid verification key.');
  if(!verify('sha256',Buffer.from(parts[0]+'.'+parts[1]),{key:createPublicKey({key,format:'jwk'}),dsaEncoding:'ieee-p1363'},Buffer.from(parts[2],'base64url')))throw Error('Invalid signature.');
  const hash=createHash('sha256').update(raw).digest(),claimed=Buffer.from(String(claims.request_body_sha256||''),'hex');if(claimed.length!==32||!timingSafeEqual(hash,claimed))throw Error('Invalid body.');
  return JSON.parse(raw);
 }
 async accept(raw,token){
  // Unsigned traffic is rejected before it can use up the rate limit meant for genuine Plaid notifications.
  const event=await this.verify(raw,token);this.limit('window',60);
  const supported=event.webhook_type==='TRANSACTIONS'&&['SYNC_UPDATES_AVAILABLE','INITIAL_UPDATE','HISTORICAL_UPDATE','DEFAULT_UPDATE','TRANSACTIONS_REMOVED'].includes(event.webhook_code)||event.webhook_type==='ITEM'&&['ERROR','LOGIN_REPAIRED','PENDING_EXPIRATION','PENDING_DISCONNECT','NEW_ACCOUNTS_AVAILABLE'].includes(event.webhook_code)||event.webhook_type==='LIABILITIES';
  if(!supported||!await this.knownItem(event.item_id))return {ignored:true};
  return this.serial(async()=>{const queue=await this.store.get('webhook-queue',[]);let job=queue.find(j=>j.id===event.item_id);if(!job){job={id:event.item_id,attempts:0,next:0};queue.push(job);}job.event=event.webhook_code;job.receivedAt=new Date(this.now()).toISOString();job.version=(job.version||0)+1;await this.store.put('webhook-queue',queue);return {queued:true};});
 }
 tick(){if(this.processing)return this.processing;this.processing=this.run().finally(()=>{this.processing=null;});return this.processing;}
 async run(){
  const due=await this.serial(async()=>(await this.store.get('webhook-queue',[])).filter(j=>j.next<=this.now()));
  const results=[];
  for(const job of due){let known=true;try{known=await this.knownItem(job.id);}catch{}if(!known){results.push({job,drop:'Bank connection no longer exists.'});continue;}try{await this.refresh(job.id,job.event);results.push({job,ok:true});}catch{results.push({job,ok:false});}}
  if(!results.length)return;
  await this.serial(async()=>{
   const queue=await this.store.get('webhook-queue',[]),dropped=[];
   for(const {job,ok,drop}of results){const current=queue.find(j=>j.id===job.id);if(!current)continue;
    // A notification that arrived during the sync keeps the job queued so its changes are not missed.
    if(ok){if((current.version||0)===(job.version||0))queue.splice(queue.indexOf(current),1);else{current.attempts=0;current.next=0;delete current.error;}continue;}
    if(drop){queue.splice(queue.indexOf(current),1);dropped.push({id:job.id,event:job.event,reason:drop,at:new Date(this.now()).toISOString()});continue;}
    current.attempts=(current.attempts||0)+1;
    if(current.attempts>=MAX_WEBHOOK_ATTEMPTS){queue.splice(queue.indexOf(current),1);dropped.push({id:job.id,event:job.event,reason:'Gave up after '+current.attempts+' failed attempts. Use Refresh to retry.',at:new Date(this.now()).toISOString()});continue;}
    current.next=this.now()+Math.min(3600000,30000*2**Math.min(current.attempts,7));current.error='Bank update failed; retry scheduled.';}
   await this.store.put('webhook-queue',queue);
   if(dropped.length)await this.store.put('webhook-dropped',[...dropped,...await this.store.get('webhook-dropped',[])].slice(0,20));
  });
 }
}
