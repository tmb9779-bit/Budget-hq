// Sets up phone access from anywhere with Tailscale.
//   node server/setup-phone.mjs          turn phone access on (or refresh it)
//   node server/setup-phone.mjs --off    turn it off
//   node server/setup-phone.mjs --status show the current state
// Budget HQ keeps listening only on this PC; Tailscale's private proxy forwards your own devices to it.
import {execFile} from 'node:child_process';import {existsSync} from 'node:fs';import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {configDir,port} from './config.mjs';import {ownerPath} from './owner-auth.mjs';import {remoteFile} from './remote-access.mjs';

const args=process.argv.slice(2),say=(...lines)=>console.log(lines.join('\n'));
const candidates=[process.env.BUDGET_HQ_TAILSCALE,'tailscale','C:\\Program Files\\Tailscale\\tailscale.exe','/Applications/Tailscale.app/Contents/MacOS/Tailscale'].filter(Boolean);
const run=(cli,cliArgs)=>new Promise(resolve=>execFile(cli,cliArgs,{timeout:30000,windowsHide:true},(error,stdout,stderr)=>resolve({ok:!error,missing:error?.code==='ENOENT',out:String(stdout||'')+String(stderr||'')})));

async function findTailscale(){for(const cli of candidates){const r=await run(cli,['version']);if(!r.missing)return cli;}return null;}
async function saved(){try{return JSON.parse(await readFile(remoteFile(configDir),'utf8'));}catch{return null;}}
async function save(data){await mkdir(configDir,{recursive:true});await writeFile(remoteFile(configDir),JSON.stringify(data,null,1),{mode:0o600});}

async function main(){
 const cli=await findTailscale();
 if(args.includes('--status')){const c=await saved();say(c?.enabled?'Phone access is ON: https://'+c.host+'  (Tailscale account '+(c.login||'any')+')':'Phone access is OFF.');return 0;}
 if(args.includes('--off')){
  // Refuse remote requests first, then remove the Tailscale forwarding.
  const c=await saved();await save({...(c||{}),enabled:false,changedAt:new Date().toISOString()});
  if(cli){const r=await run(cli,['serve','--https=443','off']);if(!r.ok)await run(cli,['serve','reset']);}
  say('Phone access is OFF. Budget HQ now answers only on this PC.');return 0;
 }
 if(!existsSync(ownerPath)){say('Create your Budget HQ password first: run  npm run setup-owner  in the Budget HQ folder.');return 1;}
 if(!cli){say('Tailscale is not installed on this PC.','1. Install Tailscale from https://tailscale.com/download on this PC and on your phone.','2. Sign in to both with the same account.','3. Run this setup again.');return 1;}
 const status=await run(cli,['status','--json']);let info;try{info=JSON.parse(status.out.slice(status.out.indexOf('{')));}catch{info=null;}
 if(!info||info.BackendState!=='Running'){say('Tailscale is installed but not signed in on this PC. Open Tailscale, sign in, and run this setup again.');return 1;}
 const host=String(info.Self?.DNSName||'').replace(/\.$/,'').toLowerCase(),login=String(info.User?.[String(info.Self?.UserID)]?.LoginName||'').toLowerCase();
 if(!host.endsWith('.ts.net')){say('Turn on MagicDNS and HTTPS Certificates for your Tailscale network, then run this setup again:','https://login.tailscale.com/admin/dns');return 1;}
 const serve=await run(cli,['serve','--bg','http://127.0.0.1:'+port]);
 if(!serve.ok){say('Tailscale could not forward Budget HQ:',serve.out.trim(),'','If it mentions HTTPS, turn on HTTPS Certificates here and run this setup again:','https://login.tailscale.com/admin/dns');return 1;}
 await save({enabled:true,host,login,changedAt:new Date().toISOString()});
 say('','Phone access is ON.','',
  'On your phone:',
  '  1. Install the Tailscale app and sign in as '+(login||'the same account as this PC')+'.',
  '  2. Open  https://'+host,
  '  3. Sign in with your Budget HQ password.',
  '  4. Optional: Share → Add to Home Screen, to open it like an app.','',
  'Only devices signed in to your Tailscale account can reach it, and only while this PC is on',
  'and Budget HQ is running. It is not on the public internet. Turn it off any time with',
  'TURN_OFF_PHONE_ACCESS.cmd.');
 return 0;
}
process.exitCode=await main();
