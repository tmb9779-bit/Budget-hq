// Phone access from anywhere through Tailscale (private network between your own devices).
// Budget HQ still listens only on this PC. "tailscale serve" (set up by setup-phone.mjs) forwards
// https://<this-pc>.<tailnet>.ts.net to http://127.0.0.1:<port> and adds the signed-in Tailscale user.
// A request for that address is accepted only when it:
//  - arrives through the local proxy (loopback connection),
//  - is not from Tailscale Funnel (the public internet),
//  - comes from the Tailscale account recorded at setup.
// The Budget HQ password is still required on top of this.
import {readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';

export const remoteFile=configDir=>join(configDir,'remote-access.json');
const loopback=ip=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(String(ip||''));

// Reads remote-access.json, re-checking at most every few seconds so turning access off takes effect quickly.
export function remoteConfigLoader(configDir,{now=Date.now,every=3000}={}){
 let cached=null,checked=0,stamp='';
 return ()=>{
  if(now()-checked<every)return cached;checked=now();
  try{const s=statSync(remoteFile(configDir)),next=s.mtimeMs+':'+s.size;if(next!==stamp){stamp=next;const c=JSON.parse(readFileSync(remoteFile(configDir),'utf8'));cached=c&&c.enabled!==false&&typeof c.host==='string'&&c.host?{host:c.host.toLowerCase().replace(/\.$/,''),login:typeof c.login==='string'?c.login.toLowerCase():''}:null;}}
  catch{cached=null;stamp='';}
  return cached;
 };
}

export function remotePolicy(getConfig){
 const hostOf=req=>String(req.headers.host||'').toLowerCase().replace(/:443$/,'');
 const isRemote=req=>{const c=getConfig();return !!c&&hostOf(req)===c.host;};
 return {
  isRemote,
  // Returns why a remote request is refused, or '' when it may continue to the password check.
  refusal(req){
   const c=getConfig();if(!c||hostOf(req)!==c.host)return 'Phone access is turned off.';
   if(!loopback(req.socket?.remoteAddress))return 'Open Budget HQ through Tailscale.';
   if(req.headers['tailscale-funnel-request'])return 'Budget HQ is not available on the public internet.';
   const login=String(req.headers['tailscale-user-login']||'').toLowerCase();
   if(!login)return 'Sign in to Tailscale on this device with your own account.';
   if(c.login&&login!==c.login)return 'This Tailscale account is not allowed to open Budget HQ.';
   return '';
  },
  originAllowed:req=>isRemote(req)&&(!req.headers.origin||req.headers.origin==='https://'+hostOf(req)),
  secure:req=>isRemote(req)
 };
}
