import {access} from 'node:fs/promises';
import {join} from 'node:path';
import {PrivateStore} from './server/private-store.mjs';
import {configDir,storeNames} from './server/config.mjs';

const store=new PrivateStore(join(configDir,storeNames.budget));
await store.ready;
try{await access(store.path('budget'));}
catch{console.error('No saved Budget HQ budget was found. Place this script in your Budget HQ app folder and run it on the computer where your budget is saved.');process.exit(1);}

const envelope=await store.get('budget');
if(!envelope?.book){console.error('The saved Budget HQ record could not be read. Nothing was changed.');process.exit(1);}

const originalBook=structuredClone(envelope.book),book=envelope.book;
const dismissedArrays=[
 'dismissedAttention',
 'dismissedBankMatches',
 'dismissedDuplicates',
 'dismissedGoalSuggestions',
 'dismissedIncomeSuggestions',
 'dismissedNeedMatches',
 'dismissedRecurring',
 'permanentRecurringDismissals',
];
const counts={};
for(const key of dismissedArrays){counts[key]=Array.isArray(book[key])?book[key].length:0;book[key]=[];}
const insightStates=book.insightStates||{};
counts.dismissedInsights=Object.values(insightStates).filter(x=>x?.status==='dismissed').length;
book.insightStates=Object.fromEntries(Object.entries(insightStates).filter(([,x])=>x?.status!=='dismissed'));

const backupName='backup-before-dismissal-reset-'+Date.now();
await store.put(backupName,{book:originalBook,createdAt:new Date().toISOString()});
await store.put('budget',envelope);

const total=Object.values(counts).reduce((n,x)=>n+x,0);
console.log(`Reset ${total} dismissed records. Your original budget was backed up in ${backupName}.`);
if((book.plaidSuppressed||[]).length)console.log(`Kept ${book.plaidSuppressed.length} discarded Plaid transactions suppressed so they are not imported again.`);
console.log('Restart Budget HQ to refresh the app.');
