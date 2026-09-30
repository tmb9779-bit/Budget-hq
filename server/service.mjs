import {applyPlaidAccounts,resolvePlaidAccountConflict} from './plaid-accounts.mjs';
import {normalizeRecovery} from './recycle.mjs';
import {analyzeBudget,monthlyReport} from '../analysis.js';
import {randomUUID} from 'node:crypto';
import {change,summary,today} from './model.mjs';
import {normalizeCategory,typeSlug,TYPES} from '../categories.js';
import {autoConfirmPaychecks,autoConfirmBills} from '../bank-matches.js';
// Only the newest change can be undone, so only it keeps a full copy of the previous budget.
// Older entries keep their label and date for the history list. This keeps each save to ~2 copies instead of 41.
export const HISTORY_LIMIT=40;
export function withHistory(entry,history){return [entry,...history.map(({before,...meta})=>meta)].slice(0,HISTORY_LIMIT);}
// Automatic backups: keep the last 14 daily copies plus one per month for a year, and the last 10 safety copies
// made before a restore or sample reset. User-created backups are never deleted automatically.
export function backupsToPrune(names){
 const daily=names.filter(n=>/^backup-\d{4}-\d{2}-\d{2}$/.test(n)).sort().reverse(),keep=new Set(daily.slice(0,14)),months=new Set();
 for(const n of daily){const month=n.slice(7,14);if(!months.has(month)&&months.size<12){months.add(month);keep.add(n);}}
 const safety=prefix=>names.filter(n=>n.startsWith(prefix)).sort((a,b)=>Number(b.slice(prefix.length))-Number(a.slice(prefix.length))).slice(10);
 return [...daily.filter(n=>!keep.has(n)),...safety('backup-before-restore-'),...safety('backup-before-sample-reset-')];
}
// One-time move to the shared transaction types: older names such as Food, Utility, Car and
// Government & taxes become their current names, Food is split into Groceries or Dining out by
// what the charge was, and Vet joins Pets (0.9.52). Colour settings follow their type.
export const CATEGORY_VERSION=4;
export function migrateCategories(book){
 if(book.categoryVersion>=CATEGORY_VERSION)return null;
 const next={...book,categoryVersion:CATEGORY_VERSION};
 next.transactions=(book.transactions||[]).map(t=>t.category?{...t,category:normalizeCategory(t.category,t.merchantName||t.name)||'Other'}:t);
 next.reviewTransactions=(book.reviewTransactions||[]).map(t=>t.category?{...t,category:normalizeCategory(t.category,t.merchantName||t.name)||'Other'}:t);
 for(const list of ['bills','needs'])next[list]=(book[list]||[]).map(x=>{
  if(list==='bills'&&x.icon){const {icon,...rest}=x,matched=TYPES.find(t=>t.expense!==false&&t.icon===icon);return {...rest,category:matched?.name||normalizeCategory(x.category,x.name)||'Other'};}
  return x.category?{...x,category:normalizeCategory(x.category,x.name)||'Other'}:x;
 });
 const colors=book.settings?.expenseColors;
 if(colors&&Object.keys(colors).length){
  const moved={},slugFor=key=>{const name=normalizeCategory(key.replace(/-/g,' '))||'Other';return name==='Other'&&key!=='other'?key:typeSlug(name);};
  // A colour chosen for the type's current name wins over one inherited from a merged older type.
  for(const [key,value] of Object.entries(colors))if(slugFor(key)===key)moved[key]=value;
  for(const [key,value] of Object.entries(colors)){const slug=slugFor(key);if(!(slug in moved))moved[slug]=value;}
  next.settings={...book.settings,expenseColors:moved};
 }
 return next;
}
export class BudgetService{
 constructor(store,seed){this.store=store;this.seed=seed;this.tail=Promise.resolve();this.previews=new Map();this.listeners=new Set();}
 // Live updates: listeners hear about every saved budget change (edits, bank syncs, restores).
 onChange(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn);}
 async commit(envelope){await this.store.put('budget',envelope);this.envelope=envelope;for(const fn of this.listeners){try{fn(envelope.book);}catch{}}}
 async init(){this.envelope=await this.store.get('budget');if(this.envelope){const migrated=migrateCategories(this.envelope.book);if(migrated){this.envelope={...this.envelope,book:migrated};await this.store.put('budget',this.envelope);}}if(!this.envelope){const book=await this.seed();this.envelope={book,history:[]};await this.store.put('budget',this.envelope);}else if(this.envelope.history.slice(1).some(h=>h.before)){const [first,...rest]=this.envelope.history;this.envelope={...this.envelope,history:first?withHistory(first,rest):[]};await this.store.put('budget',this.envelope);}await this.daily();return this;}
 async daily(){return this.serial(async()=>{await this.clearMatchedPaychecks();await this.expireRecovery();await this.safeCaptureReview();const name='backup-'+today(),names=await this.store.list('backup-');if(!names.includes(name))await this.store.put(name,{book:this.envelope.book,createdAt:new Date().toISOString()});for(const old of backupsToPrune(names))await this.store.remove(old);});}
 // Employer deposits that arrived since the last check clear their expected payday on their own.
 async clearMatchedPaychecks(){
  const book=structuredClone(this.envelope.book);
  const paychecks=autoConfirmPaychecks(book,today()),bills=autoConfirmBills(book,today());if(!paychecks&&!bills)return;
  book.revision=randomUUID();book.updatedAt=new Date().toISOString();
  const entry={id:randomUUID(),action:'Scheduled activity matched to bank transaction',date:book.updatedAt,before:this.envelope.book};
  await this.commit({...this.envelope,book,history:withHistory(entry,this.envelope.history)});
 }
 async expireRecovery(asOf=today()){
  const [first,...rest]=this.envelope.history,book=normalizeRecovery(this.envelope.book,asOf),before=first?.before?normalizeRecovery(first.before,asOf):null;
  if(JSON.stringify(book)===JSON.stringify(this.envelope.book)&&(!before||JSON.stringify(before)===JSON.stringify(first.before)))return;
  const history=first?[before?{...first,before}:first,...rest]:[];
  book.revision=randomUUID();const envelope={book,history};await this.commit(envelope);
 }
 async safeCaptureReview(){try{await this.captureReview();this.snapshotError=null;}catch(e){this.snapshotError="Snapshot could not be refreshed. Budget changes are saved; check local storage.";}}
 // Past months never change, so they are loaded once; each save only rewrites the current month.
 async captureReview(){const b=this.envelope.book,d=this.computed().base,month=d.asOf.slice(0,7),name='monthly-'+month;
  if(!this.monthlySnapshots)this.monthlySnapshots=(await Promise.all((await this.store.list('monthly-')).sort().reverse().map(n=>this.store.get(n)))).filter(Boolean);
  const previous=this.monthlySnapshots.find(m=>m.month===month),point={date:d.asOf,cash:d.cash.balance,debt:d.accounts.filter(a=>a.kind!=='cash').reduce((n,a)=>n+a.balance,0),reserved:d.protectedSavings,ready:d.ready},snapshot={month,first:previous?.first||point,last:point,report:monthlyReport(b,d,month)};
  await this.store.put(name,snapshot);this.monthlySnapshots=[snapshot,...this.monthlySnapshots.filter(m=>m.month!==month)].sort((x,y)=>y.month.localeCompare(x.month));
  if(!this.milestones)this.milestones=await this.store.get('milestones',[]);const wins=[...this.milestones],count=wins.length,add=(id,title)=>{if(!wins.some(w=>w.id===id))wins.push({id,title,date:d.asOf});};if(d.ready&&d.cash.minimumCash>=d.cash.bufferTarget)add('buffer','Protected buffer covered through the forecast');for(const a of d.accounts.filter(a=>a.kind!=='cash'&&a.openingBalance>0&&a.balance<=0))add('debt:'+a.id,a.name+' paid off');for(const g of [...b.wishes,...b.goals,...b.sinking])for(const percent of [25,50,75,100])if(g.cost>0&&g.saved/g.cost*100>=percent)add('target:'+g.id+':'+percent,g.name+' reached '+percent+'%');if(wins.length!==count)await this.store.put('milestones',wins);this.milestones=wins;}
 // The summary, analysis and 180-day forecast depend only on the saved budget and today's date,
 // so they are computed once per revision per day instead of on every request.
 computed(){const book=this.envelope.book,day=today();if(this.cache?.book!==book||this.cache.day!==day){const base=summary(book,day);this.cache={book,day,base,analysis:analyzeBudget(book,base),needForecast:summary(book,day,180).plan.forecast};}return this.cache;}
 revision(){return {revision:this.envelope.book.revision,asOf:today()};}
 read(){const {base,analysis,needForecast}=this.computed();return {book:this.envelope.book,summary:{...base,analysis,snapshotError:this.snapshotError||null,mailStatus:this.mailStatus||null,monthlySnapshots:this.monthlySnapshots||[],milestones:this.milestones||[],needForecast},undoId:this.envelope.history[0]?.id||null};}
 serial(fn){const next=this.tail.then(fn);this.tail=next.catch(()=>{});return next;}
 async write({revision,operationId,action,data={}}){return this.serial(async()=>{
  const {book,history}=this.envelope;
  if(typeof operationId!=='string'||operationId.length>100||!operationId)throw Error('Missing operation identity.');
  if(book.receipts.includes(operationId))return {...this.read(),repeated:true};
  if(revision!==book.revision)throw Error('Your budget changed in another tab. Reload before saving.');
  const next=action==='resolvePlaidAccount'?resolvePlaidAccountConflict(book,data):change(book,action,data);next.revision=randomUUID();next.updatedAt=new Date().toISOString();next.receipts=[...book.receipts,operationId].slice(-1000);
  const envelope={book:next,history:withHistory({id:randomUUID(),action,date:next.updatedAt,before:book},history)};
  await this.commit(envelope);await this.safeCaptureReview();return this.read();
 });}
 async syncPlaidAccounts(items){return this.serial(async()=>{const before=this.envelope.book,result=applyPlaidAccounts(before,items);autoConfirmPaychecks(result.book,today());autoConfirmBills(result.book,today());if(JSON.stringify(result.book)!==JSON.stringify(before)){result.book.revision=randomUUID();result.book.updatedAt=new Date().toISOString();const envelope={book:result.book,history:withHistory({id:randomUUID(),action:'Plaid account balances',date:result.book.updatedAt,before},this.envelope.history)};await this.commit(envelope);await this.safeCaptureReview();}return {added:result.added,updated:result.updated,imported:result.imported,notes:result.notes};});}
 history(){return this.envelope.history.map(({id,action,date})=>({id,action,date}));}
 async backup(){return this.serial(async()=>{const name='backup-'+Date.now()+'-'+randomUUID().slice(0,8);const createdAt=new Date().toISOString();await this.store.put(name,{book:this.envelope.book,createdAt});return {id:name,createdAt};});}
 async backups(){return (await this.store.list('backup-')).sort().reverse();}
 async preview({kind,id}){
  let target,label;
  if(kind==='undo'){const h=this.envelope.history[0];if(!h||h.id!==id)throw Error('Only the latest change can be undone. Reload history.');if(h.date.slice(0,10)<=new Date(Date.now()-30*86400000).toISOString().slice(0,10))throw Error('This undo has expired.');target=normalizeRecovery(h.before,today());label='Undo '+h.action;}
  else if(kind==='backup'){const saved=await this.store.get(id);if(!id.startsWith('backup-')||!saved?.book)throw Error('Backup not found.');target=normalizeRecovery(saved.book,today());label='Restore '+id;}
  else throw Error('Invalid recovery option.');
  const token=randomUUID();this.previews.set(token,{target,revision:this.envelope.book.revision,label,expires:Date.now()+300000});
  return {token,label,accounts:target.accounts.length,transactions:target.transactions.length,payments:target.payments.length,savedAt:target.updatedAt||'Initial migration'};
 }
 async restore({token}){return this.serial(async()=>{
  const p=this.previews.get(token);if(!p||p.expires<Date.now())throw Error('Preview expired. Preview the recovery again.');if(p.revision!==this.envelope.book.revision)throw Error('Budget changed since preview. Preview again before restoring.');
  await this.store.put('backup-before-restore-'+Date.now(),{book:this.envelope.book,createdAt:new Date().toISOString()});
  const next=normalizeRecovery(p.target,today());next.revision=randomUUID();next.updatedAt=new Date().toISOString();next.receipts=[...new Set([...this.envelope.book.receipts,...next.receipts])].slice(-1000);
  const envelope={book:next,history:withHistory({id:randomUUID(),action:p.label,date:next.updatedAt,before:this.envelope.book},this.envelope.history)};
  await this.commit(envelope);this.previews.delete(token);await this.safeCaptureReview();return this.read();
 });}
}
