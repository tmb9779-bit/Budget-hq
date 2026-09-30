import {join} from 'node:path';
import {PrivateStore} from './private-store.mjs';
import {HostedStore} from './hosted-store.mjs';
import {configDir} from './config.mjs';

export function createStore(name,{dir=configDir,mode=process.env.BUDGET_HQ_STORE||'local',hosted={}}={}){
 mode=String(mode).trim().toLowerCase();
 if(mode==='local')return new PrivateStore(join(dir,name));
 if(mode==='hosted')return new HostedStore(name,hosted);
 throw new Error(`Unknown BUDGET_HQ_STORE mode: ${mode}`);
}
