import {createServer} from 'node:net';
import {join} from 'node:path';
import {configDir,storeNames} from './config.mjs';
import {PrivateStore} from './private-store.mjs';
import {fullSampleBudget as sampleBudget} from './sample.mjs';
// Refuse to reset while either version is running on the budget port.
const guard=createServer();
try{
 await new Promise((resolve,reject)=>{guard.once('error',reject);guard.listen(4173,'127.0.0.1',resolve);});
 const store=new PrivateStore(join(configDir,storeNames.sampleBudget));
 const previous=await store.get('budget');
 if(previous)await store.put('backup-before-sample-reset-'+Date.now(),{book:previous.book,createdAt:new Date().toISOString()});
 await store.put('budget',{book:sampleBudget(),history:[]});
 console.log('Full sample budget loaded, including Needs Attention. The previous sample was backed up. Real records were not changed.');
}catch(e){console.error(e.code==='EADDRINUSE'?'Stop the running Budget HQ server with Ctrl+C, then try again.':e.message);process.exitCode=1;}
finally{if(guard.listening)await new Promise(resolve=>guard.close(resolve));}
