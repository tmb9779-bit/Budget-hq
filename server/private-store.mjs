import {mkdir,readFile,writeFile,rename,readdir,unlink} from 'node:fs/promises';
import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {join} from 'node:path';import {configDir} from './config.mjs';
export class PrivateStore{
 constructor(dir=join(configDir,'independent')){this.dir=dir;this.ready=this.init();}
 async init(){await mkdir(this.dir,{recursive:true,mode:0o700});const path=join(this.dir,'vault.key');try{this.key=await readFile(path);}catch(e){if(e.code!=='ENOENT')throw e;try{await writeFile(path,randomBytes(32),{flag:'wx',mode:0o600});}catch(x){if(x.code!=='EEXIST')throw x;}this.key=await readFile(path);}if(this.key.length!==32)throw Error('The private data key is invalid.');}
 path(name){if(!/^[a-z0-9_-]{1,100}$/.test(name))throw Error('Invalid private record.');return join(this.dir,name+'.enc');}
 async get(name,fallback=null){await this.ready;try{const b=await readFile(this.path(name)),d=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString());}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
 async put(name,value){await this.ready;const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',this.key,iv),data=Buffer.concat([c.update(JSON.stringify(value)),c.final()]);const path=this.path(name),tmp=path+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(tmp,Buffer.concat([iv,c.getAuthTag(),data]),{mode:0o600});await rename(tmp,path);}
 async list(prefix){await this.ready;return (await readdir(this.dir)).filter(n=>n.startsWith(prefix)&&n.endsWith('.enc')).map(n=>n.slice(0,-4));}
 async remove(name){await this.ready;await unlink(this.path(name)).catch(e=>{if(e.code!=='ENOENT')throw e;});}
}
