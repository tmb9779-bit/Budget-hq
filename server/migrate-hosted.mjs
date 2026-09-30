import {join} from 'node:path';
import {PrivateStore} from './private-store.mjs';
import {HostedStore} from './hosted-store.mjs';
import {configDir,storeNames} from './config.mjs';

const copy=process.argv.includes('--copy');
const namespaces=[storeNames.budget,storeNames.plaid,'owner-sessions','private-mail'];
console.log(`Budget HQ hosted migration ${copy?'COPY + VERIFY':'DRY RUN'}`);
console.log('Local data will not be deleted or modified.');
let records=0;
for(const namespace of namespaces){
 const local=new PrivateStore(join(configDir,namespace));
 const remote=new HostedStore(namespace);
 try{
  const names=await local.list('');
  console.log(`${namespace}: ${names.length} local record(s)`);
  for(const name of names){
   const source=await local.get(name);
   if(copy)await remote.put(name,source);
   if(copy){const target=await remote.get(name,Symbol.for('missing'));if(JSON.stringify(target)!==JSON.stringify(source))throw new Error(`Verification failed for ${namespace}/${name}`);}
   records++;
  }
 }finally{await remote.close();}
}
if(!copy){console.log(`Dry run complete: ${records} record(s) are eligible. Re-run with --copy to copy and verify them.`);}
else console.log(`Migration verified: ${records} record(s) copied. Original local data remains unchanged.`);
