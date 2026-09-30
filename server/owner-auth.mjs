import {scryptSync,randomBytes,timingSafeEqual,createHash} from 'node:crypto';import {readFile} from 'node:fs/promises';import {join} from 'node:path';import {configDir} from './config.mjs';
export const ownerPath=join(configDir,'owner.json');
export const hashPassword=(password,salt)=>scryptSync(password,salt,64).toString('hex');
// Collect raw bytes and decode once, so multi-byte characters split across chunks stay intact.
export async function jsonBody(req,limit=20000){const chunks=[];let size=0;for await(const c of req){const chunk=typeof c==='string'?Buffer.from(c):c;size+=chunk.length;if(size>limit)throw Error('Request too large.');chunks.push(chunk);}const data=Buffer.concat(chunks,size).toString('utf8');return JSON.parse(data||'{}');}
// sessionStore (optional) keeps sign-ins across server restarts. Only a hash of each session token is stored.
export function createOwnerGate({load=()=>readFile(ownerPath,'utf8').then(JSON.parse),now=Date.now,originAllowed=req=>!req.headers.origin||req.headers.origin==='http://localhost:4173',sessionStore=null,secure=()=>false}={}){
 const sessions=new Map();let attempts=[],restored=!sessionStore,ownerHash='';
 const tokenHash=token=>token?createHash('sha256').update(token).digest('hex'):'';
 const restore=async()=>{if(restored)return;restored=true;try{const saved=await sessionStore.get('sessions',{});if(saved?.ownerHash&&saved.ownerHash===(await load()).hash){ownerHash=saved.ownerHash;for(const [k,v] of Object.entries(saved.sessions||{}))if(typeof v==='number')sessions.set(k,v);}}catch{}};
 const persist=async()=>{if(sessionStore)try{await sessionStore.put('sessions',{ownerHash,sessions:Object.fromEntries(sessions)});}catch{}};
 return async(req,res,url)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  const key=tokenHash((req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('budget_owner='))?.slice(13));
  await restore();let expired=false;const currentHash=await load().then(owner=>owner.hash).catch(()=>'');if(currentHash!==ownerHash){sessions.clear();ownerHash=currentHash;expired=true;}for(const [k,v]of sessions)if(v<now()){sessions.delete(k);expired=true;}if(expired)await persist();
  if(url.pathname.startsWith('/api/owner/')){
   if(req.headers['x-budget-hq']!=='1'||!originAllowed(req)||req.headers['sec-fetch-site']==='cross-site'){send(403,{error:'Open Budget HQ directly.'});return false;}
   if(url.pathname==='/api/owner/status'&&req.method==='GET'){let configured=true;try{await load();}catch{configured=false;}send(200,{configured,signedIn:sessions.has(key)});return false;}
   if(url.pathname==='/api/owner/login'&&req.method==='POST'){
    attempts=attempts.filter(t=>t>now()-15*60000);if(attempts.length>=5){send(429,{error:'Too many attempts. Try again in 15 minutes.'});return false;}attempts.push(now());
    try{const {password}=await jsonBody(req,2000),config=await load();if(typeof password!=='string'||password.length>256)throw Error();const entered=Buffer.from(hashPassword(password,config.salt),'hex'),saved=Buffer.from(config.hash,'hex');if(saved.length!==entered.length||!timingSafeEqual(saved,entered))throw Error();const token=randomBytes(32).toString('base64url');sessions.delete(key);sessions.set(tokenHash(token),now()+8*3600000);await persist();attempts=[];res.setHeader('Set-Cookie',`budget_owner=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`+(secure(req)?'; Secure':''));send(200,{ok:true});}catch{send(401,{error:'Sign-in failed. Check your password or run npm run setup-owner first.'});}return false;
   }
   if(url.pathname==='/api/owner/logout'&&req.method==='POST'){sessions.delete(key);await persist();res.setHeader('Set-Cookie','budget_owner=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'+(secure(req)?'; Secure':''));send(200,{ok:true});return false;}
   send(405,{error:'Unsupported action.'});return false;
  }
  if(sessions.has(key))return true;
  if(['/login','/login.js','/styles.css','/mobile.css','/palette.css','/public/app-icon.svg','/manifest.webmanifest','/public/app-icon-180.png','/public/app-icon-192.png','/public/app-icon-512.png','/service-worker.js','/pwa-register.js','/offline.html'].includes(url.pathname))return true;
  if(url.pathname.startsWith('/api/'))send(401,{error:'Sign in to Budget HQ first.'});else{res.writeHead(303,{Location:'/login','Cache-Control':'no-store'});res.end();}return false;
 };
}
