import {createCipheriv,createDecipheriv} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

function validName(value,label){
 const s=String(value||'');
 if(!/^[a-z0-9_-]{1,100}$/.test(s))throw new Error(`Invalid ${label}.`);
 return s;
}
function encryptionKey(raw=process.env.BUDGET_HQ_HOSTED_KEY){
 const value=String(raw||'').trim();
 if(!value)throw new Error('Hosted storage requires BUDGET_HQ_HOSTED_KEY.');
 let key;
 if(/^[0-9a-f]{64}$/i.test(value))key=Buffer.from(value,'hex');
 else { try{key=Buffer.from(value,'base64');}catch{} }
 if(!key||key.length!==32)throw new Error('BUDGET_HQ_HOSTED_KEY must be a 32-byte key encoded as 64 hex characters or base64.');
 return key;
}
function databaseURL(raw=process.env.DATABASE_URL){
 const value=String(raw||'').trim();
 if(!/^postgres(?:ql)?:\/\//i.test(value))throw new Error('Hosted storage requires a PostgreSQL DATABASE_URL.');
 return value;
}
function sslConfig(url){
 if(process.env.BUDGET_HQ_PG_SSL==='0')return false;
 try{const host=new URL(url).hostname;return ['localhost','127.0.0.1','::1'].includes(host)?false:{rejectUnauthorized:false};}catch{return {rejectUnauthorized:false};}
}
export class HostedStore{
 constructor(namespace,{url=undefined,key=undefined,pool=null}={}){
  this.namespace=validName(namespace,'hosted store namespace');this.key=key||encryptionKey();if(!pool)url=databaseURL(url);
  if(!pool){let Pool;try{({Pool}=require('pg'));}catch{throw new Error('Hosted storage requires the pg package. Run npm install before enabling hosted mode.');}this.pool=new Pool({connectionString:url,ssl:sslConfig(url),max:5});}else this.pool=pool;
  this.ownsPool=!pool;this.ready=this.init();
 }
 async init(){
  await this.pool.query(`CREATE TABLE IF NOT EXISTS budget_hq_records (
   namespace varchar(100) NOT NULL,
   name varchar(100) NOT NULL,
   payload bytea NOT NULL,
   updated_at timestamptz NOT NULL DEFAULT now(),
   PRIMARY KEY(namespace,name)
  )`);
 }
 encode(value){const iv=cryptoRandom(12),cipher=createCipheriv('aes-256-gcm',this.key,iv),body=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]);}
 decode(payload){const b=Buffer.from(payload),d=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString());}
 async get(name,fallback=null){await this.ready;name=validName(name,'hosted record');const {rows}=await this.pool.query('SELECT payload FROM budget_hq_records WHERE namespace=$1 AND name=$2',[this.namespace,name]);return rows.length?this.decode(rows[0].payload):fallback;}
 async put(name,value){await this.ready;name=validName(name,'hosted record');const payload=this.encode(value);await this.pool.query('INSERT INTO budget_hq_records(namespace,name,payload,updated_at) VALUES($1,$2,$3,now()) ON CONFLICT(namespace,name) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()',[this.namespace,name,payload]);}
 async list(prefix=''){await this.ready;prefix=String(prefix);if(!/^[a-z0-9_-]{0,100}$/.test(prefix))throw new Error('Invalid hosted record prefix.');const {rows}=await this.pool.query("SELECT name FROM budget_hq_records WHERE namespace=$1 AND name LIKE $2 ESCAPE '\\\\' ORDER BY name",[this.namespace,escapeLike(prefix)+'%']);return rows.map(r=>r.name);}
 async remove(name){await this.ready;name=validName(name,'hosted record');await this.pool.query('DELETE FROM budget_hq_records WHERE namespace=$1 AND name=$2',[this.namespace,name]);}
 async close(){if(this.ownsPool)await this.pool.end();}
}
function cryptoRandom(n){return (awaitImportRandomBytes)(n);}
import {randomBytes as awaitImportRandomBytes} from 'node:crypto';
function escapeLike(value){return value.replace(/[\\%_]/g,'\\$&');}
export {databaseURL,encryptionKey};
